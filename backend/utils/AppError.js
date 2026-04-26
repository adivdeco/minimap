/**
 * Custom application error class for structured error handling.
 * Replaces the fragile "CODE: message" string prefix pattern.
 *
 * Usage:
 *   throw new AppError('Daily Quota Exceeded!', 403, 'LIMIT');
 *
 * Catch:
 *   if (err instanceof AppError) {
 *       return res.status(err.statusCode).json({ success: false, msg: err.message });
 *   }
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

module.exports = AppError;
