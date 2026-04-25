const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
dotenv.config({ path: path.join(__dirname, '../.env') });

// IIT JEE level Organic Chemistry - Class 12 level
const questions = [
    { questionText: "The IUPAC name of CH₃−CH=CH−CHO is:", options: ["But-2-enal", "But-3-enal", "2-Butenal", "Crotonaldehyde"], correctOptionIndex: 0, explanation: "The longest chain has 4 carbons with an aldehyde and a double bond. Numbering starts from −CHO: But-2-enal." },
    { questionText: "Which of the following will undergo SN1 reaction most easily?", options: ["CH₃Cl", "(CH₃)₃CCl", "CH₃CH₂Cl", "(CH₃)₂CHCl"], correctOptionIndex: 1, explanation: "SN1 favors 3° carbocation stability. (CH₃)₃CCl forms the most stable tertiary carbocation." },
    { questionText: "Markownikoff's rule is applicable to:", options: ["Symmetrical alkenes", "Unsymmetrical alkenes", "Alkynes only", "Aromatic compounds"], correctOptionIndex: 1, explanation: "Markownikoff's rule states that in HX addition to unsymmetrical alkenes, H goes to the carbon with more H atoms." },
    { questionText: "The number of structural isomers of C₄H₁₀O that are alcohols is:", options: ["2", "3", "4", "5"], correctOptionIndex: 2, explanation: "1-Butanol, 2-Butanol, 2-Methyl-1-propanol, 2-Methyl-2-propanol = 4 alcohols." },
    { questionText: "Which reagent is used for Clemmensen reduction?", options: ["Zn-Hg/conc. HCl", "Na(Hg)/ethanol", "LiAlH₄", "Ni/H₂"], correctOptionIndex: 0, explanation: "Clemmensen reduction uses Zn-Hg amalgam with conc. HCl to reduce C=O to CH₂." },
    { questionText: "The reaction of phenol with bromine water gives:", options: ["o-Bromophenol", "p-Bromophenol", "2,4,6-Tribromophenol", "Bromobenzene"], correctOptionIndex: 2, explanation: "−OH is a strong activating group. Bromine water gives 2,4,6-tribromophenol (white precipitate)." },
    { questionText: "Ethanol can be converted into ethanoic acid by oxidation with:", options: ["KMnO₄", "K₂Cr₂O₇/H⁺", "Both (1) and (2)", "H₂/Pd"], correctOptionIndex: 2, explanation: "Both alkaline KMnO₄ and acidified K₂Cr₂O₇ can oxidize ethanol to ethanoic acid." },
    { questionText: "Which of the following gives iodoform test?", options: ["Methanol", "Acetaldehyde", "Diethyl ketone", "Formic acid"], correctOptionIndex: 1, explanation: "Acetaldehyde (CH₃CHO) has the CH₃CO− group required for iodoform test." },
    { questionText: "The order of reactivity of alkyl halides in SN2 mechanism is:", options: ["Primary > Secondary > Tertiary", "Tertiary > Secondary > Primary", "Secondary > Primary > Tertiary", "All are equal"], correctOptionIndex: 0, explanation: "SN2 favors less steric hindrance. Primary halides react fastest, tertiary slowest." },
    { questionText: "Wurtz reaction is used to prepare:", options: ["Alkenes", "Higher alkanes", "Alkynes", "Aldehydes"], correctOptionIndex: 1, explanation: "Wurtz reaction: 2R−X + 2Na → R−R + 2NaX. Two alkyl halides couple to form a higher alkane." },
    { questionText: "The most stable carbocation among the following is:", options: ["CH₃⁺", "(CH₃)₂CH⁺", "(CH₃)₃C⁺", "C₂H₅⁺"], correctOptionIndex: 2, explanation: "Tertiary carbocation (CH₃)₃C⁺ is most stable due to hyperconjugation and +I effect of three methyl groups." },
    { questionText: "Benzene reacts with CH₃Cl in presence of anhydrous AlCl₃ to give toluene. This reaction is:", options: ["Wurtz reaction", "Friedel-Crafts alkylation", "Kolbe reaction", "Sandmeyer reaction"], correctOptionIndex: 1, explanation: "Friedel-Crafts alkylation introduces an alkyl group on benzene ring using AlCl₃ as Lewis acid catalyst." },
    { questionText: "Which of the following is the strongest acid?", options: ["CH₃COOH", "ClCH₂COOH", "FCH₂COOH", "BrCH₂COOH"], correctOptionIndex: 2, explanation: "F is most electronegative, strongest −I effect stabilizes the conjugate base. FCH₂COOH is the strongest acid." },
    { questionText: "Grignard reagent (RMgX) reacts with formaldehyde to give:", options: ["Primary alcohol", "Secondary alcohol", "Tertiary alcohol", "Ketone"], correctOptionIndex: 0, explanation: "RMgX + HCHO → RCH₂OMgX → RCH₂OH (primary alcohol) after hydrolysis." },
    { questionText: "The hybridization of carbon atoms in ethene (C₂H₄) is:", options: ["sp", "sp²", "sp³", "dsp²"], correctOptionIndex: 1, explanation: "In ethene, each carbon forms 1 C=C bond (σ+π) and 2 C−H bonds. This requires sp² hybridization (3 σ, 1 π)." },
    { questionText: "Cannizzaro reaction is given by:", options: ["Acetaldehyde", "Formaldehyde", "Acetone", "Ethanol"], correctOptionIndex: 1, explanation: "Cannizzaro reaction is given by aldehydes without α-hydrogen. HCHO → CH₃OH + HCOONa." },
    { questionText: "The product formed when phenol reacts with CHCl₃ and NaOH is:", options: ["Salicylic acid", "Salicylaldehyde", "Anisole", "Aspirin"], correctOptionIndex: 1, explanation: "Reimer-Tiemann reaction: Phenol + CHCl₃ + NaOH → Salicylaldehyde (o-Hydroxybenzaldehyde)." },
    { questionText: "Dehydration of ethanol at 443 K with conc. H₂SO₄ gives:", options: ["Ethene", "Ethoxyethane", "Ethyne", "Acetaldehyde"], correctOptionIndex: 0, explanation: "At 443 K (170°C), intramolecular dehydration occurs: C₂H₅OH → CH₂=CH₂ + H₂O." },
    { questionText: "Lucas test is used to distinguish between:", options: ["Aldehydes and ketones", "Primary, secondary and tertiary alcohols", "Alkenes and alkynes", "Acids and esters"], correctOptionIndex: 1, explanation: "Lucas reagent (conc. HCl + ZnCl₂): 3° gives instant turbidity, 2° in 5 min, 1° only on heating." },
    { questionText: "Which of the following compounds shows optical isomerism?", options: ["2-Butanol", "1-Propanol", "2-Propanol", "Methanol"], correctOptionIndex: 0, explanation: "2-Butanol has a chiral carbon (C*H(OH)(CH₃)(C₂H₅)) with 4 different groups, showing optical isomerism." },
    { questionText: "In Kolbe's electrolysis, the product formed at the anode from CH₃COONa is:", options: ["Methane", "Ethane", "Ethanol", "Acetic acid"], correctOptionIndex: 1, explanation: "At anode: 2CH₃COO⁻ → CH₃−CH₃ + 2CO₂ + 2e⁻. Ethane is formed by coupling of methyl radicals." },
    { questionText: "The correct order of boiling points is:", options: ["Butanol > Butanal > Butane", "Butane > Butanal > Butanol", "Butanal > Butanol > Butane", "Butanol > Butane > Butanal"], correctOptionIndex: 0, explanation: "Butanol has H-bonding (highest bp), Butanal has dipole-dipole, Butane has only van der Waals forces." },
    { questionText: "Anti-Markownikoff addition of HBr is called:", options: ["Kharasch effect", "Inductive effect", "Mesomeric effect", "Hyperconjugation"], correctOptionIndex: 0, explanation: "Anti-Markownikoff or Kharasch effect (peroxide effect): In presence of peroxides, HBr adds in anti-Markownikoff manner." },
    { questionText: "Tollen's reagent is:", options: ["Ammoniacal AgNO₃", "Ammoniacal CuSO₄", "Fehling's solution", "Lucas reagent"], correctOptionIndex: 0, explanation: "Tollen's reagent is ammoniacal silver nitrate [Ag(NH₃)₂]⁺. It gives silver mirror with aldehydes." },
    { questionText: "Which of the following compounds is aromatic?", options: ["Cyclopentadienyl anion", "Cyclooctatetraene", "Cyclopropane", "1,3-Butadiene"], correctOptionIndex: 0, explanation: "Cyclopentadienyl anion (C₅H₅⁻) has 6 π-electrons (4n+2, n=1), planar, cyclic, conjugated — aromatic by Hückel's rule." }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const quiz = await Quiz.findOne({ title: "Chemistry: Organics" });
        if (!quiz) { console.log('Quiz not found!'); process.exit(1); }

        await Question.deleteMany({ quizId: quiz._id });
        const docs = questions.map(q => ({ ...q, quizId: quiz._id, tags: { chapter: "Organic Chemistry JEE" } }));
        const inserted = await Question.insertMany(docs);
        await Quiz.updateOne({ _id: quiz._id }, { $set: { questionList: inserted.map(q => q._id), questions: inserted.length } });
        console.log(`✅ Seeded ${inserted.length} Organic Chemistry questions`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
seed();
