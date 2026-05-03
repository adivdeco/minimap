const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');

// Load env vars
dotenv.config();

// const questionsData = [
//     {
//         questionText: "Which country hosted the G20 Summit in 2023?",
//         options: ["Brazil", "India", "Indonesia", "South Africa"],
//         correctOptionIndex: 1,
//         explanation: "India held the Presidency of the G20 from 1 December 2022 to 30 November 2023 and hosted the summit in New Delhi."
//     },
//     {
//         questionText: "On which date did ISRO's Chandrayaan-3 successfully land on the Moon?",
//         options: ["July 14, 2023", "August 23, 2023", "September 2, 2023", "August 15, 2023"],
//         correctOptionIndex: 1,
//         explanation: "Chandrayaan-3 successfully landed near the lunar south pole on August 23, 2023, making India the first country to do so."
//     },
//     {
//         questionText: "Who was awarded the Nobel Peace Prize in 2023?",
//         options: ["Malala Yousafzai", "Greta Thunberg", "Narges Mohammadi", "Denis Mukwege"],
//         correctOptionIndex: 2,
//         explanation: "Iranian human rights activist Narges Mohammadi won the 2023 Nobel Peace Prize for her fight against the oppression of women in Iran."
//     },
//     {
//         questionText: "Which team won the ICC Men's Cricket World Cup 2023?",
//         options: ["India", "Australia", "England", "South Africa"],
//         correctOptionIndex: 1,
//         explanation: "Australia defeated India in the final to win their sixth ICC Men's Cricket World Cup title."
//     },
//     {
//         questionText: "Who was the Chief Guest at India's Republic Day parade in 2024?",
//         options: ["Joe Biden", "Abdel Fattah El-Sisi", "Emmanuel Macron", "Rishi Sunak"],
//         correctOptionIndex: 2,
//         explanation: "French President Emmanuel Macron was the chief guest for the 75th Republic Day celebrations in 2024."
//     },
//     {
//         questionText: "Which city hosted the COP28 climate summit?",
//         options: ["Paris", "London", "Dubai", "New York"],
//         correctOptionIndex: 2,
//         explanation: "The 2023 United Nations Climate Change Conference or Conference of the Parties of the UNFCCC, more commonly referred to as COP28, was held in Dubai, UAE."
//     },
//     {
//         questionText: "Who was named Time Magazine's Person of the Year for 2023?",
//         options: ["Elon Musk", "Volodymyr Zelensky", "Taylor Swift", "Sam Altman"],
//         correctOptionIndex: 2,
//         explanation: "Taylor Swift was named Time's 2023 Person of the Year, becoming the first person to win the title for her achievements in the arts."
//     },
//     {
//         questionText: "Which country officially joined NATO as its 32nd member in 2024?",
//         options: ["Finland", "Ukraine", "Sweden", "Georgia"],
//         correctOptionIndex: 2,
//         explanation: "Sweden officially joined NATO as its 32nd member in March 2024, abandoning decades of non-alignment."
//     },
//     {
//         questionText: "Who won the Best Actor award at the Oscars 2024?",
//         options: ["Cillian Murphy", "Bradley Cooper", "Leonardo DiCaprio", "Ryan Gosling"],
//         correctOptionIndex: 0,
//         explanation: "Cillian Murphy won the Best Actor Oscar for his role as J. Robert Oppenheimer in Christopher Nolan's 'Oppenheimer'."
//     },
//     {
//         questionText: "What is the name of India's first dedicated solar space mission?",
//         options: ["Surya-1", "Aditya-L1", "Bhaskar-1", "Ravi-L1"],
//         correctOptionIndex: 1,
//         explanation: "Aditya-L1 is the first space-based Indian mission to study the Sun, launched by ISRO in September 2023."
//     },
//     {
//         questionText: "What is the name of the longest sea bridge in India inaugurated in 2024?",
//         options: ["Bandra-Worli Sea Link", "Atal Setu", "Bogibeel Bridge", "Dhola-Sadiya Bridge"],
//         correctOptionIndex: 1,
//         explanation: "The Mumbai Trans Harbour Link (MTHL), officially named Atal Bihari Vajpayee Sewri-Nhava Sheva Atal Setu, is the longest sea bridge in India."
//     },
//     {
//         questionText: "Which country won the FIFA Women's World Cup 2023?",
//         options: ["USA", "England", "Spain", "Sweden"],
//         correctOptionIndex: 2,
//         explanation: "Spain won their first ever FIFA Women's World Cup title by defeating England 1-0 in the final."
//     },
//     {
//         questionText: "Who became the first woman Director General of the Central Industrial Security Force (CISF)?",
//         options: ["Nina Singh", "Kiran Bedi", "Kanchan Chaudhary Bhattacharya", "Sonia Narang"],
//         correctOptionIndex: 0,
//         explanation: "Nina Singh, an IPS officer of the 1989 batch, became the first woman to head the CISF."
//     },
//     {
//         questionText: "Which state won the Raja Bhalindra Singh Trophy for overall championship in National Games 2023?",
//         options: ["Haryana", "Services", "Maharashtra", "Punjab"],
//         correctOptionIndex: 2,
//         explanation: "Maharashtra topped the medal tally at the 37th National Games held in Goa with 228 medals."
//     },
//     {
//         questionText: "What was India's rank in the Global Hunger Index 2023?",
//         options: ["101", "107", "111", "115"],
//         correctOptionIndex: 2,
//         explanation: "India ranked 111th out of 125 countries in the Global Hunger Index 2023."
//     },
//     {
//         questionText: "Who was appointed as the new CEO of X (formerly Twitter) in 2023?",
//         options: ["Parag Agrawal", "Linda Yaccarino", "Sheryl Sandberg", "Susan Wojcicki"],
//         correctOptionIndex: 1,
//         explanation: "Elon Musk appointed Linda Yaccarino as the new CEO of X Corp in June 2023."
//     },
//     {
//         questionText: "Which city hosted the 19th Asian Games in 2023?",
//         options: ["Jakarta", "Tokyo", "Hangzhou", "Seoul"],
//         correctOptionIndex: 2,
//         explanation: "The 19th Asian Games were held in Hangzhou, China, from 23 September to 8 October 2023."
//     },
//     {
//         questionText: "What was the name of the operation launched by India to evacuate its citizens from Israel in 2023?",
//         options: ["Operation Ganga", "Operation Devi Shakti", "Operation Ajay", "Operation Kaveri"],
//         correctOptionIndex: 2,
//         explanation: "Operation Ajay was launched by the Government of India to evacuate Indian citizens from Israel amid the 2023 Israel-Hamas war."
//     },
//     {
//         questionText: "Which Indian city became the first to be recognized as 'City of Literature' by UNESCO?",
//         options: ["Kolkata", "Jaipur", "Kozhikode", "Varanasi"],
//         correctOptionIndex: 2,
//         explanation: "Kozhikode in Kerala was named India's first UNESCO 'City of Literature' in October 2023."
//     },
//     {
//         questionText: "Which city is hosting the 2024 Summer Olympic Games?",
//         options: ["Los Angeles", "Paris", "Tokyo", "Brisbane"],
//         correctOptionIndex: 1,
//         explanation: "Paris, France, is hosting the 2024 Summer Olympics."
//     },
//     {
//         questionText: "Which team won the IPL (Indian Premier League) 2023?",
//         options: ["Gujarat Titans", "Chennai Super Kings", "Mumbai Indians", "Royal Challengers Bangalore"],
//         correctOptionIndex: 1,
//         explanation: "Chennai Super Kings won their fifth IPL title by defeating Gujarat Titans in the final."
//     },
//     {
//         questionText: "What is the name of the AI chatbot launched by Google to rival ChatGPT?",
//         options: ["Bing AI", "Copilot", "Bard (now Gemini)", "Claude"],
//         correctOptionIndex: 2,
//         explanation: "Google launched Bard in early 2023, which was later rebranded as Gemini, as its primary conversational AI."
//     },
//     {
//         questionText: "Who is the current President of the World Bank (as of 2024)?",
//         options: ["David Malpass", "Ajay Banga", "Kristalina Georgieva", "Gita Gopinath"],
//         correctOptionIndex: 1,
//         explanation: "Ajay Banga, an Indian-American business executive, assumed office as the President of the World Bank Group in June 2023."
//     },
//     {
//         questionText: "Which film won the Best Picture award at the Oscars 2024?",
//         options: ["Barbie", "Poor Things", "Killers of the Flower Moon", "Oppenheimer"],
//         correctOptionIndex: 3,
//         explanation: "Christopher Nolan's 'Oppenheimer' swept the 2024 Oscars, including the award for Best Picture."
//     },
//     {
//         questionText: "Which country recently became the first to successfully land a spacecraft on the Moon's south pole?",
//         options: ["USA", "Russia", "China", "India"],
//         correctOptionIndex: 3,
//         explanation: "India became the first country to land a spacecraft near the lunar south pole with the Chandrayaan-3 mission."
//     }
// ];
const questionsData = [
    // --- EASY (1-10) ---
    { 
        questionText: "According to the laws of reflection, the angle of incidence is always:", 
        options: ["Greater than the angle of reflection", "Less than the angle of reflection", "Equal to the angle of reflection", "Zero"], 
        correctOptionIndex: 2, 
        explanation: "The first law of reflection states that the angle of incidence (i) is always equal to the angle of reflection (r)." 
    },
    { 
        questionText: "The image formed by a plane mirror is always:", 
        options: ["Real and erect", "Virtual and erect", "Real and inverted", "Virtual and inverted"], 
        correctOptionIndex: 1, 
        explanation: "A plane mirror always forms an image that is virtual, erect, and of the same size as the object." 
    },
    { 
        questionText: "What is the speed of light in a vacuum?", 
        options: ["3 x 10^5 m/s", "3 x 10^8 km/s", "3 x 10^8 m/s", "3 x 10^10 m/s"], 
        correctOptionIndex: 2, 
        explanation: "The speed of light in a vacuum is approximately 300,000 km/s, which is written as 3 x 10^8 m/s." 
    },
    { 
        questionText: "Which type of mirror is commonly used as a rear-view mirror in vehicles?", 
        options: ["Plane mirror", "Concave mirror", "Convex mirror", "Plano-concave mirror"], 
        correctOptionIndex: 2, 
        explanation: "Convex mirrors are used because they always give an erect, though diminished, image, providing a wider field of view." 
    },
    { 
        questionText: "The SI unit of the power of a lens is:", 
        options: ["Meter", "Centimeter", "Diopter", "Watt"], 
        correctOptionIndex: 2, 
        explanation: "The SI unit of power of a lens is Diopter (D), which is the reciprocal of focal length expressed in meters." 
    },
    { 
        questionText: "What is the relationship between the radius of curvature (R) and focal length (f) of a spherical mirror?", 
        options: ["R = f/2", "R = 2f", "R = f", "R = 3f"], 
        correctOptionIndex: 1, 
        explanation: "For spherical mirrors of small apertures, the radius of curvature is twice the focal length (R = 2f)." 
    },
    { 
        questionText: "The bending of light when it passes from one medium to another is called:", 
        options: ["Reflection", "Dispersion", "Refraction", "Scattering"], 
        correctOptionIndex: 2, 
        explanation: "Refraction is the phenomenon of bending of light at the interface of two media when it travels from one medium to another." 
    },
    { 
        questionText: "Which of the following materials cannot be used to make a lens?", 
        options: ["Water", "Glass", "Plastic", "Clay"], 
        correctOptionIndex: 3, 
        explanation: "A lens must be transparent to allow light to pass through and refract. Clay is opaque." 
    },
    { 
        questionText: "The standard mirror formula is written as:", 
        options: ["1/v - 1/u = 1/f", "1/v + 1/u = 1/f", "v + u = f", "1/v + 1/u = f"], 
        correctOptionIndex: 1, 
        explanation: "The mirror formula relates image distance (v), object distance (u), and focal length (f) as 1/v + 1/u = 1/f." 
    },
    { 
        questionText: "The standard lens formula is written as:", 
        options: ["1/v - 1/u = 1/f", "1/v + 1/u = 1/f", "1/u - 1/v = 1/f", "v - u = f"], 
        correctOptionIndex: 0, 
        explanation: "The lens formula relates image distance (v), object distance (u), and focal length (f) as 1/v - 1/u = 1/f." 
    },

    // --- MEDIUM (11-20) ---
    { 
        questionText: "If the radius of curvature of a spherical mirror is 20 cm, what is its focal length?", 
        options: ["10 cm", "20 cm", "40 cm", "5 cm"], 
        correctOptionIndex: 0, 
        explanation: "f = R/2. Therefore, f = 20 / 2 = 10 cm." 
    },
    { 
        questionText: "A convex lens has a focal length of 50 cm. What is its power?", 
        options: ["+5 D", "-2 D", "+2 D", "-5 D"], 
        correctOptionIndex: 2, 
        explanation: "f = 50 cm = 0.5 m. Power (P) = 1/f(in meters) = 1/0.5 = +2 D. Power of a convex lens is positive." 
    },
    { 
        questionText: "The magnification produced by a plane mirror is +1. What does this signify?", 
        options: ["Image is smaller than object", "Image is real and inverted", "Image is virtual, erect, and of the same size", "Image is enlarged"], 
        correctOptionIndex: 2, 
        explanation: "m = +1 means the image is the same size as the object (1) and the positive sign indicates it is virtual and erect." 
    },
    { 
        questionText: "Where should an object be placed in front of a convex lens to get a real image of the size of the object?", 
        options: ["At the principal focus", "At twice the focal length (2F)", "At infinity", "Between optical center and focus"], 
        correctOptionIndex: 1, 
        explanation: "When an object is placed at 2F of a convex lens, the image formed is real, inverted, and of the exact same size as the object, located at 2F on the other side." 
    },
    { 
        questionText: "If the refractive index of water is 1.33 and glass is 1.52, light travels fastest in:", 
        options: ["Water", "Glass", "Same in both", "Cannot be determined"], 
        correctOptionIndex: 0, 
        explanation: "Speed of light in a medium is inversely proportional to its refractive index. Since water has a lower refractive index, light travels faster in it." 
    },
    { 
        questionText: "Snell's Law of refraction is mathematically expressed as:", 
        options: ["sin i / sin r = constant", "cos i / cos r = constant", "sin i * sin r = constant", "tan i / tan r = constant"], 
        correctOptionIndex: 0, 
        explanation: "Snell's law states that the ratio of the sine of the angle of incidence to the sine of the angle of refraction is a constant for a given pair of media." 
    },
    { 
        questionText: "The formula for linear magnification (m) of a spherical mirror is:", 
        options: ["m = v/u", "m = -v/u", "m = u/v", "m = -u/v"], 
        correctOptionIndex: 1, 
        explanation: "For mirrors, magnification m = height of image / height of object = -v/u." 
    },
    { 
        questionText: "A concave mirror produces a three times magnified real image of an object placed at 10 cm in front of it. Where is the image located?", 
        options: ["-30 cm", "30 cm", "-10 cm", "10 cm"], 
        correctOptionIndex: 0, 
        explanation: "Real image means m = -3. m = -v/u. -3 = -v/(-10). -v = 30 => v = -30 cm. Image is 30 cm in front of the mirror." 
    },
    { 
        questionText: "If two lenses of power +2.0 D and -1.5 D are placed in contact, their net power is:", 
        options: ["+3.5 D", "-3.5 D", "+0.5 D", "-0.5 D"], 
        correctOptionIndex: 2, 
        explanation: "Power of a combination of lenses is the algebraic sum of their individual powers. P = P1 + P2 = 2.0 + (-1.5) = +0.5 D." 
    },
    { 
        questionText: "Which phenomenon is responsible for a pencil appearing bent when partially immersed in water?", 
        options: ["Total internal reflection", "Refraction", "Dispersion", "Reflection"], 
        correctOptionIndex: 1, 
        explanation: "Refraction causes the light rays traveling from the submerged part of the pencil to bend as they exit the water, making the pencil look broken or bent." 
    },

    // --- HARD (21-25) ---
    { 
        questionText: "An object is placed 20 cm in front of a concave mirror of focal length 15 cm. The image distance (v) is:", 
        options: ["-60 cm", "60 cm", "-8.5 cm", "8.5 cm"], 
        correctOptionIndex: 0, 
        explanation: "By mirror formula: 1/v + 1/(-20) = 1/(-15). 1/v = 1/20 - 1/15 = (3 - 4)/60 = -1/60. v = -60 cm." 
    },
    { 
        questionText: "An object 5 cm in length is held 25 cm away from a converging lens of focal length 10 cm. Find the magnification.", 
        options: ["-0.66", "-1.5", "+0.66", "+1.5"], 
        correctOptionIndex: 0, 
        explanation: "Lens formula: 1/v - 1/(-25) = 1/10. 1/v = 1/10 - 1/25 = 3/50. v = 50/3 cm. Magnification m = v/u = (50/3) / (-25) = -2/3 = -0.66. Image is real and diminished." 
    },
    { 
        questionText: "The speed of light in a transparent medium is 1.2 x 10^8 m/s. The absolute refractive index of the medium is:", 
        options: ["1.5", "2.0", "2.5", "1.2"], 
        correctOptionIndex: 2, 
        explanation: "Refractive index (n) = Speed of light in vacuum (c) / Speed in medium (v). n = (3 x 10^8) / (1.2 x 10^8) = 30 / 12 = 2.5." 
    },
    { 
        questionText: "A concave lens has focal length of 15 cm. At what distance should the object from the lens be placed so that it forms an image at 10 cm from the lens?", 
        options: ["-30 cm", "30 cm", "-6 cm", "6 cm"], 
        correctOptionIndex: 0, 
        explanation: "For a concave lens, f = -15 cm, v = -10 cm (virtual image). 1/v - 1/u = 1/f => 1/(-10) - 1/u = 1/(-15). -1/u = 1/10 - 1/15 = 1/30. u = -30 cm." 
    },
    { 
        questionText: "Light enters from air to glass having refractive index 1.50. If the speed of light in vacuum is 3 x 10^8 m/s, how long will it take for light to cross a glass slab of thickness 2 cm?", 
        options: ["10^-10 s", "10^-8 s", "1.5 x 10^-10 s", "2 x 10^-8 s"], 
        correctOptionIndex: 0, 
        explanation: "Speed in glass (v) = c/n = (3 x 10^8) / 1.5 = 2 x 10^8 m/s. Thickness (d) = 2 cm = 0.02 m. Time = Distance/Speed = 0.02 / (2 x 10^8) = 1 x 10^-10 seconds." 
    }
];

const seedData = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is undefined!');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Create or find a "Current Affairs" quiz
        let quiz = await Quiz.findOne({ title: "Light - Reflection and Refraction" });
        
        if (!quiz) {
            quiz = new Quiz({
                title: "Light - Reflection and Refraction",
                category: "Academic",
                targetAudience: "Class 10",
                questions: 25,
                time: 30,
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
                classOrExam: "Class 10",
                subject: "Physics",
                chapter: "Light - Reflection and Refraction"
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
