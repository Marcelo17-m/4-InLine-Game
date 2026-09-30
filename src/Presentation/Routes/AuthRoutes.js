import { Router } from 'express';
import * as authController from '../Controllers/AuthController.js';
import authMiddleware from '../../Middleware/authMiddleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/logout', authMiddleware, authController.logout);
router.post('/profile', authMiddleware, authController.profile);
router.delete('/users/:id', authMiddleware, authController.deleteUser);

export default router;

