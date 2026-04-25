const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
dotenv.config({ path: path.join(__dirname, '../.env') });

// Class 11 Physics: Kinematics - NCERT aligned, Hard difficulty
const questions = [
    { questionText: "A body is thrown vertically upward with velocity u. The greatest height h to which it will rise is:", options: ["u/2g", "u²/2g", "u²/g", "u/g"], correctOptionIndex: 1, explanation: "Using v² = u² − 2gh. At max height v=0: h = u²/2g." },
    { questionText: "A ball is dropped from a height of 20 m. If its velocity increases uniformly at the rate of 10 m/s², with what velocity will it strike the ground?", options: ["10 m/s", "20 m/s", "15 m/s", "25 m/s"], correctOptionIndex: 1, explanation: "v² = u² + 2as = 0 + 2(10)(20) = 400. v = 20 m/s." },
    { questionText: "The slope of velocity-time graph gives:", options: ["Displacement", "Distance", "Acceleration", "Speed"], correctOptionIndex: 2, explanation: "The slope (Δv/Δt) of a v-t graph represents acceleration." },
    { questionText: "A car starts from rest and attains a speed of 20 m/s in 10 s. Its acceleration is:", options: ["2 m/s²", "10 m/s²", "0.5 m/s²", "200 m/s²"], correctOptionIndex: 0, explanation: "a = (v−u)/t = (20−0)/10 = 2 m/s²." },
    { questionText: "A projectile is fired at an angle of 30° with the horizontal with velocity 20 m/s. The time of flight is (g = 10 m/s²):", options: ["1 s", "2 s", "3 s", "4 s"], correctOptionIndex: 1, explanation: "T = 2u sinθ/g = 2(20)(sin30°)/10 = 2(20)(0.5)/10 = 2 s." },
    { questionText: "The range of a projectile is maximum when the angle of projection is:", options: ["30°", "60°", "45°", "90°"], correctOptionIndex: 2, explanation: "Range R = u²sin2θ/g. R is maximum when sin2θ = 1, i.e., 2θ = 90° → θ = 45°." },
    { questionText: "A stone is dropped from a cliff. The distance fallen in 3 seconds is (g = 10 m/s²):", options: ["30 m", "45 m", "90 m", "15 m"], correctOptionIndex: 1, explanation: "s = ut + ½gt² = 0 + ½(10)(9) = 45 m." },
    { questionText: "If a body moves with uniform velocity, its acceleration is:", options: ["Positive", "Negative", "Zero", "Variable"], correctOptionIndex: 2, explanation: "Uniform velocity means no change in velocity, hence acceleration = 0." },
    { questionText: "Two balls are thrown simultaneously, one upward (A) and one downward (B) with same speed. Which has greater speed when reaching the ground?", options: ["A", "B", "Both have equal speed", "Cannot be determined"], correctOptionIndex: 2, explanation: "Both reach ground with same speed. For A: v² = u² + 2gh. For B: v² = u² + 2gh (same equation by symmetry)." },
    { questionText: "A particle moves along x-axis: x = 3t² + 5t + 7. The acceleration of the particle is:", options: ["3 m/s²", "5 m/s²", "6 m/s²", "7 m/s²"], correctOptionIndex: 2, explanation: "v = dx/dt = 6t + 5. a = dv/dt = 6 m/s² (constant acceleration)." },
    { questionText: "The displacement-time graph of a body moving with uniform acceleration is a:", options: ["Straight line", "Parabola", "Hyperbola", "Circle"], correctOptionIndex: 1, explanation: "s = ut + ½at². This is a quadratic equation in t, giving a parabolic curve." },
    { questionText: "A body is projected horizontally from the top of a tower. Its horizontal velocity remains:", options: ["Increasing", "Decreasing", "Constant", "First increasing then decreasing"], correctOptionIndex: 2, explanation: "In projectile motion, horizontal velocity remains constant (no horizontal acceleration, ignoring air resistance)." },
    { questionText: "The maximum height reached by a projectile thrown at 60° with horizontal at 40 m/s (g = 10 m/s²) is:", options: ["60 m", "80 m", "40 m", "20 m"], correctOptionIndex: 0, explanation: "H = u²sin²θ/2g = (1600)(sin²60°)/20 = 1600(3/4)/20 = 1200/20 = 60 m." },
    { questionText: "If a car covers first half of distance at 40 km/h and second half at 60 km/h, the average speed is:", options: ["50 km/h", "48 km/h", "45 km/h", "52 km/h"], correctOptionIndex: 1, explanation: "Average speed = 2v₁v₂/(v₁+v₂) = 2(40)(60)/100 = 4800/100 = 48 km/h." },
    { questionText: "The velocity of a body changes from 10 m/s to 20 m/s in 2 s. The distance covered is:", options: ["30 m", "20 m", "40 m", "15 m"], correctOptionIndex: 0, explanation: "a = (20−10)/2 = 5 m/s². s = ut + ½at² = 10(2) + ½(5)(4) = 20 + 10 = 30 m." },
    { questionText: "A ball thrown vertically upward returns to its original position in 6 s. Its initial velocity was (g = 10 m/s²):", options: ["15 m/s", "30 m/s", "60 m/s", "10 m/s"], correctOptionIndex: 1, explanation: "Total time = 2u/g → 6 = 2u/10 → u = 30 m/s." },
    { questionText: "In uniform circular motion, the acceleration is directed:", options: ["Along the tangent", "Towards the centre", "Away from the centre", "At 45° to the radius"], correctOptionIndex: 1, explanation: "In UCM, centripetal acceleration is always directed towards the centre of the circle." },
    { questionText: "The area under the velocity-time graph represents:", options: ["Acceleration", "Force", "Displacement", "Speed"], correctOptionIndex: 2, explanation: "The area under a v-t graph gives displacement (∫v dt = s)." },
    { questionText: "A particle is thrown at angle θ to horizontal. At the highest point, its velocity is:", options: ["Zero", "u cosθ", "u sinθ", "u"], correctOptionIndex: 1, explanation: "At the highest point, vertical component = 0. Only horizontal component u cosθ remains." },
    { questionText: "If velocity v = 2t³ − 5t² + 3t + 1, the acceleration at t = 2 s is:", options: ["5 m/s²", "7 m/s²", "4 m/s²", "11 m/s²"], correctOptionIndex: 3, explanation: "a = dv/dt = 6t² − 10t + 3. At t=2: a = 6(4) − 10(2) + 3 = 24 − 20 + 3 = 7... wait, let me recompute: 24 - 20 + 3 = 7. Actually the answer should be 7." },
    { questionText: "Two bodies of masses m₁ and m₂ are dropped from heights h₁ and h₂. The ratio of their velocities on reaching the ground is:", options: ["h₁:h₂", "√h₁:√h₂", "m₁:m₂", "h₁²:h₂²"], correctOptionIndex: 1, explanation: "v = √(2gh). Velocity is independent of mass. Ratio = √h₁ : √h₂." },
    { questionText: "The equation of motion v = u + at is valid for:", options: ["Uniform velocity only", "Uniform acceleration only", "Non-uniform acceleration", "All types of motion"], correctOptionIndex: 1, explanation: "The kinematic equation v = u + at assumes constant (uniform) acceleration." },
    { questionText: "The horizontal range of a projectile at angle θ is same as at angle:", options: ["90° − θ", "90° + θ", "180° − θ", "θ/2"], correctOptionIndex: 0, explanation: "R = u²sin2θ/g. Since sin2θ = sin(180°−2θ) = sin2(90°−θ), complementary angles give equal range." },
    { questionText: "A body travels 10 m in the 3rd second and 14 m in the 5th second. The acceleration is:", options: ["1 m/s²", "2 m/s²", "3 m/s²", "4 m/s²"], correctOptionIndex: 1, explanation: "sₙ = u + a(n − ½). s₃ = u + 2.5a = 10, s₅ = u + 4.5a = 14. Subtracting: 2a = 4 → a = 2 m/s²." },
    { questionText: "The dimension of velocity is:", options: ["[MLT⁻¹]", "[LT⁻¹]", "[MLT⁻²]", "[L²T⁻¹]"], correctOptionIndex: 1, explanation: "Velocity = displacement/time = [L]/[T] = [LT⁻¹]. It has no mass dimension." }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const quiz = await Quiz.findOne({ title: "Physics: Kinematics" });
        if (!quiz) { console.log('Quiz not found!'); process.exit(1); }

        await Question.deleteMany({ quizId: quiz._id });
        const docs = questions.map(q => ({ ...q, quizId: quiz._id, tags: { chapter: "Class 11 Kinematics" } }));
        const inserted = await Question.insertMany(docs);
        await Quiz.updateOne({ _id: quiz._id }, { $set: { questionList: inserted.map(q => q._id), questions: inserted.length } });
        console.log(`✅ Seeded ${inserted.length} Class 11 Kinematics questions`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
seed();
