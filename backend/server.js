const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
// const compression = require('compression');
// Load env vars
dotenv.config();

const connectDB = require('./config/db');
const initScheduler = require('./scheduler');
const authRoutes = require('./routes/authRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const seatRoutes = require('./routes/seatRoutes');
const entryRoutes = require('./routes/entryRoutes');
const planRoutes = require('./routes/planRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const quizProgressRoutes = require('./routes/quizProgressRoutes');

// Connect to database
connectDB();

// Initialize Cron Jobs
initScheduler();

const app = express();
app.set("trust proxy", 1);

const { apiLimiter } = require('./middleware/rateLimiter');


// Middleware
app.use(helmet());
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    })
);
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        process.env.APP_URL,
        "https://studyspace-two.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));


// app.use(compression());
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('✅ JWT Server is running or server is live');
});

// Apply Rate Limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/entry', entryRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api', questionRoutes);
app.use('/api/quiz-progress', quizProgressRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
