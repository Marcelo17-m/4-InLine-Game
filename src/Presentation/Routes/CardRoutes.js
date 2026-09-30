import { Router } from 'express';
import * as cardController from '../Controllers/CardController.js';

const router = Router();

router.post('/', cardController.create);
router.get('/', cardController.getAll);
router.get('/:id', cardController.getById);
router.put('/:id', cardController.update);
router.delete('/:id', cardController.deleteC);
 
export default router;