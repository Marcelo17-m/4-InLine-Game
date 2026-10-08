import { Router } from 'express';
import * as gameController from '../Controllers/GameController.js';
import authMiddleware from '../../Middleware/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, gameController.create);
router.post('/make-move', authMiddleware, gameController.makeMove);
router.post('/leave', authMiddleware, gameController.leave);

export default router;
