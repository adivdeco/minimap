const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Library = require('../models/LibrarySchema');
const Subscription = require('../models/Subscription');

dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // 1. Find a User (We'll use the one running the script, or just the first user found)
        // Ideally, change this email to YOUR account email that you are logged in with
        const userEmail = "adivsingh@example.com"; // REPLACE THIS with your actual login email if different
        let user = await User.findOne({});

        if (!user) {
            console.log("No users found. Please register a user first.");
            process.exit(1);
        }

        console.log(`Seeding Subscription for User: ${user.name} (${user.email})`);

        // 2. Find a Library
        const library = await Library.findOne({});
        if (!library) {
            console.log("No libraries found. Please create one first.");
            process.exit(1);
        }
        console.log(`Target Library: ${library.libraryName}`);

        // 3. Create active subscription
        // We assume the first plan invalid
        const planId = library.plans.length > 0 ? library.plans[0]._id : new mongoose.Types.ObjectId();

        const sub = await Subscription.create({
            userId: user._id,
            libraryId: library._id,
            planId: planId,
            planName: "Test Plan",
            pricePaid: 0,
            startDate: new Date(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days from now
            status: 'active'
        });

        // 4. Update User Profile
        user.studentDetails = {
            currentSubscription: {
                subscriptionId: sub._id,
                libraryId: library._id,
                planId: planId,
                status: 'active',
                expiryDate: sub.expiryDate
            }
        };
        await user.save();

        console.log("\nSUCCESS! Test Subscription Created.");
        console.log("-----------------------------------");
        console.log(`User ID: ${user._id}`);
        console.log(`Library QR Code Data: ${library.accessConfig.qrCodeData}`);
        console.log("-----------------------------------");
        console.log("You can now test the Check-In API with this QR Code.");

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

seed();
