
try {
    console.log("Attempting to require middleware...");
    const authMiddleware = require('./middleware/authMiddleware');
    console.log("Middleware loaded successfully:", authMiddleware);
} catch (error) {
    console.error("Failed to load middleware:", error);
}
