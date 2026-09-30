import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { isRevoked } from './tokenBlacklist.js';

const extractToken = (req) => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        return header.slice(7);
    }
    return req.body?.access_token || null;
};

const authMiddleware = (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return next(new AppError('token is mandatory', 401));
    }

    if (isRevoked(token)){
        return next(new AppError('This user has alredy logout', 401))
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {id: decoded.sub, username: decoded.username};
        req.token = token;
        next();
    } catch (err) {
        next(new AppError('Invalid or expired Token', 401));
    }
};

export default authMiddleware;