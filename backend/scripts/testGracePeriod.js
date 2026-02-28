require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Library = require('../models/LibrarySchema');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const { grantGracePeriod, checkIn, activateSubscriptionOffline } = require('../controllers/entryController');

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // 1. Setup Test Data
        const admin = await User.findOne({ role: 'admin' });
        const user = await User.findOne({ role: 'User' }) || await User.findOne({ role: 'student' });
        const library = await Library.findOne();
        let plan = await Plan.findOne();

        if (!admin || !user || !library) {
            console.log("Missing essential test data (admin/user/library).");
            process.exit(1);
        }

        if (!plan) {
            // Create a dummy plan if none exists
            plan = await Plan.create({
                libraryId: library._id,
                name: "Test Plan",
                price: 100,
                durationInDays: 30,
                hoursPerDay: 5
            });
            console.log("Created missing Plan");
        }

        console.log(`Testing with User: ${user.email}`);

        // 2. Create an EXPIRED subscription
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5); // Expired 5 days ago

        const expiredSub = await Subscription.create({
            userId: user._id,
            libraryId: library._id,
            planId: plan._id,
            planName: plan.name,
            pricePaid: plan.price,
            startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // Started 35 days ago
            expiryDate: pastDate,
            status: 'expired'
        });

        console.log(`\n[STEP 1] Created Expired Subscription: ${expiredSub._id}`);

        // 3. Grant Grace Period (Mocking request)
        const reqGrant = {
            params: { libraryId: library._id.toString(), subscriptionId: expiredSub._id.toString() },
            body: { graceDays: 3 },
            finduser: { _id: admin._id, role: admin.role }
        };

        const resMock = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        await grantGracePeriod(reqGrant, resMock);

        if (resMock.data && resMock.data.success) {
            console.log(`\n[STEP 2] Grace Period Granted Successfully! (${reqGrant.body.graceDays} days)`);
        } else {
            console.log(`\n[STEP 2] Failed to grant Grace Period:`, resMock.data);
            process.exit(1);
        }

        // 4. Simulate Check-In (Should succeed due to Grace Period)
        const reqCheckIn = {
            body: { qrCodeString: library.accessConfig.qrCodeData },
            finduser: { _id: user._id }
        };

        const resCheckIn = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        // We temporarily turn off actual seat assignment error by catching it or letting it fail normally if library full
        try {
            await checkIn(reqCheckIn, resCheckIn);
            if (resCheckIn.statusCode === 200 || !resCheckIn.statusCode) {
                console.log(`\n[STEP 3] Check-In Result:`, resCheckIn.data);
                if (resCheckIn.data && resCheckIn.data.success) {
                    console.log("-> ✅ Check-in successful during Grace Period!");
                } else if (resCheckIn.data.action === 'SHOW_PLANS') {
                    console.log("-> ❌ Check-in failed (treated as expired). Grace period logic failed.");
                } else {
                    console.log("-> ℹ️ Check-in returned other status (e.g. library full, already seated).");
                }
            } else {
                console.log(`\n[STEP 3] Check-In Error Code ${resCheckIn.statusCode}:`, resCheckIn.data);
            }
        } catch (err) {
            console.log(`\n[STEP 3] Check-In Exception (expected if seats full): ${err.message}`);
        }

        // 5. Simulate Offline Payment (Should deduct grace days)
        // Let's modify the graceStartDate to simulate we are 2 days into the grace period
        const subForPayment = await Subscription.findById(expiredSub._id);
        const simulateGraceStart = new Date();
        simulateGraceStart.setDate(simulateGraceStart.getDate() - 2); // 2 days ago
        subForPayment.graceStartDate = simulateGraceStart;
        await subForPayment.save();

        console.log(`\n[STEP 4] Simulating Offline Payment (User pays 2 days into Grace Period)...`);

        const reqPay = {
            body: {
                userId: user._id.toString(),
                libraryId: library._id.toString(),
                planId: plan._id.toString(),
                pricePaid: plan.price
            },
            finduser: { _id: admin._id, role: admin.role }
        };

        const resPay = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        await activateSubscriptionOffline(reqPay, resPay);

        if (resPay.data && resPay.data.success) {
            const newSub = resPay.data.subscription;

            // Assuming newSub start date is today, and duration is plan.durationInDays - 2
            const expectedDays = plan.durationInDays - 2; // expected duration after deducting 2 days grace used

            const actualDays = Math.round((new Date(newSub.expiryDate) - new Date(newSub.startDate)) / (1000 * 60 * 60 * 24));

            console.log(`-> New Subscription Created.`);
            console.log(`-> Base Plan Duration: ${plan.durationInDays} days`);
            console.log(`-> Deducted Grace Days: 2 days (Expected)`);
            console.log(`-> Actual New Subs Duration: ${actualDays} days`);

            if (actualDays === expectedDays) {
                console.log("-> ✅ Grace Period days used correctly deducted!");
            } else {
                console.log("-> ❌ Grace Period days NOT deducted correctly.");
            }
        } else {
            console.log(`-> ❌ Payment Failed:`, resPay.data);
        }

        // 6. Cleanup
        console.log(`\n[STEP 5] Cleaning up test data...`);
        await Subscription.findByIdAndDelete(expiredSub._id);
        if (resPay.data && resPay.data.subscription) {
            await Subscription.findByIdAndDelete(resPay.data.subscription._id);
        }
        console.log("-> Cleanup done.");

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        mongoose.disconnect();
    }
}

runTest();
