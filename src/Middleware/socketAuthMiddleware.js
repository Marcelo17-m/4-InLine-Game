import jwt from 'jsonwebtoken';
import { isRevoked } from './tokenBlacklist.js';

const socketAuthMiddleware = (socket, next)=>{
    const token = socket.handshake.auth?.token;

    if (!token){
        return next(new Error('token is mandatory'));
    }

    if (isRevoked(token)){
        return next(new Error('This user has alredy logout'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { id: decoded.sub, username: decoded.username};
        socket.token = token;
        next();
    } catch (err) {
        next(new Error('Invalid or expired Token'));
    }
};

export default socketAuthMiddleware;