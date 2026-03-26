const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');

async function debug() {
    await mongoose.connect('mongodb+srv://drharsh821115_db_user:Lxq3reHn72K04jrn@power0.qpo1o6h.mongodb.net/?appName=power0');

    const dateStr = "2026-03-25";
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    
    // Check exactly how it queries
    const targetStartDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    targetStartDate.setHours(0, 0, 0, 0);
    
    const targetEndDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    targetEndDate.setHours(23, 59, 59, 999);

    console.log("Querying between:", targetStartDate, "and", targetEndDate);

    const records = await Attendance.find({ 
        date: { $gte: targetStartDate, $lte: targetEndDate } 
    });

    console.log("Raw matched Attendance records:", records.length);
    if(records.length > 0) {
        console.log("Sample record:", JSON.stringify(records[0], null, 2));
    }
    
    // Check if it's stored differently?
    const allRecent = await Attendance.find().sort({_id:-1}).limit(10);
    console.log("\nMost recent Attendance dates in DB:");
    allRecent.forEach(r => console.log(r._id, r.date, "Library Object ID:", r.libraryId));

    process.exit();
}
debug().catch(console.error);
