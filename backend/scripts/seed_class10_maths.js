const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
dotenv.config({ path: path.join(__dirname, '../.env') });

// CBSE Class 10 Maths - Hard difficulty, real NCERT-aligned questions
const questions = [
    // Real Numbers
    { questionText: "The HCF and LCM of two numbers are 9 and 360 respectively. If one number is 45, find the other number.", options: ["36", "72", "54", "90"], correctOptionIndex: 1, explanation: "HCF × LCM = Product of two numbers. So other = (9 × 360)/45 = 72." },
    { questionText: "The decimal expansion of 13/3125 is:", options: ["Terminating", "Non-terminating repeating", "Non-terminating non-repeating", "None of these"], correctOptionIndex: 0, explanation: "3125 = 5⁵. Since denominator has only 5 as prime factor, the decimal expansion is terminating: 13/3125 = 0.00416." },
    { questionText: "If the HCF of 65 and 117 is expressible as 65m − 117, then the value of m is:", options: ["1", "2", "3", "4"], correctOptionIndex: 1, explanation: "HCF(65,117) = 13. So 65m − 117 = 13 → 65m = 130 → m = 2." },
    // Polynomials
    { questionText: "If α and β are zeroes of x² − 6x + k, and 3α + 2β = 20, then k is:", options: ["-16", "8", "2", "-8"], correctOptionIndex: 0, explanation: "α + β = 6, 3α + 2β = 20. Solving: α = 8, β = -2. k = αβ = 8×(-2) = -16." },
    { questionText: "A quadratic polynomial whose sum of zeroes is 0 and product of zeroes is −1 is:", options: ["x² + 1", "x² − 1", "x² + x − 1", "x² − x + 1"], correctOptionIndex: 1, explanation: "p(x) = x² − (sum)x + product = x² − 0x + (−1) = x² − 1." },
    // Pair of Linear Equations
    { questionText: "For what value of k will the system x + 2y = 5 and 3x + ky + 15 = 0 have no solution?", options: ["6", "−6", "3", "−3"], correctOptionIndex: 0, explanation: "No solution when a₁/a₂ = b₁/b₂ ≠ c₁/c₂. 1/3 = 2/k → k = 6. Check: 5/−15 = −1/3 ≠ 1/3 ✓." },
    { questionText: "The pair of equations x = 4 and y = 3 graphically represents lines which are:", options: ["Parallel", "Intersecting at (4,3)", "Coincident", "Intersecting at (3,4)"], correctOptionIndex: 1, explanation: "x = 4 is vertical, y = 3 is horizontal. They intersect at the point (4, 3)." },
    // Quadratic Equations
    { questionText: "The discriminant of the quadratic equation 2x² − 4x + 3 = 0 is:", options: ["-8", "8", "10", "−10"], correctOptionIndex: 0, explanation: "D = b² − 4ac = (−4)² − 4(2)(3) = 16 − 24 = −8. Since D < 0, roots are not real." },
    { questionText: "The roots of 3x² − 5x + 2 = 0 are:", options: ["1 and 2/3", "−1 and −2/3", "1 and −2/3", "−1 and 2/3"], correctOptionIndex: 0, explanation: "3x² − 5x + 2 = 3x² − 3x − 2x + 2 = 3x(x−1) − 2(x−1) = (3x−2)(x−1) = 0. So x = 1 or x = 2/3." },
    // Arithmetic Progressions
    { questionText: "The 10th term of the AP: 2, 7, 12, ... is:", options: ["45", "47", "49", "52"], correctOptionIndex: 1, explanation: "a = 2, d = 5. a₁₀ = a + 9d = 2 + 45 = 47." },
    { questionText: "The sum of first 20 terms of the AP: 1, 5, 9, 13, ... is:", options: ["780", "800", "820", "760"], correctOptionIndex: 0, explanation: "a = 1, d = 4. S₂₀ = (20/2)[2(1) + 19(4)] = 10 × 78 = 780." },
    { questionText: "If the 3rd and 9th terms of an AP are 4 and −8 respectively, which term of this AP is zero?", options: ["4th", "5th", "6th", "7th"], correctOptionIndex: 1, explanation: "a+2d=4, a+8d=−8. Solving: d=−2, a=8. aₙ=0 → 8+(n−1)(−2)=0 → n=5." },
    // Triangles (Similarity)
    { questionText: "If ΔABC ~ ΔDEF and AB/DE = 3/5, then ar(ΔABC)/ar(ΔDEF) is:", options: ["9/25", "3/5", "25/9", "5/3"], correctOptionIndex: 0, explanation: "Ratio of areas of similar triangles = (ratio of corresponding sides)² = (3/5)² = 9/25." },
    { questionText: "In a triangle, if the square of one side equals the sum of squares of the other two sides, then the angle opposite to the first side is:", options: ["60°", "90°", "45°", "120°"], correctOptionIndex: 1, explanation: "This is the converse of the Pythagoras theorem. The angle opposite the largest side is 90°." },
    // Coordinate Geometry
    { questionText: "The distance between the points (3, 4) and (−1, 2) is:", options: ["√20", "√10", "√18", "√8"], correctOptionIndex: 0, explanation: "d = √[(3−(−1))² + (4−2)²] = √[16 + 4] = √20 = 2√5." },
    { questionText: "The coordinates of the point which divides the line segment joining (4, −3) and (8, 5) in the ratio 3:1 internally are:", options: ["(7, 3)", "(5, 1)", "(6, 2)", "(7, 2)"], correctOptionIndex: 0, explanation: "x = (3×8+1×4)/(3+1) = 28/4 = 7. y = (3×5+1×(−3))/4 = 12/4 = 3. Point = (7,3)." },
    // Trigonometry
    { questionText: "If sin A = 3/5, then the value of cos A is:", options: ["4/5", "3/4", "5/3", "5/4"], correctOptionIndex: 0, explanation: "sin²A + cos²A = 1. cos²A = 1 − 9/25 = 16/25. cos A = 4/5." },
    { questionText: "The value of (sin 45° + cos 45°) is:", options: ["1", "√2", "1/√2", "2"], correctOptionIndex: 1, explanation: "sin 45° = cos 45° = 1/√2. Sum = 1/√2 + 1/√2 = 2/√2 = √2." },
    { questionText: "If tan θ = 12/5, then (sin θ + cos θ) × 13 equals:", options: ["12", "17", "7", "15"], correctOptionIndex: 1, explanation: "tan θ = 12/5, hyp = 13. sin θ = 12/13, cos θ = 5/13. (12/13 + 5/13) × 13 = 17." },
    // Surface Areas & Volumes
    { questionText: "A solid metallic sphere of radius 3 cm is melted and recast into a cone of height 18 cm. The radius of the cone is:", options: ["2 cm", "3 cm", "6 cm", "4 cm"], correctOptionIndex: 0, explanation: "(4/3)π(3)³ = (1/3)πr²(18). 36π = 6πr². r² = 4. r = 2 cm." },
    { questionText: "A cylinder and a cone have equal radii and equal heights. The ratio of their volumes is:", options: ["2:1", "3:1", "1:3", "1:2"], correctOptionIndex: 1, explanation: "V_cyl = πr²h, V_cone = (1/3)πr²h. Ratio = πr²h / (1/3)πr²h = 3:1." },
    // Statistics
    { questionText: "The mean of 5 numbers is 18. If one number is excluded, the mean of the remaining becomes 16. The excluded number is:", options: ["24", "26", "28", "20"], correctOptionIndex: 1, explanation: "Sum of 5 = 90. Sum of 4 = 64. Excluded = 90 − 64 = 26." },
    { questionText: "The median of the data 3, 5, 9, 10, 11, 4, 6, 7 (after arranging) is:", options: ["6", "6.5", "7", "7.5"], correctOptionIndex: 1, explanation: "Arranged: 3,4,5,6,7,9,10,11. n=8 (even). Median = (6+7)/2 = 6.5." },
    // Probability
    { questionText: "A card is drawn from a well-shuffled deck of 52 cards. The probability of getting a red face card is:", options: ["3/13", "3/26", "6/52", "1/4"], correctOptionIndex: 1, explanation: "Red face cards = 6 (3 hearts + 3 diamonds: J, Q, K each). P = 6/52 = 3/26." },
    { questionText: "Two dice are thrown simultaneously. The probability of getting a sum of 7 is:", options: ["1/6", "5/36", "7/36", "1/9"], correctOptionIndex: 0, explanation: "Favourable: (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6 outcomes. P = 6/36 = 1/6." }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const quiz = await Quiz.findOne({ title: "Maths Final Revision" });
        if (!quiz) { console.log('Quiz not found!'); process.exit(1); }

        await Question.deleteMany({ quizId: quiz._id });
        const docs = questions.map(q => ({ ...q, quizId: quiz._id, tags: { chapter: "CBSE Class 10 Maths" } }));
        const inserted = await Question.insertMany(docs);
        await Quiz.updateOne({ _id: quiz._id }, { $set: { questionList: inserted.map(q => q._id), questions: inserted.length } });
        console.log(`✅ Seeded ${inserted.length} Class 10 Maths questions`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
seed();
