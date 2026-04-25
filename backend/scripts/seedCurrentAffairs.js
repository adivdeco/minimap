const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');

// Load env vars
dotenv.config();

const questionsData = [
    {
        questionText: "Which country hosted the G20 Summit in 2023?",
        options: ["Brazil", "India", "Indonesia", "South Africa"],
        correctOptionIndex: 1,
        explanation: "India held the Presidency of the G20 from 1 December 2022 to 30 November 2023 and hosted the summit in New Delhi."
    },
    {
        questionText: "On which date did ISRO's Chandrayaan-3 successfully land on the Moon?",
        options: ["July 14, 2023", "August 23, 2023", "September 2, 2023", "August 15, 2023"],
        correctOptionIndex: 1,
        explanation: "Chandrayaan-3 successfully landed near the lunar south pole on August 23, 2023, making India the first country to do so."
    },
    {
        questionText: "Who was awarded the Nobel Peace Prize in 2023?",
        options: ["Malala Yousafzai", "Greta Thunberg", "Narges Mohammadi", "Denis Mukwege"],
        correctOptionIndex: 2,
        explanation: "Iranian human rights activist Narges Mohammadi won the 2023 Nobel Peace Prize for her fight against the oppression of women in Iran."
    },
    {
        questionText: "Which team won the ICC Men's Cricket World Cup 2023?",
        options: ["India", "Australia", "England", "South Africa"],
        correctOptionIndex: 1,
        explanation: "Australia defeated India in the final to win their sixth ICC Men's Cricket World Cup title."
    },
    {
        questionText: "Who was the Chief Guest at India's Republic Day parade in 2024?",
        options: ["Joe Biden", "Abdel Fattah El-Sisi", "Emmanuel Macron", "Rishi Sunak"],
        correctOptionIndex: 2,
        explanation: "French President Emmanuel Macron was the chief guest for the 75th Republic Day celebrations in 2024."
    },
    {
        questionText: "Which city hosted the COP28 climate summit?",
        options: ["Paris", "London", "Dubai", "New York"],
        correctOptionIndex: 2,
        explanation: "The 2023 United Nations Climate Change Conference or Conference of the Parties of the UNFCCC, more commonly referred to as COP28, was held in Dubai, UAE."
    },
    {
        questionText: "Who was named Time Magazine's Person of the Year for 2023?",
        options: ["Elon Musk", "Volodymyr Zelensky", "Taylor Swift", "Sam Altman"],
        correctOptionIndex: 2,
        explanation: "Taylor Swift was named Time's 2023 Person of the Year, becoming the first person to win the title for her achievements in the arts."
    },
    {
        questionText: "Which country officially joined NATO as its 32nd member in 2024?",
        options: ["Finland", "Ukraine", "Sweden", "Georgia"],
        correctOptionIndex: 2,
        explanation: "Sweden officially joined NATO as its 32nd member in March 2024, abandoning decades of non-alignment."
    },
    {
        questionText: "Who won the Best Actor award at the Oscars 2024?",
        options: ["Cillian Murphy", "Bradley Cooper", "Leonardo DiCaprio", "Ryan Gosling"],
        correctOptionIndex: 0,
        explanation: "Cillian Murphy won the Best Actor Oscar for his role as J. Robert Oppenheimer in Christopher Nolan's 'Oppenheimer'."
    },
    {
        questionText: "What is the name of India's first dedicated solar space mission?",
        options: ["Surya-1", "Aditya-L1", "Bhaskar-1", "Ravi-L1"],
        correctOptionIndex: 1,
        explanation: "Aditya-L1 is the first space-based Indian mission to study the Sun, launched by ISRO in September 2023."
    },
    {
        questionText: "What is the name of the longest sea bridge in India inaugurated in 2024?",
        options: ["Bandra-Worli Sea Link", "Atal Setu", "Bogibeel Bridge", "Dhola-Sadiya Bridge"],
        correctOptionIndex: 1,
        explanation: "The Mumbai Trans Harbour Link (MTHL), officially named Atal Bihari Vajpayee Sewri-Nhava Sheva Atal Setu, is the longest sea bridge in India."
    },
    {
        questionText: "Which country won the FIFA Women's World Cup 2023?",
        options: ["USA", "England", "Spain", "Sweden"],
        correctOptionIndex: 2,
        explanation: "Spain won their first ever FIFA Women's World Cup title by defeating England 1-0 in the final."
    },
    {
        questionText: "Who became the first woman Director General of the Central Industrial Security Force (CISF)?",
        options: ["Nina Singh", "Kiran Bedi", "Kanchan Chaudhary Bhattacharya", "Sonia Narang"],
        correctOptionIndex: 0,
        explanation: "Nina Singh, an IPS officer of the 1989 batch, became the first woman to head the CISF."
    },
    {
        questionText: "Which state won the Raja Bhalindra Singh Trophy for overall championship in National Games 2023?",
        options: ["Haryana", "Services", "Maharashtra", "Punjab"],
        correctOptionIndex: 2,
        explanation: "Maharashtra topped the medal tally at the 37th National Games held in Goa with 228 medals."
    },
    {
        questionText: "What was India's rank in the Global Hunger Index 2023?",
        options: ["101", "107", "111", "115"],
        correctOptionIndex: 2,
        explanation: "India ranked 111th out of 125 countries in the Global Hunger Index 2023."
    },
    {
        questionText: "Who was appointed as the new CEO of X (formerly Twitter) in 2023?",
        options: ["Parag Agrawal", "Linda Yaccarino", "Sheryl Sandberg", "Susan Wojcicki"],
        correctOptionIndex: 1,
        explanation: "Elon Musk appointed Linda Yaccarino as the new CEO of X Corp in June 2023."
    },
    {
        questionText: "Which city hosted the 19th Asian Games in 2023?",
        options: ["Jakarta", "Tokyo", "Hangzhou", "Seoul"],
        correctOptionIndex: 2,
        explanation: "The 19th Asian Games were held in Hangzhou, China, from 23 September to 8 October 2023."
    },
    {
        questionText: "What was the name of the operation launched by India to evacuate its citizens from Israel in 2023?",
        options: ["Operation Ganga", "Operation Devi Shakti", "Operation Ajay", "Operation Kaveri"],
        correctOptionIndex: 2,
        explanation: "Operation Ajay was launched by the Government of India to evacuate Indian citizens from Israel amid the 2023 Israel-Hamas war."
    },
    {
        questionText: "Which Indian city became the first to be recognized as 'City of Literature' by UNESCO?",
        options: ["Kolkata", "Jaipur", "Kozhikode", "Varanasi"],
        correctOptionIndex: 2,
        explanation: "Kozhikode in Kerala was named India's first UNESCO 'City of Literature' in October 2023."
    },
    {
        questionText: "Which city is hosting the 2024 Summer Olympic Games?",
        options: ["Los Angeles", "Paris", "Tokyo", "Brisbane"],
        correctOptionIndex: 1,
        explanation: "Paris, France, is hosting the 2024 Summer Olympics."
    },
    {
        questionText: "Which team won the IPL (Indian Premier League) 2023?",
        options: ["Gujarat Titans", "Chennai Super Kings", "Mumbai Indians", "Royal Challengers Bangalore"],
        correctOptionIndex: 1,
        explanation: "Chennai Super Kings won their fifth IPL title by defeating Gujarat Titans in the final."
    },
    {
        questionText: "What is the name of the AI chatbot launched by Google to rival ChatGPT?",
        options: ["Bing AI", "Copilot", "Bard (now Gemini)", "Claude"],
        correctOptionIndex: 2,
        explanation: "Google launched Bard in early 2023, which was later rebranded as Gemini, as its primary conversational AI."
    },
    {
        questionText: "Who is the current President of the World Bank (as of 2024)?",
        options: ["David Malpass", "Ajay Banga", "Kristalina Georgieva", "Gita Gopinath"],
        correctOptionIndex: 1,
        explanation: "Ajay Banga, an Indian-American business executive, assumed office as the President of the World Bank Group in June 2023."
    },
    {
        questionText: "Which film won the Best Picture award at the Oscars 2024?",
        options: ["Barbie", "Poor Things", "Killers of the Flower Moon", "Oppenheimer"],
        correctOptionIndex: 3,
        explanation: "Christopher Nolan's 'Oppenheimer' swept the 2024 Oscars, including the award for Best Picture."
    },
    {
        questionText: "Which country recently became the first to successfully land a spacecraft on the Moon's south pole?",
        options: ["USA", "Russia", "China", "India"],
        correctOptionIndex: 3,
        explanation: "India became the first country to land a spacecraft near the lunar south pole with the Chandrayaan-3 mission."
    }
];

const seedData = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is undefined!');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Create or find a "Current Affairs" quiz
        let quiz = await Quiz.findOne({ title: "Daily Current Affairs" });
        
        if (!quiz) {
            quiz = new Quiz({
                title: "Current Affairs 2023-2024",
                category: "General",
                targetAudience: "All",
                questions: 25,
                time: 15,
                difficulty: "Medium",
                iconName: "Target",
                themeColor: "indigo"
            });
            await quiz.save();
            console.log('Created new Current Affairs quiz card');
        } else {
            console.log('Found existing Current Affairs quiz card');
        }

        // Clear existing questions for this quiz to avoid duplicates if run multiple times
        await Question.deleteMany({ quizId: quiz._id });
        quiz.questionList = [];
        await quiz.save();
        console.log('Cleared existing questions for this quiz');

        console.log('Inserting 25 current affairs questions...');
        
        const questionDocs = questionsData.map(q => ({
            ...q,
            quizId: quiz._id,
            tags: {
                classOrExam: "General",
                subject: "Current Affairs",
                chapter: "Global & India"
            }
        }));

        const insertedQuestions = await Question.insertMany(questionDocs);
        
        // Add IDs to the quiz's questionList
        quiz.questionList = insertedQuestions.map(q => q._id);
        quiz.questions = insertedQuestions.length;
        await quiz.save();

        console.log('Successfully seeded 25 questions and linked them to the quiz!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
