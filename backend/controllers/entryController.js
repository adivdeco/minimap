const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Plan = require('../models/Plan');
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const SystemConfig = require('../models/SystemConfig');

// ============================================================
// TIMEZONE / DATE HELPERS
// ============================================================

/**
 * Returns the "service date" midnight (00:00:00) in UTC for a given
 * wall-clock moment in the library's local timezone.
 *
 * E.g. 2026-10-29 23:30 IST → 2026-10-29 00:00:00 UTC stored value
 *      (which represents "29 Oct service day" in IST)
 *
 * @param {Date}   now        – the current UTC instant
 * @param {string} tz         – IANA timezone, e.g. "Asia/Kolkata"
 * @returns {Date}            – midnight UTC of the local service date
 */
function getServiceDateMidnight(now, tz) {
    // Format "YYYY-MM-DD" in the library's timezone
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: tz }); // "2026-10-29"
    const [y, m, d] = localDateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Parses an "HH:mm" shift time and returns a UTC Date for that wall-clock
 * time on the library-local service date.
 *
 * @param {string} hhmm    – "16:00"
 * @param {string} dateStr – "YYYY-MM-DD" in the library's local timezone
 * @param {string} tz      – IANA timezone
 */
function shiftTimeToUTC(hhmm, dateStr, tz) {
    const [hh, mm] = hhmm.split(':').map(Number);
    // Build a local-time string and convert through the Intl formatter
    const localISO = `${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
    // Use Temporal-free approach: create date as if UTC, then correct for TZ offset
    const naiveDate = new Date(localISO + 'Z'); // treat as UTC first
    // Get offset for that timezone at that moment (in minutes, positive = ahead of UTC)
    const offsetMs = getTimezoneOffsetMs(tz, naiveDate);
    return new Date(naiveDate.getTime() - offsetMs);
}

/**
 * Returns the UTC offset in milliseconds for a given timezone at a given instant.
 * Positive = ahead of UTC (e.g. Asia/Kolkata = +5:30 = +330 minutes = +19800000 ms)
 */
function getTimezoneOffsetMs(tz, date) {
    // Compare a UTC-formatted date with a tz-formatted date
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
    const localStr = date.toLocaleString('en-US', { timeZone: tz, hour12: false });
    const utcDate = new Date(utcStr.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'));
    const localDate = new Date(localStr.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'));
    return localDate.getTime() - utcDate.getTime();
}

// ============================================================
// SMALL HELPERS
// ============================================================

async function getMaxDailyCheckins() {
    try {
        const config = await SystemConfig.findOne({ key: 'maxDailyCheckins' });
        return config ? Number(config.value) : 3;
    } catch {
        return 3;
    }
}

/**
 * Returns today's attendance stats for a user/library using the library's timezone.
 *
 * @param {ObjectId} userId
 * @param {ObjectId} libraryId
 * @param {string}   tz          – IANA timezone for the library
 * @param {Object}   session     – Mongoose session (optional)
 */
async function getDailyStats(userId, libraryId, tz, session) {
    const serviceDate = getServiceDateMidnight(new Date(), tz || 'Asia/Kolkata');

    const record = await Attendance.findOne({
        userId,
        libraryId,
        date: serviceDate
    }).session(session || null);

    if (!record) return { minutesUsed: 0, sessionsCount: 0 };

    return {
        minutesUsed: record.totalDurationToday || 0,
        sessionsCount: record.sessionCount || 0
    };
}

/**
 * Resolves plan details: tries Plan collection first, falls back to Library.plans.
 */
async function resolvePlan(planId, library) {
    let plan = await Plan.findById(planId);
    if (!plan && library.plans && library.plans.length > 0) {
        plan = library.plans.id(planId);
    }
    return plan;
}

function handleAppError(err, res, fallbackMsg = 'Server Error') {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, msg: err.message });
    }
    console.error(err);
    res.status(500).json({ success: false, msg: fallbackMsg });
}

// ============================================================
// SHIFT BOUNDARY CALCULATION
// ============================================================

/**
 * Resolves the allowed-entry window and scheduled end time for a FIXED_SHIFT sub.
 *
 * Overnight shifts (endTime < startTime, e.g. 22:00-06:00) are detected by
 * comparing the HH:mm strings and wrapping the end into the next calendar day.
 *
 * @param {Object} shift    – subscription.shift embedded doc
 * @param {Date}   now      – current UTC instant
 * @param {string} tz       – library timezone
 * @returns {{ earliestEntry, scheduledStart, scheduledEnd, isWithinWindow, isBeforeWindow }}
 */
function resolveShiftBoundaries(shift, now, tz) {
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: tz });

    const scheduledStart = shiftTimeToUTC(shift.startTime, localDateStr, tz);
    let scheduledEnd   = shiftTimeToUTC(shift.endTime,   localDateStr, tz);

    // Handle overnight: if end ≤ start (same calendar day), shift ends next day
    if (scheduledEnd <= scheduledStart) {
        scheduledEnd = new Date(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // How early the student may arrive (early-entry grace)
    const earlyMs = (shift.earlyEntryGraceMinutes || 0) * 60 * 1000;
    const earliestEntry = new Date(scheduledStart.getTime() - earlyMs);

    const isBeforeWindow = now < earliestEntry;
    const isWithinWindow = now >= earliestEntry && now <= scheduledEnd;

    return { earliestEntry, scheduledStart, scheduledEnd, isWithinWindow, isBeforeWindow };
}

// ============================================================
// CORE: ASSIGN SEAT  (unified – fixed-shift + daily-quota)
// ============================================================
/**
 * @param {Object}  library          - Library document
 * @param {ObjectId} userId          - User being seated
 * @param {Object}  subscription     - Active subscription doc
 * @param {Object}  dailyStats       - { minutesUsed, sessionsCount }
 * @param {Object}  session          - Mongoose transaction session
 * @param {Object}  [reservedSeatDoc=null] - If provided, claim this specific seat
 */
async function assignSeat(library, userId, subscription, dailyStats, session, reservedSeatDoc = null) {
    const tz = library.timezone || 'Asia/Kolkata';
    const now = new Date(); // single authoritative timestamp

    const serviceDate = getServiceDateMidnight(now, tz);

    // ── 1. Determine access policy ──────────────────────────────────────────
    const accessMode = subscription.accessMode || 'DAILY_QUOTA';

    let expectedEndTime;
    let scheduledStart = null;
    let scheduledEnd   = null;
    let shiftCode      = null;
    let shiftName      = null;

    if (accessMode === 'FIXED_SHIFT') {
        // ── Fixed-shift path ──────────────────────────────────────────────
        if (!subscription.shift) {
            throw new AppError(
                'This subscription has no shift configuration. Please contact the library owner.',
                400, 'NO_SHIFT_CONFIG'
            );
        }

        const { shift } = subscription;
        const { earliestEntry, scheduledStart: ss, scheduledEnd: se, isWithinWindow, isBeforeWindow } =
            resolveShiftBoundaries(shift, now, tz);

        if (isBeforeWindow) {
            const minutesUntil = Math.ceil((earliestEntry.getTime() - now.getTime()) / 60000);
            throw new AppError(
                `Your shift (${shift.name}) does not start until ${shift.startTime}. ` +
                `Early entry is permitted from ${shift.earlyEntryGraceMinutes} minutes before. ` +
                `Please wait ${minutesUntil} more minute(s).`,
                403, 'BEFORE_SHIFT'
            );
        }

        if (!isWithinWindow) {
            // Now is after scheduledEnd
            if (!shift.allowLateEntry) {
                throw new AppError(
                    `Your shift (${shift.name}) ended at ${shift.endTime}. Late entry is not permitted.`,
                    403, 'SHIFT_ENDED'
                );
            }
            // Late entry is allowed – student still gets the scheduled end time
        }

        scheduledStart  = ss;
        scheduledEnd    = se;
        expectedEndTime = se;
        shiftCode       = shift.code;
        shiftName       = shift.name;

    } else {
        // ── Daily-quota path ──────────────────────────────────────────────
        let dailyQuotaMinutes = subscription.dailyQuotaMinutes;

        if (!dailyQuotaMinutes) {
            // Legacy compat: fall back to Plan.hoursPerDay
            const planDoc = await resolvePlan(subscription.planId, library);
            const hoursPerDay = (planDoc && planDoc.hoursPerDay) ? planDoc.hoursPerDay : 5;
            dailyQuotaMinutes = hoursPerDay * 60;
        }

        const usedMinutes      = dailyStats.minutesUsed;
        const remainingMinutes = dailyQuotaMinutes - usedMinutes;

        if (remainingMinutes <= 0) {
            throw new AppError(
                `Daily Quota Exceeded! You have used ${Math.floor(usedMinutes / 60)}h ` +
                `${usedMinutes % 60}m of your ${Math.floor(dailyQuotaMinutes / 60)}h limit.`,
                403, 'LIMIT'
            );
        }

        expectedEndTime = new Date(now.getTime() + remainingMinutes * 60000);
        scheduledEnd    = expectedEndTime;
    }

    // ── 2. Acquire seat ──────────────────────────────────────────────────────
    let seat;
    if (reservedSeatDoc) {
        seat = await Seat.findOneAndUpdate(
            { _id: reservedSeatDoc._id, status: 'Reserved' },
            {
                $set: {
                    status: 'Occupied',
                    currentOccupant: userId,
                    occupiedSince: now,
                    expectedEndTime
                }
            },
            { new: true, session }
        );
        if (!seat) throw new AppError('Could not claim reserved seat. It might no longer be reserved.', 409, 'RACE');
    } else {
        const randomResult = await Seat.aggregate([
            { $match: { libraryId: library._id, status: 'Available' } },
            { $sample: { size: 1 } }
        ]).session(session);

        if (!randomResult || randomResult.length === 0) {
            throw new AppError('Library is full! No seats available.', 400, 'FULL');
        }

        seat = await Seat.findOneAndUpdate(
            { _id: randomResult[0]._id, status: 'Available' },
            {
                $set: {
                    status: 'Occupied',
                    currentOccupant: userId,
                    occupiedSince: now,
                    expectedEndTime
                }
            },
            { new: true, session }
        );
        if (!seat) throw new AppError('Seat was taken just before you confirmed. Please try again.', 409, 'RACE');
    }

    // ── 3. Build the new session record ─────────────────────────────────────
    const newSession = {
        seatNumber:      seat.seatNumber,
        subscriptionId:  subscription._id,
        accessMode,
        shiftCode,
        shiftName,
        scheduledStart,
        scheduledEnd,
        checkInTime:     now,
        checkOutTime:    null,
        durationMinutes: 0,
        sessionStatus:   'open',
        checkoutReason:  null
    };

    // ── 4. Upsert attendance daily bucket ────────────────────────────────────
    const attendanceDoc = await Attendance.findOneAndUpdate(
        { userId, libraryId: library._id, date: serviceDate },
        { $push: { sessions: newSession }, $inc: { sessionCount: 0 } }, // sessionCount only increments on checkout
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
    );

    // ── 5. Update User context ───────────────────────────────────────────────
    // FIX: $addToSet must be a sibling of $set, not nested inside it.
    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                'studentDetails.assignedSeat': {
                    seatId:          seat._id,
                    seatNumber:      seat.seatNumber,
                    checkInTime:     now,
                    expectedEndTime
                },
                'studentDetails.currentSubscription': {
                    subscriptionId: subscription._id,
                    libraryId:      library._id,
                    planId:         subscription.planId,
                    startDate:      subscription.startDate,
                    expiryDate:     subscription.expiryDate,
                    status:         'active'
                }
            },
            $addToSet: { attendanceHistory: attendanceDoc._id }
        },
        { session }
    );

    // ── 6. Invalidate auth cache ─────────────────────────────────────────────
    authMiddleware.invalidateUserCache(userId);

    // ── 7. Build response ────────────────────────────────────────────────────
    const maxDailyCheckins = await getMaxDailyCheckins();
    const isReserved = !!reservedSeatDoc;

    let remainingHours = 0, remainingMins = 0;
    if (accessMode === 'FIXED_SHIFT') {
        const msRemaining = Math.max(0, expectedEndTime.getTime() - now.getTime());
        remainingHours = Math.floor(msRemaining / 3600000);
        remainingMins  = Math.floor((msRemaining % 3600000) / 60000);
    } else {
        const quota = subscription.dailyQuotaMinutes || 300;
        const remaining = Math.max(0, quota - dailyStats.minutesUsed);
        remainingHours = Math.floor(remaining / 60);
        remainingMins  = Math.floor(remaining % 60);
    }

    return {
        seat: seat.seatNumber,
        accessMode,
        shiftCode,
        shiftName,
        scheduledStart,
        scheduledEnd,
        expectedEndTime,
        checkinsRemaining: maxDailyCheckins - (dailyStats.sessionsCount + 1),
        maxDailyCheckins,
        remainingTime: { hours: remainingHours, minutes: remainingMins },
        msg: isReserved
            ? `Checked In to your Reserved Seat: ${seat.seatNumber}`
            : `Checked In! Assigned Seat: ${seat.seatNumber}`
    };
}

// ============================================================
// 2. CONTROLLER: CHECK-IN
// ============================================================
exports.checkIn = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { qrCodeString } = req.body;
        const userId = req.user._id;

        // 1. Identify Library
        const library = await Library.findOne({ 'accessConfig.qrCodeData': qrCodeString }).session(session);
        if (!library) throw new AppError('Invalid QR Code', 404, 'NOT_FOUND');

        if (!library.isActive) {
            throw new AppError('Library is currently offline. Entry is disabled.', 403, 'LIBRARY_OFFLINE');
        }

        const tz = library.timezone || 'Asia/Kolkata';

        // 2. Prevent Double Entry
        const existingSeat = await Seat.findOne({ currentOccupant: userId }).session(session);
        if (existingSeat) throw new AppError(`You are already seated at ${existingSeat.seatNumber}.`, 400, 'BAD_REQUEST');

        // 3. Daily Entry Limits
        const dailyStats = await getDailyStats(userId, library._id, tz, session);
        const maxDailyCheckins = await getMaxDailyCheckins();
        if (dailyStats.sessionsCount >= maxDailyCheckins) {
            throw new AppError(`Daily entry limit reached (${maxDailyCheckins} times/day).`, 403, 'LIMIT');
        }

        // 4. Check Active Subscription
        let activeSub = await Subscription.findOne({
            userId,
            libraryId: library._id,
            status: 'active',
            expiryDate: { $gt: new Date() }
        }).session(session);

        // Grace period fallback
        if (!activeSub) {
            const graceSub = await Subscription.findOne({
                userId,
                libraryId: library._id,
                gracePeriodAllowed: true
            }).sort({ createdAt: -1 }).session(session);

            if (graceSub) {
                const now = new Date();
                const graceStart = graceSub.graceStartDate || now;
                const graceEnd = new Date(graceStart.getTime() + graceSub.graceDaysAllowed * 24 * 60 * 60 * 1000);
                if (now <= graceEnd) {
                    activeSub = graceSub;
                }
            }
        }

        // SCENARIO A: Valid subscription
        if (activeSub) {
            const currentTimeStr = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: tz }).substring(0, 5);

            const userReservedSeat = await Seat.findOne({
                libraryId: library._id,
                reservations: {
                    $elemMatch: {
                        userId,
                        startTime: { $lte: currentTimeStr },
                        endTime:   { $gte: currentTimeStr }
                    }
                }
            }).session(session);

            let resultData;
            if (userReservedSeat) {
                resultData = await assignSeat(library, userId, activeSub, dailyStats, session, userReservedSeat);
            } else {
                resultData = await assignSeat(library, userId, activeSub, dailyStats, session);
            }

            await session.commitTransaction();
            return res.json({ success: true, ...resultData });
        }

        // SCENARIO B: No subscription
        await session.abortTransaction();

        const history = await Subscription.exists({ userId, libraryId: library._id });

        if (history) {
            return res.status(200).json({
                success: false,
                action: 'SHOW_PLANS',
                libraryId: library._id,
                plans: library.plans,
                msg: 'Your subscription has expired. Please renew to enter.'
            });
        }

        const trialPlan = library.plans.find(p => p.trialDays > 0);
        if (trialPlan) {
            return res.status(200).json({
                success: false,
                action: 'OFFER_TRIAL',
                libraryId: library._id,
                planId: trialPlan._id,
                trialDays: trialPlan.trialDays,
                msg: `Welcome! You are eligible for a ${trialPlan.trialDays}-Day Free Trial.`
            });
        }

        return res.status(200).json({
            success: false,
            action: 'SHOW_PLANS',
            libraryId: library._id,
            plans: library.plans,
            msg: 'Welcome! Please choose a plan to start.'
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('CheckIn Transaction Failed:', err.message);
        handleAppError(err, res, 'Server Error during Check-in');
    } finally {
        session.endSession();
    }
};

// ============================================================
// 3. CONTROLLER: ACTIVATE TRIAL
// ============================================================
exports.activateTrial = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { libraryId, planId } = req.body;
        const userId = req.user._id;

        const history = await Subscription.exists({ userId, libraryId }).session(session);
        if (history) throw new AppError('Trial already used.', 400, 'BAD_REQUEST');

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        if (!library.isActive) {
            throw new AppError('Library is currently offline. Trial activation is unavailable.', 403, 'LIBRARY_OFFLINE');
        }

        const plan = await resolvePlan(planId, library);
        if (!plan || !plan.trialDays || plan.trialDays <= 0) throw new AppError('Invalid Trial Plan', 400, 'BAD_REQUEST');

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.trialDays);

        const tz = library.timezone || 'Asia/Kolkata';

        // Trial uses DAILY_QUOTA; quota defaults to plan hours or 5h
        const dailyQuotaMinutes = plan.hoursPerDay ? plan.hoursPerDay * 60 : 300;

        const [newSub] = await Subscription.create([{
            userId,
            libraryId,
            planId:             plan._id,
            planName:           `Free Trial - ${plan.name || plan.title}`,
            pricePaid:          0,
            startDate:          new Date(),
            expiryDate,
            status:             'active',
            accessMode:         'DAILY_QUOTA',
            dailyQuotaMinutes,
            shift:              null
        }], { session });

        const dailyStats = await getDailyStats(userId, library._id, tz, session);
        const resultData = await assignSeat(library, userId, newSub, dailyStats, session);

        await session.commitTransaction();
        res.json({ success: true, ...resultData });

    } catch (err) {
        await session.abortTransaction();
        console.error('Activate Trial Error:', err.message);
        handleAppError(err, res, 'Failed to activate trial');
    } finally {
        session.endSession();
    }
};

// ============================================================
// 4. CONTROLLER: CHECK-OUT  (Transactional)
// ============================================================
exports.checkOut = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user._id;

        // 1. Find current seat
        const seat = await Seat.findOne({ currentOccupant: userId }).session(session);
        if (!seat) throw new AppError('You are not currently checked in.', 400, 'BAD_REQUEST');

        // 2. Get library timezone
        const library = await Library.findById(seat.libraryId).select('timezone').session(session);
        const tz = library?.timezone || 'Asia/Kolkata';

        const checkOutTime = new Date();

        // 3. Duration
        let durationMinutes = 0;
        if (seat.occupiedSince) {
            durationMinutes = Math.round((checkOutTime - seat.occupiedSince) / 60000);
        }
        if (durationMinutes < 1) durationMinutes = 1;

        // 4. Release seat
        let newStatus = 'Available';
        if (seat.reservations && seat.reservations.length > 0) newStatus = 'Reserved';

        await Seat.findByIdAndUpdate(seat._id, {
            $set: {
                status:          newStatus,
                currentOccupant: null,
                occupiedSince:   null,
                expectedEndTime: null
            }
        }, { session });

        // 5. Update attendance bucket — target the EXACT open session (by seatNumber + checkOutTime null)
        //    This is more precise than "first open session" for cases with multiple same-day sessions.
        const serviceDate = getServiceDateMidnight(seat.occupiedSince || checkOutTime, tz);

        await Attendance.findOneAndUpdate(
            {
                userId,
                libraryId: seat.libraryId,
                date: serviceDate,
                sessions: {
                    $elemMatch: {
                        seatNumber:   seat.seatNumber,
                        checkOutTime: null,
                        sessionStatus:'open'
                    }
                }
            },
            {
                $set: {
                    'sessions.$.checkOutTime':     checkOutTime,
                    'sessions.$.durationMinutes':  durationMinutes,
                    'sessions.$.sessionStatus':    'checked_out',
                    'sessions.$.checkoutReason':   'manual'
                },
                $inc: {
                    totalDurationToday: durationMinutes,
                    sessionCount:       1
                }
            },
            { session }
        );

        // 6. Clear user context
        await User.findByIdAndUpdate(userId, {
            $set: { 'studentDetails.assignedSeat': null }
        }, { session });

        authMiddleware.invalidateUserCache(userId);

        // 7. Remaining-time summary for response
        const updatedDailyStats = await getDailyStats(userId, seat.libraryId, tz, session);
        const activeSub = await Subscription.findOne({
            userId, libraryId: seat.libraryId, status: 'active'
        }).session(session);

        let remainingMinutes = 0;
        if (activeSub && activeSub.accessMode === 'FIXED_SHIFT' && activeSub.shift) {
            const { scheduledEnd } = resolveShiftBoundaries(activeSub.shift, checkOutTime, tz);
            remainingMinutes = Math.max(0, Math.floor((scheduledEnd - checkOutTime) / 60000));
        } else if (activeSub) {
            const quota = activeSub.dailyQuotaMinutes ||
                ((await resolvePlan(activeSub.planId, { plans: [] }))?.hoursPerDay || 5) * 60;
            remainingMinutes = Math.max(0, quota - updatedDailyStats.minutesUsed);
        }

        await session.commitTransaction();

        const maxDailyCheckins = await getMaxDailyCheckins();
        res.json({
            success: true,
            msg: `Checked out successfully. Session: ${durationMinutes} mins.`,
            checkinsRemaining:  maxDailyCheckins - updatedDailyStats.sessionsCount,
            maxDailyCheckins,
            remainingTime: {
                hours:   Math.floor(remainingMinutes / 60),
                minutes: Math.floor(remainingMinutes % 60)
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('CheckOut Error:', err);
        handleAppError(err, res, 'Server Error during checkout');
    } finally {
        session.endSession();
    }
};

// ============================================================
// 5. OFFLINE SUBSCRIPTION ACTIVATION  (Owner/Admin)
// ============================================================
exports.activateSubscriptionOffline = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            userId, libraryId, planId,
            pricePaid, startDate, endDate,
            // New shift fields
            accessMode        = 'DAILY_QUOTA',
            shift             = null,
            dailyQuotaMinutes = null
        } = req.body;

        const adminId   = req.user._id;
        const adminRole = req.user.role;

        if (!userId || !libraryId || !planId) throw new AppError('Missing required fields', 400, 'BAD_REQUEST');

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        // Authorization — must be admin/co-admin OR owner of this library
        const isAdmin        = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' && library.ownerId.toString() === adminId.toString();

        if (!isAdmin && !isLibraryOwner) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

        const user = await User.findById(userId).session(session);
        if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

        const plan = await resolvePlan(planId, library);
        if (!plan) throw new AppError('Plan not found', 404, 'NOT_FOUND');

        // Validate shift data server-side — never trust client for policy
        if (accessMode === 'FIXED_SHIFT') {
            if (!shift || !shift.code || !shift.name || !shift.startTime || !shift.endTime) {
                throw new AppError(
                    'FIXED_SHIFT subscriptions require shift.code, shift.name, shift.startTime, and shift.endTime.',
                    400, 'MISSING_SHIFT'
                );
            }
            const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRe.test(shift.startTime) || !timeRe.test(shift.endTime)) {
                throw new AppError('shift.startTime and shift.endTime must be HH:mm (24-hour).', 400, 'INVALID_SHIFT_TIME');
            }
            if (typeof shift.earlyEntryGraceMinutes !== 'undefined' && shift.earlyEntryGraceMinutes < 0) {
                throw new AppError('earlyEntryGraceMinutes must be non-negative.', 400, 'INVALID_SHIFT');
            }
        }

        if (accessMode === 'DAILY_QUOTA' && dailyQuotaMinutes !== null && dailyQuotaMinutes <= 0) {
            throw new AppError('dailyQuotaMinutes must be a positive number.', 400, 'INVALID_QUOTA');
        }

        // Duplicate subscription check
        const existingActiveSub = await Subscription.findOne({
            userId, libraryId, status: 'active', expiryDate: { $gt: new Date() }
        }).session(session);
        if (existingActiveSub) throw new AppError('User already has an active subscription', 400, 'BAD_REQUEST');

        // Grace period deduction logic (unchanged)
        const graceSub = await Subscription.findOne({
            userId, libraryId, gracePeriodAllowed: true
        }).sort({ createdAt: -1 }).session(session);

        let graceDaysToDeduct = 0;
        if (graceSub && !graceSub.graceDaysUsed) {
            const now = new Date();
            const graceStart = graceSub.graceStartDate || now;
            let daysUsed = Math.ceil((now.getTime() - graceStart.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUsed > graceSub.graceDaysAllowed) daysUsed = graceSub.graceDaysAllowed;
            if (daysUsed < 0) daysUsed = 0;
            graceDaysToDeduct = daysUsed;
            graceSub.graceDaysUsed = daysUsed;
            graceSub.gracePeriodAllowed = false;
            await graceSub.save({ session });
        }

        const subStartDate = startDate ? new Date(startDate) : new Date();
        let expiryDate;
        if (endDate) {
            expiryDate = new Date(endDate);
        } else {
            expiryDate = new Date(subStartDate);
            let finalDuration = plan.durationInDays - graceDaysToDeduct;
            if (finalDuration < 1) finalDuration = 1;
            expiryDate.setDate(expiryDate.getDate() + finalDuration);
        }

        // Determine effective daily quota for DAILY_QUOTA mode
        let effectiveQuota = dailyQuotaMinutes;
        if (accessMode === 'DAILY_QUOTA' && !effectiveQuota) {
            effectiveQuota = plan.hoursPerDay ? plan.hoursPerDay * 60 : null;
        }

        // Normalize shift object
        const shiftData = accessMode === 'FIXED_SHIFT' ? {
            code:                    shift.code.toUpperCase(),
            name:                    shift.name,
            startTime:               shift.startTime,
            endTime:                 shift.endTime,
            earlyEntryGraceMinutes:  shift.earlyEntryGraceMinutes ?? 10,
            allowLateEntry:          shift.allowLateEntry === true
        } : null;

        const [newSub] = await Subscription.create([{
            userId,
            libraryId,
            planId:            plan._id,
            planName:          plan.name || plan.title,
            pricePaid:         pricePaid || plan.price || 0,
            startDate:         subStartDate,
            expiryDate,
            status:            'active',
            paymentId:         `OFFLINE-${Date.now()}`,
            accessMode,
            shift:             shiftData,
            dailyQuotaMinutes: effectiveQuota || null
        }], { session });

        await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'studentDetails.currentSubscription': {
                        subscriptionId: newSub._id,
                        libraryId:      library._id,
                        planId:         plan._id,
                        startDate:      subStartDate,
                        expiryDate,
                        status:         'active'
                    }
                }
            },
            { new: true, session }
        );

        await session.commitTransaction();
        res.status(201).json({
            success: true,
            msg:     'Subscription activated successfully (Offline Payment)',
            subscription: newSub
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('Offline Sub Error:', err);
        handleAppError(err, res, 'Failed to activate subscription');
    } finally {
        session.endSession();
    }
};

// ============================================================
// 6. CANCEL/DELETE SUBSCRIPTION  (Admin/Owner)
// ============================================================
exports.deleteSubscription = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { libraryId, subscriptionId } = req.params;
        const adminId   = req.user._id;
        const adminRole = req.user.role;

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        const isAdmin        = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' && library.ownerId.toString() === adminId.toString();
        if (!isAdmin && !isLibraryOwner) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

        const subscription = await Subscription.findById(subscriptionId).session(session);
        if (!subscription) throw new AppError('Subscription not found', 404, 'NOT_FOUND');
        if (subscription.libraryId.toString() !== libraryId.toString()) {
            throw new AppError('Subscription does not belong to this library', 400, 'BAD_REQUEST');
        }

        const userId = subscription.userId;

        await Subscription.findByIdAndDelete(subscriptionId).session(session);

        const user = await User.findById(userId).session(session);
        if (user && user.studentDetails?.currentSubscription?.subscriptionId?.toString() === subscriptionId.toString()) {
            user.studentDetails.currentSubscription = null;
            await user.save({ session });
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, msg: 'Subscription canceled successfully' });

    } catch (err) {
        await session.abortTransaction();
        console.error('Delete Sub Error:', err);
        handleAppError(err, res, 'Failed to cancel subscription');
    } finally {
        session.endSession();
    }
};

// ============================================================
// 7. AUTO-RELEASE EXPIRED SEATS  (Cron / Admin)
// ============================================================
const releaseExpiredSeats = async () => {
    try {
        const now = new Date();
        const expiredSeats = await Seat.find({
            status: 'Occupied',
            expectedEndTime: { $lt: now }
        });

        if (expiredSeats.length === 0) return { releasedCount: 0 };

        let releasedCount = 0;
        const seatOps       = [];
        const attendanceOps = [];
        const userOps       = [];

        for (const seat of expiredSeats) {
            try {
                if (!seat.currentOccupant) {
                    seatOps.push({
                        updateOne: {
                            filter: { _id: seat._id },
                            update: { $set: { status: 'Available', occupiedSince: null, expectedEndTime: null } }
                        }
                    });
                    releasedCount++;
                    continue;
                }

                const userId = seat.currentOccupant;
                // Use seat.expectedEndTime as the exact checkout time instead of cron run time
                const checkOutTime = seat.expectedEndTime && new Date(seat.expectedEndTime) < now
                    ? new Date(seat.expectedEndTime)
                    : now;
                let durationMinutes = 0;
                if (seat.occupiedSince) {
                    durationMinutes = Math.max(0, Math.round((checkOutTime - new Date(seat.occupiedSince)) / 60000));
                }

                // Get library timezone
                const libDoc = await Library.findById(seat.libraryId).select('timezone').lean();
                const tz = libDoc?.timezone || 'Asia/Kolkata';
                const serviceDate = getServiceDateMidnight(seat.occupiedSince || now, tz);

                // Mark session as auto_released (matching any open session without checkOutTime)
                attendanceOps.push({
                    updateOne: {
                        filter: {
                            userId,
                            libraryId: seat.libraryId,
                            sessions: {
                                $elemMatch: {
                                    seatNumber:    seat.seatNumber,
                                    checkOutTime:  null
                                }
                            }
                        },
                        update: {
                            $set: {
                                'sessions.$.checkOutTime':    checkOutTime,
                                'sessions.$.durationMinutes': durationMinutes,
                                'sessions.$.sessionStatus':   'auto_released',
                                'sessions.$.checkoutReason':  'auto_expiry'
                            },
                            $inc: {
                                totalDurationToday: durationMinutes,
                                sessionCount:       1
                            }
                        }
                    }
                });

                userOps.push({
                    updateOne: {
                        filter: { _id: userId },
                        update: { $set: { 'studentDetails.assignedSeat': null } }
                    }
                });

                authMiddleware.invalidateUserCache(userId);

                const nextStatus = (seat.reservations && seat.reservations.length > 0) ? 'Reserved' : 'Available';
                seatOps.push({
                    updateOne: {
                        filter: { _id: seat._id },
                        update: {
                            $set: {
                                status:          nextStatus,
                                currentOccupant: null,
                                occupiedSince:   null,
                                expectedEndTime: null
                            }
                        }
                    }
                });

                releasedCount++;
            } catch (innerErr) {
                console.error(`Failed to prepare release for seat ${seat.seatNumber}:`, innerErr);
            }
        }

        if (attendanceOps.length > 0) await Attendance.bulkWrite(attendanceOps);
        if (userOps.length > 0)       await User.bulkWrite(userOps);
        if (seatOps.length > 0)       await Seat.bulkWrite(seatOps);

        // Also sweep any unclosed attendance sessions whose scheduledEnd or day has passed
        await closeExpiredAttendanceSessions(now);

        return { releasedCount, message: `Released ${releasedCount} expired seats` };

    } catch (err) {
        console.error('Auto Release Logic Error:', err);
        throw err;
    }
};

// ── Close any open attendance sessions whose shift/quota ended or are from past days ───
const closeExpiredAttendanceSessions = async (now = new Date()) => {
    try {
        const openAttendanceDocs = await Attendance.find({
            'sessions.checkOutTime': null
        });

        for (const doc of openAttendanceDocs) {
            let modified = false;

            for (const sess of doc.sessions) {
                if (!sess.checkOutTime) {
                    const inTime = sess.checkInTime ? new Date(sess.checkInTime) : null;
                    if (!inTime) continue;

                    const schedEnd = sess.scheduledEnd ? new Date(sess.scheduledEnd) : null;
                    const isScheduledPast = schedEnd && schedEnd <= now;
                    // If no scheduledEnd, consider expired if older than 8 hours or from a previous day
                    const isLegacyPast = !schedEnd && (now - inTime > 8 * 60 * 60 * 1000 || inTime.toDateString() !== now.toDateString());

                    if (isScheduledPast || isLegacyPast) {
                        const effectiveEnd = isScheduledPast
                            ? schedEnd
                            : new Date(inTime.getTime() + 5 * 60 * 60 * 1000); // 5h standard fallback

                        const dur = Math.max(0, Math.round((effectiveEnd - inTime) / 60000));
                        sess.checkOutTime = effectiveEnd;
                        sess.durationMinutes = dur;
                        sess.sessionStatus = 'auto_released';
                        sess.checkoutReason = sess.accessMode === 'FIXED_SHIFT' ? 'shift_ended' : 'auto_expiry';
                        modified = true;
                    }
                }
            }

            if (modified) {
                doc.totalDurationToday = doc.sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
                doc.sessionCount = doc.sessions.filter(s => !!s.checkOutTime).length;
                await doc.save();
            }
        }
    } catch (err) {
        console.error('Error closing expired attendance sessions:', err);
    }
};

exports.closeExpiredAttendanceSessions = closeExpiredAttendanceSessions;

exports.releaseExpiredSeats = releaseExpiredSeats;
exports.autoReleaseSeats = async (req, res) => {
    try {
        const result = await releaseExpiredSeats();
        res.json({ success: true, ...result });
    } catch {
        res.status(500).json({ message: 'Auto release failed' });
    }
};

// ============================================================
// 8. ATTENDANCE HISTORY
// ============================================================
exports.getAttendanceHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const totalAttendanceCount = await Attendance.countDocuments({ userId });

        const user = await User.findById(userId)
            .populate({
                path: 'attendanceHistory',
                select: 'date totalDurationToday sessionCount sessions -_id',
                options: { sort: { date: -1 } }
            })
            .lean();

        if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

        if (user.attendanceHistory &&
            user.attendanceHistory.length === totalAttendanceCount &&
            totalAttendanceCount > 0) {
            return res.json({ success: true, history: user.attendanceHistory });
        }

        const history = await Attendance.find(
            { userId },
            { date: 1, totalDurationToday: 1, sessionCount: 1, sessions: 1 }
        ).sort({ date: -1 });

        if (history.length > 0) {
            const attendanceIds = history.map(h => h._id);
            await User.findByIdAndUpdate(userId, { $set: { attendanceHistory: attendanceIds } });
        }

        res.json({ success: true, history });

    } catch (err) {
        console.error('Get History Error:', err);
        res.status(500).json({ success: false, msg: 'Failed to fetch history' });
    }
};

// ============================================================
// 9. GRANT GRACE PERIOD  (Admin/Owner)
// ============================================================
exports.grantGracePeriod = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { libraryId, subscriptionId } = req.params;
        const { graceDays } = req.body;
        const adminId   = req.user._id;
        const adminRole = req.user.role;

        if (!graceDays || graceDays <= 0) throw new AppError('Invalid grace days', 400, 'BAD_REQUEST');

        const library = await Library.findById(libraryId).session(session);
        if (!library) throw new AppError('Library not found', 404, 'NOT_FOUND');

        const isAdmin        = adminRole === 'admin' || adminRole === 'co-admin';
        const isLibraryOwner = adminRole === 'library_owner' && library.ownerId.toString() === adminId.toString();
        if (!isAdmin && !isLibraryOwner) throw new AppError('Unauthorized to grant grace period', 403, 'FORBIDDEN');

        const subscription = await Subscription.findById(subscriptionId).session(session);
        if (!subscription) throw new AppError('Subscription not found', 404, 'NOT_FOUND');

        if (subscription.libraryId.toString() !== libraryId.toString()) {
            throw new AppError('Subscription does not belong to this library', 400, 'BAD_REQUEST');
        }

        if (subscription.expiryDate > new Date()) {
            throw new AppError('Cannot grant grace period to an active subscription', 400, 'BAD_REQUEST');
        }

        subscription.gracePeriodAllowed = true;
        subscription.graceDaysAllowed   = Number(graceDays);
        if (!subscription.graceStartDate) subscription.graceStartDate = new Date();
        if (!subscription.graceDaysUsed)  subscription.graceDaysUsed = 0;
        subscription.status = 'expired';

        await subscription.save({ session });

        await User.findByIdAndUpdate(
            subscription.userId,
            {
                $set: {
                    'studentDetails.currentSubscription': {
                        subscriptionId: subscription._id,
                        libraryId:      library._id,
                        planId:         subscription.planId,
                        startDate:      subscription.startDate,
                        expiryDate:     subscription.expiryDate,
                        status:         'expired'
                    }
                }
            },
            { session }
        );

        await session.commitTransaction();
        res.status(200).json({
            success: true,
            msg: `Successfully granted ${graceDays} days of grace period.`,
            subscription
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('Grant Grace Period Error:', err);
        handleAppError(err, res, 'Failed to grant grace period');
    } finally {
        session.endSession();
    }
};

// Export helpers for use in libraryController / scheduler
exports.getServiceDateMidnight = getServiceDateMidnight;
exports.resolveShiftBoundaries  = resolveShiftBoundaries;