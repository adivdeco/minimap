const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Helper to create a batch of questions for a specific topic
const generateQuestionsForTopic = (quizTitle, count) => {
    const questions = [];
    
    for (let i = 1; i <= count; i++) {
        let qText = '';
        let options = [];
        let correctOptionIndex = 0;
        let explanation = '';

        if (quizTitle.includes('Maths') || quizTitle.includes('Quantitative')) {
            const a = Math.floor(Math.random() * 50) + 10;
            const b = Math.floor(Math.random() * 50) + 10;
            qText = `What is the result of ${a} + ${b} * 2?`;
            const ans = a + (b * 2);
            options = [`${ans - 10}`, `${ans}`, `${ans + 10}`, `${ans + 20}`];
            correctOptionIndex = 1;
            explanation = `By BODMAS rule, first multiply ${b} * 2 = ${b * 2}, then add ${a} to get ${ans}.`;
            
            // Add some variation
            if (i % 3 === 0) {
                qText = `Solve for x: 2x - ${a} = ${b}`;
                const x = (b + a) / 2;
                options = [`${x}`, `${x - 2}`, `${x + 2}`, `${x + 4}`];
                correctOptionIndex = 0;
                explanation = `2x = ${b} + ${a} => 2x = ${b + a} => x = ${x}.`;
            }
        } 
        else if (quizTitle.includes('Physics') || quizTitle.includes('Kinematics')) {
            const v = Math.floor(Math.random() * 20) + 5;
            const t = Math.floor(Math.random() * 10) + 2;
            qText = `An object moves with a constant velocity of ${v} m/s for ${t} seconds. What is the total distance covered?`;
            const d = v * t;
            options = [`${d - 10} m`, `${d + 10} m`, `${d} m`, `${d * 2} m`];
            correctOptionIndex = 2;
            explanation = `Distance = velocity × time = ${v} × ${t} = ${d} m.`;
            
            if (i % 3 === 0) {
                qText = `Which of the following represents acceleration?`;
                options = ["Rate of change of displacement", "Rate of change of velocity", "Rate of change of mass", "Product of mass and velocity"];
                correctOptionIndex = 1;
                explanation = "Acceleration is defined as the rate of change of velocity with respect to time.";
            }
        }
        else if (quizTitle.includes('Chemistry') || quizTitle.includes('Organics')) {
            qText = `Question ${i} on Organic Chemistry: What is the IUPAC name of CH3-CH2-OH?`;
            options = ["Methanol", "Ethanol", "Propanol", "Butanol"];
            correctOptionIndex = 1;
            explanation = "CH3-CH2-OH has two carbon atoms, so the root word is 'eth'. The functional group is an alcohol (-OH), so the suffix is 'anol'.";
            
            if (i % 3 === 0) {
                qText = `Question ${i}: Which of the following is an alkane?`;
                options = ["C2H4", "C2H2", "C2H6", "C6H6"];
                correctOptionIndex = 2;
                explanation = "Alkanes follow the general formula CnH2n+2. For n=2, it is C2H6 (Ethane).";
            }
        }
        else if (quizTitle.includes('Biology') || quizTitle.includes('NEET')) {
            qText = `Question ${i} for NEET Biology: Which organelle is known as the powerhouse of the cell?`;
            options = ["Nucleus", "Ribosome", "Mitochondria", "Golgi Apparatus"];
            correctOptionIndex = 2;
            explanation = "Mitochondria are known as the powerhouse of the cell because they generate most of the cell's supply of adenosine triphosphate (ATP).";
            
            if (i % 3 === 0) {
                qText = `Question ${i}: What is the basic unit of heredity?`;
                options = ["Chromosome", "Gene", "DNA", "RNA"];
                correctOptionIndex = 1;
                explanation = "A gene is the basic physical and functional unit of heredity.";
            }
        }
        else {
            // Generic Science / JEE
            qText = `General Science Question ${i}: What is the chemical symbol for Gold?`;
            options = ["Ag", "Au", "Fe", "Cu"];
            correctOptionIndex = 1;
            explanation = "The chemical symbol for Gold is Au, from the Latin word 'aurum'.";
            
            if (i % 3 === 0) {
                qText = `Question ${i}: Which planet is known as the Red Planet?`;
                options = ["Venus", "Mars", "Jupiter", "Saturn"];
                correctOptionIndex = 1;
                explanation = "Mars is known as the Red Planet due to the iron oxide prevalent on its surface.";
            }
        }

        // Shuffle options slightly to make it look dynamic (while keeping correctOptionIndex accurate)
        // For simplicity, we just use the generated options directly.
        
        questions.push({
            questionText: qText,
            options: options,
            correctOptionIndex: correctOptionIndex,
            explanation: explanation
        });
    }
    
    return questions;
};

const seedQuizzes = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is undefined!');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const quizzes = await Quiz.find({});
        
        for (const quiz of quizzes) {
            // Skip current affairs
            if (quiz.title.toLowerCase().includes('current affairs')) {
                console.log(`Skipping ${quiz.title}`);
                continue;
            }

            console.log(`Processing quiz: ${quiz.title}`);
            
            // Delete existing questions
            await Question.deleteMany({ quizId: quiz._id });
            
            // Generate between 20 and 30 questions based on what the quiz model says
            // If quiz.questions is set, use it, otherwise default to 20
            const count = quiz.questions && quiz.questions > 0 ? quiz.questions : 25;
            const generatedQs = generateQuestionsForTopic(quiz.title, count);
            
            const questionDocs = generatedQs.map(q => ({
                ...q,
                quizId: quiz._id,
                tags: {
                    chapter: quiz.category
                }
            }));

            const insertedQuestions = await Question.insertMany(questionDocs);
            
            // Update quiz with question IDs
            await Quiz.updateOne(
                { _id: quiz._id }, 
                { $set: { questionList: insertedQuestions.map(q => q._id), questions: insertedQuestions.length } }
            );
            
            console.log(`Successfully added ${insertedQuestions.length} questions to '${quiz.title}'`);
        }

        console.log('\nAll targeted mock tests have been seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedQuizzes();
