import winston from 'winston';
import path from 'path';
import fs from 'fs';

//we tell him where to write it
const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

// If you pass an Error (not a string), "errors({ stack: true })" makes
// "stack" populated with the complete stack trace -- that's why the
// format uses "stack || message": if there's a stack, we show the complete one;
// otherwise, the normal message.
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        //only real errors are at error.log
        new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
        // everything that is logged (info, warn, error) its in combined.log
        new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
    ],
});

// In the console with colors this only makes sense during development;
// in production, you usually read from files or an external service.
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
        })
    );
}

export default logger;