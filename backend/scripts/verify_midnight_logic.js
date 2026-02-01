const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Attendance = require('../models/Attendance');
const Seat = require('../models/Seat');
const User = require('../models/User');
const Library = require('../models/LibrarySchema');

// Load Env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyMidnightLogic() {
    console.log("--- Starting Midnight Crossing Verification ---");

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // 1. SETUP TEST DATA
        const testId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();
        const libraryId = new mongoose.Types.ObjectId();
        const seatId = new mongoose.Types.ObjectId();

        console.log(`Test IDs - User: ${userId}, Lib: ${libraryId}`);

        // Mock "Yesterday"
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(14, 0, 0, 0); // Sat down yesterday at 2 PM

        const yesterdayBucket = new Date(yesterday);
        yesterdayBucket.setHours(0, 0, 0, 0);

        // Create Attendance Record for Yesterday
        await Attendance.create({
            userId,
            libraryId,
            date: yesterdayBucket,
            sessions: [{
                seatNumber: "TEST-01",
                checkInTime: yesterday,
                checkOutTime: null, // Still open!
                durationMinutes: 0
            }],
            sessionCount: 1,
            totalDurationToday: 0
        });
        console.log("Created 'Yesterday' Attendance Record (Open Session)");

        // 2. SIMULATE CHECKOUT LOGIC
        // This logic mirrors exports.checkOut in entryController.js
        console.log("Simulating Check-Out for a seat occupied since yesterday...");

        const seatOccupiedSince = yesterday;
        const checkOutTime = now;

        // Calculate Bucket Date (THE FIX)
        const bucketDate = new Date(seatOccupiedSince);
        bucketDate.setHours(0, 0, 0, 0);

        console.log(`Occupied Since: ${seatOccupiedSince.toISOString()}`);
        console.log(`Calculated Bucket Date: ${bucketDate.toISOString()}`);

        const durationMinutes = Math.round((checkOutTime - seatOccupiedSince) / 60000);

        // Perform Update
        const result = await Attendance.findOneAndUpdate(
            {
                userId,
                libraryId,
                date: bucketDate, // TARGETING YESTERDAY'S BUCKET
                "sessions.checkOutTime": null
            },
            {
                $set: {
                    "sessions.$.checkOutTime": checkOutTime,
                    "sessions.$.durationMinutes": durationMinutes
                },
                $inc: { totalDurationToday: durationMinutes }
            },
            { new: true }
        );

        // 3. VERIFY RESULTS
        if (result) {
            console.log("SUCCESS: Found and updated attendance record!");
            const updatedSession = result.sessions.find(s => s.checkOutTime);
            if (updatedSession && updatedSession.checkOutTime) {
                console.log(`Session closed correctly. Duration: ${updatedSession.durationMinutes} mins`);
                console.log(`CheckOut Time: ${updatedSession.checkOutTime}`);

                if (result.date.toISOString() === yesterdayBucket.toISOString()) {
                    console.log("VERIFIED: Updated the correct daily bucket (Yesterday).");
                } else {
                    console.error("FAILED: Updated the WRONG daily bucket!");
                }
            } else {
                console.error("FAILED: Session checkOutTime still null.");
            }
        } else {
            console.error("FAILED: No matching attendance record found!");
        }

        // CLEANUP
        await Attendance.deleteMany({ userId });
        console.log("Test Data Cleaned Up");

    } catch (err) {
        console.error("Verification Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
    }
}

verifyMidnightLogic();
