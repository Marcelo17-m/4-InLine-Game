import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import sequelize from '../../Data Access/database.js';
import { User, Game, GamePlayer, History, Invitation } from '../../Data Access/Models/index.js';

// Keep the actual routes, authentication, container, validators and repositories.
// Request telemetry is unrelated to gameplay and writes after the response finishes.
jest.mock('../../Middleware/trackingMiddleware.js', () => ({
    trackingMiddleware: (req, res, next) => next(),
}));
jest.mock('../../Helpers/logger.js', () => ({
    __esModule: true, default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

let red, yellow, outsider;
const post = (path, user, body = {}) => request(app).post('/api/games' + path).send({
    access_token: jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    ...body,
});
const start = async () => {
    const created = await post('', red);
    expect(created.status).toBe(201);
    const game_id = created.body.game_id;
    expect((await post('/invitations', red, { game_id, opponent_id: yellow.id })).status).toBe(201);
    const accepted = await post('/invitations/respond', yellow, { game_id, accept: true });
    expect(accepted.status).toBe(201);
    expect(accepted.body).toEqual({ message: 'Invitation accepted successfully', status: 'ACCEPTED' });
    expect((await post('/by-id', red, { game_id })).body.state).toBe('pending');
    expect((await post('/start', red, { game_id })).status).toBe(200);
    return game_id;
};

beforeEach(async () => {
    await sequelize.sync({ force: true });
    [red, yellow, outsider] = await User.bulkCreate(['red', 'yellow', 'outsider'].map((username) => ({
        username, passwordHash: 'test-only-hash',
    })));
});
afterAll(() => sequelize.close());

test.each(['', '/all', '/by-id', '/update', '/delete', '/invitations', '/invitations/respond', '/start', '/make-move', '/leave'])(
    'POST /api/games%s requires authentication', async (path) => {
        const response = await request(app).post('/api/games' + path).send({});
        expect(response.status).toBe(401);
    },
);

test.each([
    ['red', [0, 1, 0, 1, 0, 1, 0]],
    ['yellow', [0, 1, 0, 1, 2, 1, 2, 1]],
])('invites, accepts, plays and returns the %s winner through HTTP', async (winnerName, columns) => {
    const game_id = await start();
    const initial = await post('/by-id', yellow, { game_id });
    expect(initial.status).toBe(200);
    expect(initial.body).toMatchObject({ gameId: game_id, state: 'in_progress', currentPlayerId: red.id });
    expect(initial.body.players).toHaveLength(2);
    const winner = winnerName === 'red' ? red : yellow;
    let response;
    for (let i = 0; i < columns.length; i++) {
        response = await post('/make-move', i % 2 ? yellow : red, { game_id, column: columns[i] });
        expect(response.status).toBe(200);
        if (i < columns.length - 1) {
            expect(response.body.state).toBe('in_progress');
            expect(response.body).not.toHaveProperty('winner');
        }
    }
    expect(response.body).toMatchObject({
        state: 'finished', winnerId: winner.id, currentPlayerId: null, finishReason: 'four_in_line',
        message: `${winnerName} won the game!`,
        winner: { userId: winner.id, username: winnerName, piece: winnerName === 'red' ? 'R' : 'Y' },
    });
    expect(JSON.stringify(response.body)).not.toContain('password');
    const persisted = await post('/by-id', red, { game_id });
    expect(persisted.body).toMatchObject({
        state: 'finished', winnerId: winner.id, board: response.body.board, finishReason: 'four_in_line',
    });
    expect(await History.count({ where: { gameId: game_id, eventType: 'move' } })).toBe(columns.length);
    expect((await post('/make-move', yellow, { game_id, column: 3 })).status).toBe(409);
});

test('rejects invalid moves without advancing play and lets either player abandon', async () => {
    const game_id = await start();
    expect((await post('/make-move', outsider, { game_id, column: 0 })).status).toBe(403);
    expect((await post('/make-move', yellow, { game_id, column: 0 })).status).toBe(403);
    expect((await post('/make-move', red, { game_id, column: '0' })).status).toBe(400);
    expect((await post('/make-move', red, { game_id, column: 7 })).status).toBe(400);
    for (let i = 0; i < 6; i++) {
        expect((await post('/make-move', i % 2 ? yellow : red, { game_id, column: 0 })).status).toBe(200);
    }
    expect((await post('/make-move', red, { game_id, column: 0 })).status).toBe(409);
    expect(await History.count({ where: { eventType: 'move' } })).toBe(6);
    const ended = await post('/leave', yellow, { game_id });
    expect(ended.status).toBe(200);
    expect(ended.body).toMatchObject({ state: 'finished', winnerId: red.id, finishReason: 'abandoned' });
});

test('a pending game blocks duplicate creation but allows inviting into the same game', async () => {
    const created = await post('', red);
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Game created successfully');
    const { game_id } = created.body;
    expect((await post('/make-move', red, { game_id, column: 0 })).status).toBe(409);
    expect((await post('', red)).status).toBe(409);
    expect((await post('/invitations', red, { opponent_id: yellow.id })).status).toBe(400);
    expect((await post('/invitations', red, { game_id, opponent_id: yellow.id })).status).toBe(201);
    expect(await Game.count()).toBe(1);
    expect((await post('', yellow)).status).toBe(409);
    expect((await post('/delete', yellow, { game_id })).status).toBe(403);
    expect((await post('/delete', red, { game_id })).status).toBe(200);
    expect(await Game.findByPk(game_id)).toBeNull();
    expect(await GamePlayer.count()).toBe(0);
    expect(await start()).toBeGreaterThan(game_id);
});

test('rejects invitations, lists games, applies creator administration and cascades deletion', async () => {
    const created = await post('', red);
    const game_id = created.body.game_id;
    expect((await post('/invitations', red, { game_id, opponent_id: yellow.id })).status).toBe(201);
    expect((await post('/invitations/respond', outsider, { game_id, accept: true })).status).toBe(404);
    expect((await post('/invitations/respond', yellow, { game_id, accept: 'true' })).status).toBe(400);
    const rejected = await post('/invitations/respond', yellow, { game_id, accept: false });
    expect(rejected.status).toBe(201);
    expect(rejected.body.status).toBe('REJECTED');
    const listed = await post('/all', red);
    expect(listed.status).toBe(200);
    expect(listed.body).toEqual([expect.objectContaining({ gameId: game_id, state: 'pending' })]);
    expect((await post('/invitations', red, { game_id, opponent_id: outsider.id })).status).toBe(201);
    expect((await post('/invitations/respond', outsider, { game_id, accept: true })).status).toBe(201);
    const activeId = game_id;
    const updates = { state: 'finished', currentPlayerId: null, winnerId: red.id, finishReason: 'abandoned' };
    expect((await post('/update', yellow, { game_id: activeId, updates })).status).toBe(403);
    expect((await post('/update', red, { game_id: activeId, updates })).status).toBe(200);
    expect((await post('/by-id', red, { game_id: activeId })).body).toMatchObject(updates);
    expect((await post('/delete', red, { game_id: activeId })).status).toBe(200);
    expect((await post('/by-id', red, { game_id: activeId })).status).toBe(404);
    expect(await Invitation.count({ where: { gameId: activeId } })).toBe(0);
    expect(await GamePlayer.count({ where: { gameId: activeId } })).toBe(0);
});
