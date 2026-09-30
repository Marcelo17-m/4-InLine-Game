import { Router } from 'express';
import * as statsController from '../Controllers/StatsController.js';

const router = Router();

router.get('/requests', statsController.getRequestStats);
router.get('/response-times', statsController.getResponseTimeStats);
router.get('/status-codes', statsController.getStatusCodeStats);
router.get('/popular-endpoints', statsController.getPopularEndpointStats);

export default router;