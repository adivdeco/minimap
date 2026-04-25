const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
dotenv.config({ path: path.join(__dirname, '../.env') });

// Recent Current Affairs 2024-2025
const questions = [
    { questionText: "Which country hosted the G20 Summit in 2024?", options: ["India", "Brazil", "South Africa", "Italy"], correctOptionIndex: 1, explanation: "Brazil held the G20 Presidency in 2024 and hosted the summit in Rio de Janeiro in November 2024." },
    { questionText: "Who won the 2024 Nobel Prize in Physics for work on artificial neural networks?", options: ["Geoffrey Hinton", "Yann LeCun", "Demis Hassabis", "John Hopfield & Geoffrey Hinton"], correctOptionIndex: 3, explanation: "John Hopfield and Geoffrey Hinton were awarded the 2024 Nobel Prize in Physics for foundational discoveries in machine learning with artificial neural networks." },
    { questionText: "Which city hosted the 2024 Summer Olympic Games?", options: ["Los Angeles", "Paris", "Tokyo", "Brisbane"], correctOptionIndex: 1, explanation: "Paris hosted the 2024 Summer Olympics from July 26 to August 11, 2024." },
    { questionText: "India's total medal count at the Paris 2024 Olympics was:", options: ["4", "5", "6", "7"], correctOptionIndex: 2, explanation: "India won 6 medals at Paris 2024: 1 silver (Neeraj Chopra) and 5 bronze medals." },
    { questionText: "Who became the 50th Chief Justice of India in November 2024?", options: ["Justice Sanjiv Khanna", "Justice D.Y. Chandrachud", "Justice B.R. Gavai", "Justice Surya Kant"], correctOptionIndex: 0, explanation: "Justice Sanjiv Khanna was sworn in as the 50th Chief Justice of India on November 11, 2024." },
    { questionText: "Which country became the newest member of BRICS in 2024?", options: ["Indonesia", "Argentina", "Saudi Arabia", "Ethiopia"], correctOptionIndex: 3, explanation: "Ethiopia, along with Egypt, Iran, UAE, and Saudi Arabia, officially joined BRICS in January 2024." },
    { questionText: "ISRO's next planned mission after Chandrayaan-3 for Venus exploration is called:", options: ["Shukrayaan-1", "Venus Orbiter Mission", "Mangalyaan-2", "Gaganyaan"], correctOptionIndex: 0, explanation: "Shukrayaan-1 is ISRO's planned orbiter mission to Venus to study Venus's atmosphere, surface, and sub-surface." },
    { questionText: "Who won the ICC Men's T20 World Cup 2024?", options: ["Australia", "South Africa", "England", "India"], correctOptionIndex: 3, explanation: "India defeated South Africa in the final at Barbados to win the 2024 ICC Men's T20 World Cup." },
    { questionText: "Which AI model released by Google in 2024 replaced Bard?", options: ["PaLM", "Gemini", "LaMDA", "Claude"], correctOptionIndex: 1, explanation: "Google rebranded Bard as Gemini in February 2024, naming it after their multimodal AI model family." },
    { questionText: "India's first underwater metro tunnel opened in which city in 2024?", options: ["Mumbai", "Delhi", "Kolkata", "Chennai"], correctOptionIndex: 2, explanation: "India's first underwater metro tunnel under the Hooghly River opened in Kolkata as part of the East-West Metro corridor." },
    { questionText: "Who was re-elected as President of Russia in March 2024?", options: ["Dmitry Medvedev", "Vladimir Putin", "Sergey Lavrov", "Mikhail Mishustin"], correctOptionIndex: 1, explanation: "Vladimir Putin won the March 2024 presidential election with over 87% of votes, securing his fifth term." },
    { questionText: "Which spacecraft successfully returned asteroid samples to Earth in September 2023?", options: ["Hayabusa2", "OSIRIS-REx", "Chang'e 5", "Stardust"], correctOptionIndex: 1, explanation: "NASA's OSIRIS-REx delivered samples from asteroid Bennu to Earth on September 24, 2023." },
    { questionText: "The 2024 Union Budget of India was presented by:", options: ["Arun Jaitley", "Piyush Goyal", "Nirmala Sitharaman", "Amit Shah"], correctOptionIndex: 2, explanation: "Finance Minister Nirmala Sitharaman presented the Union Budget 2024-25, her 7th consecutive budget." },
    { questionText: "Which state of India achieved 100% household tap water connections under Jal Jeevan Mission first?", options: ["Goa", "Haryana", "Punjab", "Himachal Pradesh"], correctOptionIndex: 0, explanation: "Goa became the first state to achieve 100% Har Ghar Jal (tap water connections) under the Jal Jeevan Mission." },
    { questionText: "The theme of World Environment Day 2024 was:", options: ["Only One Earth", "Beat Plastic Pollution", "Land Restoration, Desertification and Drought Resilience", "Ecosystem Restoration"], correctOptionIndex: 2, explanation: "World Environment Day 2024 focused on land restoration, desertification, and drought resilience, hosted by Saudi Arabia." },
    { questionText: "Which Indian state launched the 'Gruha Lakshmi' scheme providing ₹2000/month to women heads of households?", options: ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh"], correctOptionIndex: 2, explanation: "Karnataka launched the Gruha Lakshmi scheme as part of the 5 guarantees of the Congress government in 2023." },
    { questionText: "The Ayodhya Ram Mandir was inaugurated on which date?", options: ["January 22, 2024", "January 26, 2024", "August 5, 2024", "December 25, 2023"], correctOptionIndex: 0, explanation: "The Ram Mandir at Ayodhya was inaugurated on January 22, 2024, with the Pran Pratishtha ceremony." },
    { questionText: "Who was awarded the Bharat Ratna in 2024?", options: ["L.K. Advani only", "Karpoori Thakur only", "P.V. Narasimha Rao, Chaudhary Charan Singh, and others", "All of the above"], correctOptionIndex: 3, explanation: "In 2024, Bharat Ratna was awarded to L.K. Advani, Karpoori Thakur (posthumous), P.V. Narasimha Rao (posthumous), Chaudhary Charan Singh (posthumous), and M.S. Swaminathan (posthumous)." },
    { questionText: "Which country successfully landed on the far side of the Moon in 2024 with Chang'e 6?", options: ["USA", "India", "China", "Japan"], correctOptionIndex: 2, explanation: "China's Chang'e 6 mission successfully landed on the far side of the Moon in June 2024 and returned lunar soil samples." },
    { questionText: "The 18th Lok Sabha elections in India were held in how many phases in 2024?", options: ["5", "6", "7", "8"], correctOptionIndex: 2, explanation: "The 2024 Indian general elections were conducted in 7 phases from April 19 to June 1, 2024." },
    { questionText: "Which tech company became the first to reach a $3 trillion market capitalization in 2024?", options: ["Microsoft", "Apple", "NVIDIA", "Google"], correctOptionIndex: 1, explanation: "Apple became the first company to reach $3 trillion market cap, with NVIDIA later joining the club in 2024." },
    { questionText: "UPI (Unified Payments Interface) crossed how many billion transactions per month in 2024?", options: ["8 billion", "10 billion", "12 billion", "14 billion"], correctOptionIndex: 3, explanation: "UPI crossed 14 billion monthly transactions in 2024, cementing India's position as a global digital payments leader." },
    { questionText: "Which Indian athlete won a silver medal in Javelin Throw at Paris Olympics 2024?", options: ["Sumit Antil", "Neeraj Chopra", "Kishore Jena", "DP Manu"], correctOptionIndex: 1, explanation: "Neeraj Chopra won silver with a throw of 89.45m at Paris 2024, with Pakistan's Arshad Nadeem winning gold." },
    { questionText: "The Semiconductor Mission of India aims to establish chip fabrication plants. The first major fab plant is being set up by:", options: ["Intel in Karnataka", "TSMC in Gujarat", "Tata Electronics in Gujarat", "Samsung in Tamil Nadu"], correctOptionIndex: 2, explanation: "Tata Electronics is setting up India's first commercial semiconductor fab in Dholera, Gujarat under the India Semiconductor Mission." },
    { questionText: "Which hurricane caused massive devastation in the southeastern United States in late 2024?", options: ["Hurricane Ian", "Hurricane Milton", "Hurricane Katrina", "Hurricane Laura"], correctOptionIndex: 1, explanation: "Hurricane Milton made landfall in Florida in October 2024, causing significant destruction and flooding." }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const quiz = await Quiz.findOne({ title: /current affairs/i });
        if (!quiz) { console.log('Quiz not found!'); process.exit(1); }

        await Question.deleteMany({ quizId: quiz._id });
        const docs = questions.map(q => ({ ...q, quizId: quiz._id, tags: { chapter: "Current Affairs 2024-25" } }));
        const inserted = await Question.insertMany(docs);
        await Quiz.updateOne({ _id: quiz._id }, { $set: { questionList: inserted.map(q => q._id), questions: inserted.length } });
        console.log(`✅ Seeded ${inserted.length} Current Affairs questions`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
seed();
