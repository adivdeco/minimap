const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
dotenv.config({ path: path.join(__dirname, '../.env') });

// Quantitative Aptitude - SSC/Banking/General competitive exam level
const questions = [
    { questionText: "A train 300 m long crosses a pole in 15 seconds. Its speed is:", options: ["72 km/h", "20 km/h", "60 km/h", "36 km/h"], correctOptionIndex: 0, explanation: "Speed = 300/15 = 20 m/s = 20 × 18/5 = 72 km/h." },
    { questionText: "A shopkeeper marks his goods 30% above cost price and allows a discount of 10%. His gain percent is:", options: ["20%", "17%", "15%", "25%"], correctOptionIndex: 1, explanation: "Let CP = 100. MP = 130. SP = 130 × 0.9 = 117. Gain = 17%." },
    { questionText: "The average of first 50 natural numbers is:", options: ["25", "25.5", "26", "50"], correctOptionIndex: 1, explanation: "Average = (n+1)/2 = 51/2 = 25.5." },
    { questionText: "If A can do a work in 12 days and B in 18 days, together they can finish it in:", options: ["7.2 days", "6 days", "8 days", "9 days"], correctOptionIndex: 0, explanation: "Combined rate = 1/12 + 1/18 = 5/36. Time = 36/5 = 7.2 days." },
    { questionText: "The ratio of two numbers is 3:5 and their HCF is 4. Their LCM is:", options: ["40", "60", "12", "20"], correctOptionIndex: 1, explanation: "Numbers = 12 and 20. LCM(12,20) = 60." },
    { questionText: "A sum of ₹5000 amounts to ₹6050 in 2 years at simple interest. The rate of interest is:", options: ["10.5%", "10%", "11%", "12%"], correctOptionIndex: 0, explanation: "SI = 1050. R = (SI × 100)/(P × T) = (1050 × 100)/(5000 × 2) = 10.5%." },
    { questionText: "The compound interest on ₹8000 at 10% p.a. for 2 years is:", options: ["₹1600", "₹1680", "₹1720", "₹1800"], correctOptionIndex: 1, explanation: "A = 8000(1.1)² = 8000 × 1.21 = 9680. CI = 9680 − 8000 = ₹1680." },
    { questionText: "If the radius of a circle is increased by 50%, the area increases by:", options: ["100%", "125%", "150%", "225%"], correctOptionIndex: 1, explanation: "New area = π(1.5r)² = 2.25πr². Increase = 125%." },
    { questionText: "A boat goes 12 km upstream in 3 hours and 16 km downstream in 2 hours. The speed of the boat in still water is:", options: ["6 km/h", "5 km/h", "8 km/h", "10 km/h"], correctOptionIndex: 0, explanation: "Upstream speed = 4, Downstream = 8. Boat speed = (4+8)/2 = 6 km/h." },
    { questionText: "The present ages of A and B are in ratio 5:4. After 5 years their ratio becomes 6:5. Present age of A is:", options: ["20 years", "25 years", "30 years", "35 years"], correctOptionIndex: 1, explanation: "5x+5 : 4x+5 = 6:5. 25x+25 = 24x+30. x=5. A = 25 years." },
    { questionText: "A pipe can fill a tank in 20 minutes and another can empty it in 30 minutes. If both work together, the tank fills in:", options: ["45 min", "50 min", "60 min", "40 min"], correctOptionIndex: 2, explanation: "Net rate = 1/20 − 1/30 = 1/60. Tank fills in 60 minutes." },
    { questionText: "In how many ways can 5 people be seated in a row?", options: ["25", "60", "120", "720"], correctOptionIndex: 2, explanation: "5! = 5×4×3×2×1 = 120." },
    { questionText: "The probability of getting at least one head when 3 coins are tossed is:", options: ["7/8", "3/8", "1/2", "1/8"], correctOptionIndex: 0, explanation: "P(at least 1 head) = 1 − P(no head) = 1 − (1/2)³ = 1 − 1/8 = 7/8." },
    { questionText: "If 5x − 3 = 3x + 7, then x equals:", options: ["2", "5", "3", "7"], correctOptionIndex: 1, explanation: "5x − 3x = 7 + 3. 2x = 10. x = 5." },
    { questionText: "The area of a triangle with sides 3, 4, and 5 is:", options: ["6 sq units", "10 sq units", "12 sq units", "7.5 sq units"], correctOptionIndex: 0, explanation: "3-4-5 is a right triangle. Area = ½ × 3 × 4 = 6 sq units." },
    { questionText: "A number when divided by 342 gives remainder 47. What remainder will be obtained when the same number is divided by 18?", options: ["11", "7", "5", "9"], correctOptionIndex: 0, explanation: "Number = 342k + 47. 342 = 18 × 19, so 342k is divisible by 18. 47 ÷ 18 = 2 remainder 11." },
    { questionText: "The sum of all angles of a hexagon is:", options: ["360°", "540°", "720°", "900°"], correctOptionIndex: 2, explanation: "Sum = (n−2) × 180° = (6−2) × 180° = 720°." },
    { questionText: "A car covers 60 km at 30 km/h and next 60 km at 20 km/h. The average speed is:", options: ["25 km/h", "24 km/h", "22 km/h", "28 km/h"], correctOptionIndex: 1, explanation: "Total distance = 120 km. Total time = 2 + 3 = 5 hours. Avg speed = 120/5 = 24 km/h." },
    { questionText: "The smallest number which when divided by 6, 8, and 12 leaves remainder 2 in each case is:", options: ["26", "50", "24", "14"], correctOptionIndex: 0, explanation: "LCM(6,8,12) = 24. Required number = 24 + 2 = 26." },
    { questionText: "If a:b = 2:3 and b:c = 4:5, then a:b:c is:", options: ["8:12:15", "2:3:5", "4:6:5", "2:4:5"], correctOptionIndex: 0, explanation: "Make b common: a:b = 8:12, b:c = 12:15. So a:b:c = 8:12:15." },
    { questionText: "A mixture contains alcohol and water in the ratio 4:3. If 5 litres of water is added, the ratio becomes 4:5. The quantity of alcohol is:", options: ["10 litres", "12 litres", "15 litres", "8 litres"], correctOptionIndex: 0, explanation: "Let alcohol = 4x, water = 3x. 4x/(3x+5) = 4/5. 20x = 12x+20. x = 2.5. Alcohol = 10 litres." },
    { questionText: "The value of √(0.0081) is:", options: ["0.9", "0.09", "0.009", "9"], correctOptionIndex: 1, explanation: "√(0.0081) = √(81/10000) = 9/100 = 0.09." },
    { questionText: "What is 15% of 240?", options: ["32", "36", "34", "38"], correctOptionIndex: 1, explanation: "15% of 240 = (15/100) × 240 = 36." },
    { questionText: "The next number in the series 2, 6, 12, 20, 30, ... is:", options: ["40", "42", "36", "48"], correctOptionIndex: 1, explanation: "Differences: 4, 6, 8, 10, 12. Next term = 30 + 12 = 42. Pattern: n(n+1)." },
    { questionText: "A man walks 5 km south, then turns left and walks 3 km, then turns left and walks 5 km. How far is he from the starting point?", options: ["0 km", "3 km", "5 km", "8 km"], correctOptionIndex: 1, explanation: "He forms a U-shape: 5S, 3E, 5N. He's back at the same latitude but 3 km east. Distance = 3 km." }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const quiz = await Quiz.findOne({ title: "Quantitative Aptitude" });
        if (!quiz) { console.log('Quiz not found!'); process.exit(1); }

        await Question.deleteMany({ quizId: quiz._id });
        const docs = questions.map(q => ({ ...q, quizId: quiz._id, tags: { chapter: "Quantitative Aptitude" } }));
        const inserted = await Question.insertMany(docs);
        await Quiz.updateOne({ _id: quiz._id }, { $set: { questionList: inserted.map(q => q._id), questions: inserted.length } });
        console.log(`✅ Seeded ${inserted.length} Quantitative Aptitude questions`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
seed();
