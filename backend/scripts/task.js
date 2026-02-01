const mongoose = require('mongoose');

// --- 1. CONNECT TO YOUR DB ---
// Replace with your actual Mongo URI
const MONGO_URI = "mongodb+srv://drharsh821115_db_user:Lxq3reHn72K04jrn@power0.qpo1o6h.mongodb.net/?appName=power0"

// --- 2. IMPORT SCHEMAS ---
// (Assuming these are in ./models folder, adjust paths if needed)
const User = require('../models/User');
const Library = require('../models/LibrarySchema');
const Subscription = require('../models/Subscription');
const Seat = require('../models/Seat');
const Attendance = require('../models/Attendance');

// --- 3. HARDCODED IDS (FROM YOUR DATA) ---
const LIBRARY_ID = "696b5f7fc64ea4d1d3b488fd"; // Your 'alice' library
const PLAN_ID = "696cc6e5dc31dfbc0ca2aa66";   // Your '1-month' plan

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Clear existing test data
        await User.deleteMany({ email: { $in: ['rahul@test.com', 'priya@test.com', 'amit@test.com'] } });
        await Seat.deleteMany({ libraryId: LIBRARY_ID });
        await Subscription.deleteMany({ libraryId: LIBRARY_ID });

        console.log("🧹 Creating Dummy Data...");

        // ====================================================
        // 1. CREATE USERS
        // ====================================================
        const userRahul = new User({
            _id: new mongoose.Types.ObjectId(),
            name: "Rahul Kumar",
            email: "rahul@test.com",
            role: "User",
            password: "password123", // You might need to hash this if using bcrypt
            studentDetails: {
                currentSubscription: {
                    libraryId: LIBRARY_ID,
                    planId: PLAN_ID,
                    status: 'active',
                    startDate: new Date(),
                    expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)) // +30 days
                },
                assignedSeat: null // Rahul is OUTSIDE
            }
        });

        const userPriya = new User({
            _id: new mongoose.Types.ObjectId(),
            name: "Priya Singh",
            email: "priya@test.com",
            role: "User",
            password: "password123",
            studentDetails: {
                currentSubscription: {
                    libraryId: LIBRARY_ID,
                    planId: PLAN_ID,
                    status: 'active',
                    startDate: new Date(),
                    expiryDate: new Date(new Date().setDate(new Date().getDate() + 30))
                },
                // Priya is INSIDE (We will link seat ID later)
                assignedSeat: {
                    seatNumber: "GEN-1",
                    checkInTime: new Date()
                }
            }
        });

        const userAmit = new User({
            _id: new mongoose.Types.ObjectId(),
            name: "Amit Sharma",
            email: "amit@test.com",
            role: "User",
            password: "password123",
            studentDetails: {
                currentSubscription: {
                    libraryId: LIBRARY_ID,
                    planId: PLAN_ID,
                    status: 'expired', // EXPIRED
                    startDate: new Date(new Date().setDate(new Date().getDate() - 60)), // 60 days ago
                    expiryDate: new Date(new Date().setDate(new Date().getDate() - 30)) // Expired 30 days ago
                },
                assignedSeat: null
            }
        });

        // ====================================================
        // 2. CREATE SEATS (Based on your categories)
        // ====================================================

        // Seat 1: Occupied by Priya
        const seat1 = new Seat({
            libraryId: LIBRARY_ID,
            seatNumber: "1",
            category: "General",
            status: "Occupied",
            currentOccupant: userPriya._id,
            occupiedSince: new Date()
        });

        // Seat 2: Available (For Rahul to scan and take)
        const seat2 = new Seat({
            libraryId: LIBRARY_ID,
            seatNumber: "2",
            category: "General",
            status: "Available",
            currentOccupant: null
        });

        // Seat 3: Available
        const seat3 = new Seat({
            libraryId: LIBRARY_ID,
            seatNumber: "3",
            category: "General",
            status: "Available",
            currentOccupant: null
        });

        // Update Priya's user record with the actual Seat ID
        userPriya.studentDetails.assignedSeat.seatId = seat1._id;

        // ====================================================
        // 3. CREATE SUBSCRIPTIONS (The linkage)
        // ====================================================
        const subRahul = new Subscription({
            userId: userRahul._id,
            libraryId: LIBRARY_ID,
            planId: PLAN_ID,
            planName: "1-month",
            pricePaid: 300,
            status: 'active',
            startDate: new Date(),
            expiryDate: new Date(new Date().setDate(new Date().getDate() + 30))
        });

        const subPriya = new Subscription({
            userId: userPriya._id,
            libraryId: LIBRARY_ID,
            planId: PLAN_ID,
            planName: "1-month",
            pricePaid: 300,
            status: 'active',
            startDate: new Date(),
            expiryDate: new Date(new Date().setDate(new Date().getDate() + 30))
        });

        const subAmit = new Subscription({
            userId: userAmit._id,
            libraryId: LIBRARY_ID,
            planId: PLAN_ID,
            planName: "1-month",
            pricePaid: 300,
            status: 'expired',
            startDate: new Date(new Date().setDate(new Date().getDate() - 60)),
            expiryDate: new Date(new Date().setDate(new Date().getDate() - 30))
        });

        // ====================================================
        // 4. SAVE EVERYTHING
        // ====================================================
        await User.insertMany([userRahul, userPriya, userAmit]);
        await Seat.insertMany([seat1, seat2, seat3]);
        await Subscription.insertMany([subRahul, subPriya, subAmit]);

        // Optional: Create an active attendance record for Priya
        await Attendance.create({
            userId: userPriya._id,
            libraryId: LIBRARY_ID,
            seatNumber: "GEN-1",
            checkInTime: new Date()
        });

        console.log("✅ DATA INSERTED SUCCESSFULLY!");
        console.log("------------------------------------------------");
        console.log(`1. Rahul ID: ${userRahul._id} (Use this to test valid SCAN)`);
        console.log(`2. Priya ID: ${userPriya._id} (Use this to test 'ALREADY SEATED')`);
        console.log(`3. Amit  ID: ${userAmit._id} (Use this to test 'EXPIRED PLAN')`);
        console.log("------------------------------------------------");

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();