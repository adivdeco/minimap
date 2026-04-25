const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
dotenv.config({ path: path.join(__dirname, '../.env') });

// CBSE Class 10 Science - Real curriculum questions
const questions = [
    // Physics - Light: Reflection & Refraction
    { questionText: "A concave mirror produces a real, inverted and magnified image. The object must be placed:", options: ["Between pole and focus", "At the centre of curvature", "Between focus and centre of curvature", "Beyond centre of curvature"], correctOptionIndex: 2, explanation: "When an object is placed between F and C of a concave mirror, the image formed is real, inverted, and magnified." },
    { questionText: "The refractive index of glass with respect to air is 1.5. What is the refractive index of air with respect to glass?", options: ["1.5", "0.67", "3.0", "0.33"], correctOptionIndex: 1, explanation: "Refractive index of air w.r.t. glass = 1/1.5 = 0.67 (reciprocal relationship)." },
    { questionText: "Which of the following can make a parallel beam of light converge at a point?", options: ["Concave mirror and convex lens", "Convex mirror and concave lens", "Two plane mirrors at 90°", "Concave mirror and concave lens"], correctOptionIndex: 0, explanation: "Concave mirrors and convex lenses are converging optical devices." },
    { questionText: "The power of a lens is −2D. What is its focal length?", options: ["−50 cm", "−20 cm", "+50 cm", "+20 cm"], correctOptionIndex: 0, explanation: "P = 1/f (in metres). f = 1/(−2) = −0.5 m = −50 cm. Negative sign indicates a concave (diverging) lens." },
    { questionText: "Stars appear to twinkle at night because of:", options: ["Reflection of light", "Atmospheric refraction", "Total internal reflection", "Scattering of light"], correctOptionIndex: 1, explanation: "Twinkling is caused by atmospheric refraction due to varying density layers of the atmosphere." },
    // Physics - Electricity
    { questionText: "Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel. The equivalent resistance is:", options: ["1 Ω", "11 Ω", "0.5 Ω", "6 Ω"], correctOptionIndex: 0, explanation: "1/R = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1. So R = 1Ω." },
    { questionText: "An electric heater of resistance 44Ω is connected to a 220V supply. The current flowing through it is:", options: ["10 A", "5 A", "2.5 A", "20 A"], correctOptionIndex: 1, explanation: "Using Ohm's Law: I = V/R = 220/44 = 5 A." },
    { questionText: "The SI unit of electric charge is:", options: ["Ampere", "Volt", "Coulomb", "Ohm"], correctOptionIndex: 2, explanation: "The SI unit of electric charge is Coulomb (C). 1 Coulomb = charge carried by 6.25 × 10¹⁸ electrons." },
    // Chemistry - Chemical Reactions
    { questionText: "Which of the following is a double displacement reaction?", options: ["2Mg + O₂ → 2MgO", "Zn + CuSO₄ → ZnSO₄ + Cu", "Na₂SO₄ + BaCl₂ → BaSO₄ + 2NaCl", "2H₂O → 2H₂ + O₂"], correctOptionIndex: 2, explanation: "In Na₂SO₄ + BaCl₂ → BaSO₄ + 2NaCl, two compounds exchange their ions — a double displacement reaction." },
    { questionText: "What happens when dilute hydrochloric acid is added to iron filings?", options: ["Hydrogen gas and iron chloride are produced", "Chlorine gas and iron hydroxide are produced", "No reaction takes place", "Iron salt and water are produced"], correctOptionIndex: 0, explanation: "Fe + 2HCl → FeCl₂ + H₂↑. Iron displaces hydrogen from HCl." },
    { questionText: "Rancidity can be prevented by:", options: ["Adding water", "Adding antioxidants", "Heating the food", "Adding salt"], correctOptionIndex: 1, explanation: "Antioxidants prevent oxidation of fats and oils, thus preventing rancidity. BHA and BHT are common antioxidants." },
    // Chemistry - Acids, Bases & Salts
    { questionText: "The pH of a solution changes from 3 to 6, by how many times has the H⁺ ion concentration decreased?", options: ["3 times", "100 times", "1000 times", "10 times"], correctOptionIndex: 2, explanation: "Each unit change in pH = 10× change in H⁺ concentration. 3 units = 10³ = 1000 times decrease." },
    { questionText: "Plaster of Paris is chemically:", options: ["CaSO₄.2H₂O", "CaSO₄.½H₂O", "CaSO₄", "Ca(OH)₂"], correctOptionIndex: 1, explanation: "Plaster of Paris is calcium sulphate hemihydrate: CaSO₄.½H₂O. It is obtained by heating gypsum at 373 K." },
    // Biology - Life Processes
    { questionText: "Which of the following is the correct path of urine in our body?", options: ["Kidney → Ureter → Urethra → Urinary bladder", "Kidney → Urinary bladder → Urethra → Ureter", "Kidney → Ureter → Urinary bladder → Urethra", "Ureter → Kidney → Urinary bladder → Urethra"], correctOptionIndex: 2, explanation: "Urine flows: Kidney → Ureter → Urinary bladder (storage) → Urethra (excretion)." },
    { questionText: "The blood leaving the tissues becomes richer in:", options: ["Carbon dioxide", "Water", "Haemoglobin", "Oxygen"], correctOptionIndex: 0, explanation: "Tissues use O₂ for respiration and release CO₂ as a waste product, so blood leaving tissues is CO₂-rich (deoxygenated)." },
    { questionText: "In human alimentary canal, the correct sequence of organs is:", options: ["Mouth → Stomach → Small intestine → Oesophagus → Large intestine", "Mouth → Oesophagus → Stomach → Large intestine → Small intestine", "Mouth → Stomach → Oesophagus → Small intestine → Large intestine", "Mouth → Oesophagus → Stomach → Small intestine → Large intestine"], correctOptionIndex: 3, explanation: "The correct order is: Mouth → Oesophagus → Stomach → Small intestine → Large intestine." },
    { questionText: "The gap between two neurons is called:", options: ["Dendrite", "Synapse", "Axon", "Impulse"], correctOptionIndex: 1, explanation: "A synapse is the gap between two nerve cells across which nerve impulses are transmitted chemically." },
    // Biology - Heredity & Evolution
    { questionText: "If a round green-seeded pea plant (RRyy) is crossed with a wrinkled yellow-seeded pea plant (rrYY), the F1 offspring will be:", options: ["Round yellow (RrYy)", "Round green (Rryy)", "Wrinkled yellow (rrYy)", "Wrinkled green (rryy)"], correctOptionIndex: 0, explanation: "RRyy × rrYY → All F1 are RrYy (Round Yellow), since R and Y are dominant alleles." },
    { questionText: "The number of pairs of autosomes in a human being is:", options: ["22", "23", "44", "46"], correctOptionIndex: 0, explanation: "Humans have 23 pairs of chromosomes — 22 pairs are autosomes and 1 pair is sex chromosomes." },
    // Biology - Environment
    { questionText: "In a food chain, the 10% law of energy transfer was given by:", options: ["Stanley", "Lindeman", "Odum", "Mendel"], correctOptionIndex: 1, explanation: "Lindeman (1942) gave the 10% law — only 10% of energy is transferred to the next trophic level." },
    { questionText: "The depletion of ozone layer is mainly due to:", options: ["Carbon dioxide", "Chlorofluorocarbons (CFCs)", "Methane", "Nitrogen oxides"], correctOptionIndex: 1, explanation: "CFCs release chlorine atoms which catalytically destroy ozone molecules in the stratosphere." },
    // Physics - Magnetic Effects
    { questionText: "The direction of force on a current-carrying conductor in a magnetic field is given by:", options: ["Right hand thumb rule", "Fleming's left hand rule", "Fleming's right hand rule", "Lenz's law"], correctOptionIndex: 1, explanation: "Fleming's Left Hand Rule gives the direction of force on a current-carrying conductor placed in a magnetic field." },
    { questionText: "The device used to change the direction of current in the coil of an electric motor is:", options: ["Armature", "Split ring commutator", "Galvanometer", "Transformer"], correctOptionIndex: 1, explanation: "A split ring commutator reverses the direction of current every half rotation, enabling continuous rotation of the motor." },
    // Chemistry - Carbon & its Compounds
    { questionText: "Ethanoic acid has the molecular formula:", options: ["CH₃OH", "C₂H₅OH", "CH₃COOH", "HCOOH"], correctOptionIndex: 2, explanation: "Ethanoic acid (acetic acid) is CH₃COOH with 2 carbon atoms. It is the main component of vinegar." },
    { questionText: "Soaps are formed by the reaction of:", options: ["Acid and glycerol", "Fat/oil and sodium hydroxide", "Acid and alcohol", "Glycerol and sodium chloride"], correctOptionIndex: 1, explanation: "Soaps are sodium or potassium salts of long-chain fatty acids, made by saponification (fat/oil + NaOH)." }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const quiz = await Quiz.findOne({ title: "Science Full Mock Test" });
        if (!quiz) { console.log('Quiz not found!'); process.exit(1); }
        
        await Question.deleteMany({ quizId: quiz._id });
        const docs = questions.map(q => ({ ...q, quizId: quiz._id, tags: { chapter: "CBSE Class 10 Science" } }));
        const inserted = await Question.insertMany(docs);
        await Quiz.updateOne({ _id: quiz._id }, { $set: { questionList: inserted.map(q => q._id), questions: inserted.length } });
        console.log(`✅ Seeded ${inserted.length} Class 10 Science questions`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
seed();
