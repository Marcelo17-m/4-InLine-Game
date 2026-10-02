import { Router } from 'express';
import gameRoutes from './GameRoutes.js';
import authRoutes from './AuthRoutes.js';
import statsRoutes from './StatsRoutes.js'

const router = Router();

router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/stats', statsRoutes);

export default router;
