import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import gameRoutes from '../../Presentation/Routes/GameRoutes.js';
import { gameService } from '../../container.js';
import Result from '../../Logic/Monads/result.js';
import { revoke } from '../../Middleware/tokenBlacklist.js';
import { createEmptyBoard } from '../../Helpers/connectFourRules.js';

jest.mock('../../container.js', () => ({
    gameService: {
        createGame: jest.fn(), createInvitation: jest.fn(), respondInvitation: jest.fn(), makeMove: jest.fn(), leaveGame: jest.fn(),
    },
}));

const app = express();
app.use(express.json());
app.use('/api/games', gameRoutes);
app.use((err, req, res, next) => res.status(err.statusCode ?? 500).json({ error: err.message }));
let serial = 0;
const tokenFor = (expiresIn = '1h') => jwt.sign({ sub: 1, jti: String(++serial) }, process.env.JWT_SECRET, { expiresIn });
const state = {
    gameId: 5, state: 'in_progress', board: createEmptyBoard(), currentPlayerId: 2,
    winnerId: null, finishReason: null,
    players: [{ userId: 1, invitationStatus: 'accepted' }, { userId: 2, invitationStatus: 'accepted' }],
};
beforeEach(() => jest.clearAllMocks());

describe.each([
    ['/', 'createGame'],
    ['/make-move', 'makeMove'],
    ['/leave', 'leaveGame'],
])('%s body authentication', (path, method) => {
    test.each(['missing', 'invalid', 'expired', 'revoked'])('rejects a %s body JWT before the service', async (kind) => {
        const token = kind === 'invalid' ? 'not-a-token' : tokenFor(kind === 'expired' ? -1 : '1h');
        if (kind === 'revoked') revoke(token);
        const response = await request(app).post('/api/games' + path).send({
            game_id: 5, column: 0, access_token: kind === 'missing' ? undefined : token,
        });
        expect(response.status).toBe(401);
        expect(gameService[method]).not.toHaveBeenCalled();
    });
});

test.each([
    ['/make-move', 'makeMove', { game_id: 5, column: 6 }, { gameId: 5, userId: 1, column: 6 }],
    ['/leave', 'leaveGame', { game_id: 5 }, { gameId: 5, userId: 1 }],
])('POST %s uses body game_id and the identity from the body JWT', async (path, method, body, args) => {
    gameService[method].mockResolvedValue(Result.Ok(state));
    const response = await request(app).post('/api/games' + path).send({
        ...body, access_token: tokenFor(), userId: 99, creatorId: 99, board: [[99]], winnerId: 99,
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(state);
    expect(gameService[method]).toHaveBeenCalledWith(args);
});

test('POST / creates a game using only the identity from the body token', async () => {
    const pending = { ...state, state: 'pending', currentPlayerId: null, creatorId: 1 };
    gameService.createGame.mockResolvedValue(Result.Ok(pending));
    const response = await request(app).post('/api/games').send({
        access_token: tokenFor(), creatorId: 99, creator_id: 99, userId: 99,
        state: 'in_progress', board: [[99]], winnerId: 99,
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Game created successfully', game_id: pending.gameId });
    expect(gameService.createGame).toHaveBeenCalledWith({ creatorId: 1 });
});

test('POST / returns creation validation errors using the existing error shape', async () => {
    gameService.createGame.mockResolvedValue(Result.Err({ statusCode: 404, message: 'Creator not found' }));
    const response = await request(app).post('/api/games').send({ access_token: tokenFor() });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Creator not found' });
});

test('returns the existing validation error shape and propagates persistence failures', async () => {
    gameService.makeMove.mockResolvedValueOnce(Result.Err({ statusCode: 409, message: 'Column is full' }));
    const first = await request(app).post('/api/games/make-move').send({
        game_id: 5, column: 0, access_token: tokenFor(),
    });
    expect(first.status).toBe(409);
    expect(first.body).toEqual({ error: 'Column is full' });

    gameService.makeMove.mockRejectedValueOnce(new Error('Database write failed'));
    const second = await request(app).post('/api/games/make-move').send({
        game_id: 5, column: 0, access_token: tokenFor(),
    });
    expect(second.status).toBe(500);
});

test('POST /leave returns the final game state', async () => {
    const ended = { ...state, state: 'finished', finishReason: 'abandoned', winnerId: 2, currentPlayerId: null };
    gameService.leaveGame.mockResolvedValue(Result.Ok(ended));
    const response = await request(app).post('/api/games/leave').send({
        game_id: 5, access_token: tokenFor(),
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(ended);
});

test('POST /invitations creates an invitation using the authenticated creator', async () => {
    const invitation = { gameId: 31, opponentId: 2, creator: { id: 1, username: 'alice' } };
    gameService.createInvitation.mockResolvedValue(Result.Ok(invitation));

    const response = await request(app).post('/api/games/invitations').send({
        opponent_id: 2, creator_id: 99, access_token: tokenFor(),
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(invitation);
    expect(gameService.createInvitation).toHaveBeenCalledWith({ creatorId: 1, opponentId: 2 });
});

test('POST /invitations/respond uses authenticated recipient and requested decision', async () => {
    const stateAfterAccept = { ...state, gameId: 31, state: 'in_progress' };
    gameService.respondInvitation.mockResolvedValue(Result.Ok(stateAfterAccept));

    const response = await request(app).post('/api/games/invitations/respond').send({
        game_id: 31, accept: true, user_id: 99, access_token: tokenFor(),
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(stateAfterAccept);
    expect(gameService.respondInvitation).toHaveBeenCalledWith({ gameId: 31, userId: 1, accept: true });
});

test.each(['/5/moves', '/5/leave', '/play-card', '/draw-card'])(
    'removed route %s does not call the service', async (path) => {
        const response = await request(app).post('/api/games' + path).send({
            game_id: 5, access_token: tokenFor(),
        });
        expect(response.status).toBe(404);
        Object.values(gameService).forEach((method) => expect(method).not.toHaveBeenCalled());
    }
);
