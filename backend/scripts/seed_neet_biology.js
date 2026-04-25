const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Quiz = require('../models/Quiz');
const Question = require('../models/Questions');
dotenv.config({ path: path.join(__dirname, '../.env') });

// NEET Biology - Real NCERT-based questions (Class 11 + 12 Biology)
const questions = [
    // Cell Biology
    { questionText: "The enzyme responsible for unwinding of DNA during replication is:", options: ["DNA ligase", "DNA polymerase", "Helicase", "Primase"], correctOptionIndex: 2, explanation: "Helicase unwinds the double helix by breaking hydrogen bonds between complementary base pairs." },
    { questionText: "In which phase of the cell cycle does DNA replication occur?", options: ["G1 phase", "S phase", "G2 phase", "M phase"], correctOptionIndex: 1, explanation: "S (Synthesis) phase is when DNA replication occurs, doubling the DNA content from 2C to 4C." },
    { questionText: "The Golgi apparatus is principally involved in:", options: ["Cell division", "Respiration", "Modification and packaging of proteins", "Photosynthesis"], correctOptionIndex: 2, explanation: "Golgi apparatus modifies, sorts, and packages proteins and lipids for secretion or intracellular use." },
    // Genetics
    { questionText: "A cross between a homozygous tall (TT) and dwarf (tt) pea plant produces offspring in F2 generation in the ratio:", options: ["1:1", "1:2:1", "3:1", "1:3"], correctOptionIndex: 2, explanation: "F1 = all Tt (tall). F2 = TT:Tt:tt = 1:2:1 phenotypically → 3 tall : 1 dwarf." },
    { questionText: "Linked genes are located on:", options: ["Different chromosomes", "Same chromosome", "Sex chromosomes only", "Autosomes only"], correctOptionIndex: 1, explanation: "Linked genes are present on the same chromosome and tend to be inherited together." },
    { questionText: "The number of hydrogen bonds between Guanine and Cytosine is:", options: ["1", "2", "3", "4"], correctOptionIndex: 2, explanation: "G≡C has 3 hydrogen bonds, while A=T has 2 hydrogen bonds. This makes G-C pairs more stable." },
    // Plant Physiology
    { questionText: "The C4 pathway was first described in:", options: ["Wheat", "Sugarcane", "Rice", "Tomato"], correctOptionIndex: 1, explanation: "The C4 pathway (Hatch-Slack pathway) was first described in sugarcane by Hatch and Slack in 1966." },
    { questionText: "Transpiration pull is based on:", options: ["Root pressure", "Cohesion-tension theory", "Osmosis", "Active transport"], correctOptionIndex: 1, explanation: "Dixon and Joly's Cohesion-Tension theory explains transpiration pull — water molecules cohere and are pulled up by evaporation." },
    { questionText: "Which plant hormone is responsible for apical dominance?", options: ["Gibberellin", "Cytokinin", "Auxin", "Ethylene"], correctOptionIndex: 2, explanation: "Auxin produced at the apical bud inhibits the growth of lateral buds (apical dominance)." },
    // Human Physiology
    { questionText: "The pacemaker of the heart is:", options: ["AV node", "SA node", "Bundle of His", "Purkinje fibres"], correctOptionIndex: 1, explanation: "SA node (Sinoatrial node) generates electrical impulses that set the rhythm of the heart — hence called the pacemaker." },
    { questionText: "The functional unit of the kidney is:", options: ["Neuron", "Nephron", "Glomerulus", "Bowman's capsule"], correctOptionIndex: 1, explanation: "Nephron is the structural and functional unit of the kidney. Each kidney has approximately 1 million nephrons." },
    { questionText: "Oxytocin is secreted by:", options: ["Anterior pituitary", "Posterior pituitary", "Adrenal cortex", "Thyroid gland"], correctOptionIndex: 1, explanation: "Oxytocin is produced in the hypothalamus and released by the posterior pituitary. It stimulates uterine contractions." },
    { questionText: "The longest bone in the human body is:", options: ["Tibia", "Humerus", "Femur", "Fibula"], correctOptionIndex: 2, explanation: "Femur (thigh bone) is the longest, strongest, and heaviest bone in the human body." },
    { questionText: "Which blood group is called the universal donor?", options: ["A", "B", "AB", "O"], correctOptionIndex: 3, explanation: "Blood group O has no A or B antigens on RBCs, so it can be donated to all ABO blood groups." },
    // Ecology
    { questionText: "The pyramid of energy in an ecosystem is always:", options: ["Upright", "Inverted", "Spindle-shaped", "Variable"], correctOptionIndex: 0, explanation: "Pyramid of energy is always upright because energy decreases at each successive trophic level (2nd law of thermodynamics)." },
    { questionText: "The term 'ecosystem' was coined by:", options: ["Odum", "Tansley", "Haeckel", "Warming"], correctOptionIndex: 1, explanation: "A.G. Tansley coined the term 'ecosystem' in 1935." },
    { questionText: "Which biogeochemical cycle does not have a gaseous phase?", options: ["Nitrogen", "Carbon", "Phosphorus", "Sulphur"], correctOptionIndex: 2, explanation: "The phosphorus cycle is a sedimentary cycle — it has no gaseous phase and cycles mainly through soil and water." },
    // Evolution
    { questionText: "Analogous organs indicate:", options: ["Common ancestry", "Convergent evolution", "Divergent evolution", "Adaptive radiation"], correctOptionIndex: 1, explanation: "Analogous organs (similar function, different origin) indicate convergent evolution — unrelated species evolving similar traits." },
    { questionText: "The theory of natural selection was proposed by:", options: ["Lamarck", "Mendel", "Darwin", "Hugo de Vries"], correctOptionIndex: 2, explanation: "Charles Darwin proposed the theory of evolution by natural selection in 'On the Origin of Species' (1859)." },
    // Molecular Biology
    { questionText: "The central dogma of molecular biology is:", options: ["DNA → RNA → Protein", "RNA → DNA → Protein", "Protein → RNA → DNA", "DNA → Protein → RNA"], correctOptionIndex: 0, explanation: "Central dogma: DNA → (transcription) → RNA → (translation) → Protein, proposed by Francis Crick." },
    { questionText: "Restriction enzymes are used to cut:", options: ["RNA", "Protein", "DNA at specific sites", "Lipids"], correctOptionIndex: 2, explanation: "Restriction endonucleases cut DNA at specific palindromic recognition sequences. They are molecular scissors of genetic engineering." },
    { questionText: "The Okazaki fragments are formed during:", options: ["Transcription", "Translation", "DNA replication on lagging strand", "Reverse transcription"], correctOptionIndex: 2, explanation: "Okazaki fragments are short DNA sequences (100-200 bp) formed on the lagging strand during discontinuous replication." },
    // Reproduction
    { questionText: "The site of fertilization in humans is:", options: ["Uterus", "Ovary", "Ampullary-isthmic junction of fallopian tube", "Cervix"], correctOptionIndex: 2, explanation: "Fertilization typically occurs in the ampullary-isthmic junction (ampulla) of the fallopian tube." },
    { questionText: "Double fertilization is unique to:", options: ["Gymnosperms", "Angiosperms", "Bryophytes", "Pteridophytes"], correctOptionIndex: 1, explanation: "Double fertilization (one sperm + egg = zygote; other sperm + 2 polar nuclei = endosperm) is unique to angiosperms." },
    { questionText: "The process of formation of spermatozoa from spermatogonia is called:", options: ["Oogenesis", "Spermatogenesis", "Spermiogenesis", "Spermiation"], correctOptionIndex: 1, explanation: "Spermatogenesis is the complete process from spermatogonia to spermatozoa. Spermiogenesis is only the final transformation stage." }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const quiz = await Quiz.findOne({ title: "NEET Complete Biology" });
        if (!quiz) { console.log('Quiz not found!'); process.exit(1); }

        await Question.deleteMany({ quizId: quiz._id });
        const docs = questions.map(q => ({ ...q, quizId: quiz._id, tags: { chapter: "NEET Biology" } }));
        const inserted = await Question.insertMany(docs);
        await Quiz.updateOne({ _id: quiz._id }, { $set: { questionList: inserted.map(q => q._id), questions: inserted.length } });
        console.log(`✅ Seeded ${inserted.length} NEET Biology questions`);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
seed();
