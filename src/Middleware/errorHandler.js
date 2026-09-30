import logger from "../Helpers/logger.js";

class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    if(!err.isOperational){
        logger.error(err);
    } else {
        //the expected errors are (400, 404,
        // etc.) they are also label as warns
        logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
    }

    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: message
    })
};

export { AppError, errorHandler };