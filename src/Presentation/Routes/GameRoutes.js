import { Router } from 'express';
import * as gameController from '../Controllers/GameController.js';
import authMiddleware from '../../Middleware/authMiddleware.js';
import {createMemoizationMiddleware} from '../../Middleware/memoizationMiddleware.js';

//TTL corto evita la stale data y es para cosas que son frecuentes.
const liveGameCache = createMemoizationMiddleware({max:100, maxAge:5000});
//so this thing right here was failing the jmeter test, so I made a new cache with a minimal ttl because now its not breaking
//the program
const instaGameCache = createMemoizationMiddleware({max:100, maxAge:200});
// TTL más largo: listar/ver partidas cambia con menos frecuencia
const gameListCache = createMemoizationMiddleware({max:30, maxAge: 30000});

const router = Router();

router.post('/', authMiddleware, gameController.create);
router.get('/', authMiddleware, gameListCache, gameController.getAll);
router.get('/:id', authMiddleware, gameListCache, gameController.getById);
router.put('/:id', authMiddleware, gameController.update);
router.delete('/:id', authMiddleware, gameController.deleteG);

router.post('/join', authMiddleware, gameController.join);
router.post('/start', authMiddleware, gameController.start);
router.post('/leave', authMiddleware, gameController.leave);
router.post('/end', authMiddleware, gameController.end);

router.post('/state', authMiddleware, instaGameCache, gameController.getState);//failst the jmeter for the cache
router.post('/players', authMiddleware, liveGameCache, gameController.getPlayers);
router.post('/current-player', authMiddleware, instaGameCache, gameController.getCurrentPlayer);
router.post('/top-card', authMiddleware, liveGameCache, gameController.getTopCard);
router.post('/scores', authMiddleware, liveGameCache, gameController.getScores);

router.post('/play-card', authMiddleware, gameController.playCard);
router.post('/draw-card', authMiddleware, gameController.drawCard);
router.post('/say-uno', authMiddleware, gameController.sayUno);
router.post('/catch-uno', authMiddleware, gameController.catchUno);
router.post('/hand', authMiddleware, liveGameCache, gameController.getOwnHand);
router.post('/history', authMiddleware, liveGameCache, gameController.getHistory);
router.post('/state-detail', authMiddleware, liveGameCache, gameController.getStateDetail);
router.post('/suggest-card', authMiddleware, gameController.suggestPlayableCard);
 
export default router;
