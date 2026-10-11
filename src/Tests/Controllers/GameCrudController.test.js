import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import gameRoutes from '../../Presentation/Routes/GameRoutes.js';
import { gameService } from '../../container.js';
import Result from '../../Logic/Monads/result.js';

jest.mock('../../container.js', () => ({ gameEvents: { refreshState: jest.fn(), gameDeleted: jest.fn() }, gameService: {
    getAllGames: jest.fn(), getGameById: jest.fn(), deleteGame: jest.fn(), updateGame: jest.fn(),
} }));

const app = express();
app.use(express.json());
app.use('/api/games', gameRoutes);
app.use((err, req, res, next) => res.status(err.statusCode ?? 500).json({ error: err.message }));
const token = () => jwt.sign({ sub: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
beforeEach(() => jest.clearAllMocks());

test.each([
    ['/all', 'getAllGames', {}, { userId: 1 }, []],
    ['/by-id', 'getGameById', { game_id: 5 }, { userId: 1, gameId: 5 }, { gameId: 5 }],
    ['/delete', 'deleteGame', { game_id: 5 }, { userId: 1, gameId: 5 }, { message: 'Game deleted successfully', game_id: 5 }],
    ['/update', 'updateGame', { game_id: 5, updates: { state: 'pending' } },
        { userId: 1, gameId: 5, updates: { state: 'pending' } }, { message: 'Game updated successfully', game_id: 5 }],
])('POST %s uses the body token and ignores spoofed identity', async (path, method, payload, expected, response) => {
    gameService[method].mockResolvedValue(Result.Ok(response));
    const result = await request(app).post('/api/games' + path).send({ ...payload, access_token: token(), userId: 99, creatorId: 99 });
    expect(result.status).toBe(200);
    expect(result.body).toEqual(response);
    expect(gameService[method]).toHaveBeenCalledWith(expected);
});

test.each(['/all', '/by-id', '/delete', '/update'])('POST %s requires a valid JWT', async (path) => {
    for (const access_token of [undefined, 'invalid']) {
        const response = await request(app).post('/api/games' + path).send({ access_token, game_id: 5 });
        expect(response.status).toBe(401);
    }
    Object.values(gameService).forEach((method) => expect(method).not.toHaveBeenCalled());
});

test('returns validator status and message without wrapping errors in success responses', async () => {
    gameService.deleteGame.mockResolvedValue(Result.Err({ statusCode: 403, message: 'Only the creator can update or delete this game' }));
    const response = await request(app).post('/api/games/delete').send({ access_token: token(), game_id: 5 });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Only the creator can update or delete this game' });
});
