import { Router } from 'express';
import * as scoreController from '../Controllers/ScoreController.js';

const router = Router();

router.post('/', scoreController.create);
router.get('/', scoreController.getAll);
router.get('/:id', scoreController.getById);
router.put('/:id', scoreController.update);
router.delete('/:id', scoreController.deleteS);
 
export default router;