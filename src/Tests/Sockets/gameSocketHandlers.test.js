import http from 'http';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import sequelize from '../../Data Access/database.js';
import { User, Game, History } from '../../Data Access/Models/index.js';
import { gameService, gameEvents } from '../../container.js';
import { registerGameSocketHandlers } from '../../Presentation/Sockets/gameSocketHandlers.js';
import socketAuthMiddleware from '../../Middleware/socketAuthMiddleware.js';
import { revoke } from '../../Middleware/tokenBlacklist.js';

jest.mock('../../Middleware/trackingMiddleware.js', () => ({ trackingMiddleware: (req, res, next) => next() }));
jest.mock('../../Helpers/logger.js', () => ({
    __esModule: true, default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

let server, io, url, users, clients, serial = 0;
const token = (user, expiresIn = '1h') => jwt.sign(
    { sub: user.id, username: user.username, jti: String(++serial) }, process.env.JWT_SECRET, { expiresIn },
);
const waitEvent = (socket, name) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, receive); reject(new Error('Timed out: ' + name)); }, 2500);
    const receive = (data) => { clearTimeout(timer); socket.off(name, receive); resolve(data); };
    socket.on(name, receive);
});
const command = (socket, name, body = {}) => new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); socket.off(name, success); socket.off('error', failure); };
    const success = (data) => { cleanup(); resolve(data); };
    const failure = (error) => { if (error.event === name) { cleanup(); reject(error); } };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Timed out: ' + name)); }, 2500);
    socket.on(name, success);
    socket.on('error', failure);
    socket.emit(name, body);
});
const open = async (user) => {
    const client = connect(url, { autoConnect: false, auth: { token: token(user) }, transports: ['websocket'], reconnection: false });
    clients.push(client);
    const connected = waitEvent(client, 'connect');
    client.connect();
    await connected;
    return client;
};
const start = async (a, b) => {
    const { game_id } = await command(a, 'game:create');
    const invited = waitEvent(b, 'game:invitation');
    const invitation = await command(a, 'game:invite', { game_id, opponent_id: users[1].id });
    expect(await invited).toEqual(invitation);
    const lobbyStates = Promise.all([waitEvent(a, 'game:state'), waitEvent(b, 'game:state')]);
    expect(await command(b, 'game:invitation:respond', { game_id: invitation.gameId, accept: true }))
        .toEqual({ message: 'Invitation accepted successfully', status: 'ACCEPTED' });
    for (const state of await lobbyStates) expect(state.state).toBe('pending');
    const states = Promise.all([waitEvent(a, 'game:state'), waitEvent(b, 'game:state')]);
    await command(a, 'game:start', { game_id });
    const [first, second] = await states;
    expect(first).toEqual(second);
    expect(first).toMatchObject({ state: 'in_progress', currentPlayerId: users[0].id });
    return invitation.gameId;
};
const post = (path, user, body = {}) => request(server).post('/api/games' + path).send({ access_token: token(user), ...body });

beforeEach(async () => {
    await sequelize.sync({ force: true });
    users = await User.bulkCreate(['alice', 'bob', 'outsider'].map((username) => ({ username, passwordHash: 'test-hash' })));
    clients = [];
    server = http.createServer(app);
    io = new Server(server);
    io.use(socketAuthMiddleware);
    registerGameSocketHandlers(io);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = 'http://127.0.0.1:' + server.address().port;
});
afterEach(async () => {
    jest.restoreAllMocks();
    clients.forEach((client) => client.disconnect());
    await new Promise((resolve) => io.close(resolve));
    gameEvents.attach(null);
});
afterAll(() => sequelize.close());

test('plays a complete game and broadcasts the winner to both players and every tab', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const tab = await open(users[0]);
    const outsider = await open(users[2]);
    const game_id = await start(a, b);
    expect(io.sockets.adapter.rooms.get('game-' + game_id)).toEqual(new Set([a.id, b.id, tab.id]));
    const unexpected = jest.fn();
    outsider.on('game:state', unexpected);
    outsider.on('game:ended', unexpected);
    const columns = [0, 1, 0, 1, 0, 1, 0];
    let final;
    for (let turn = 0; turn < columns.length; turn++) {
        const states = Promise.all([a, b, tab].map((client) => waitEvent(client, 'game:state')));
        const endings = turn === 6 ? Promise.all([a, b, tab].map((client) => waitEvent(client, 'game:ended'))) : null;
        final = await command(turn % 2 ? b : a, 'game:move', { game_id, column: columns[turn], userId: users[2].id });
        for (const state of await states) expect(state).toEqual(final);
        if (endings) for (const state of await endings) expect(state).toEqual(final);
    }
    expect(final).toMatchObject({ state: 'finished', winnerId: users[0].id, finishReason: 'four_in_line', message: 'alice won the game!' });
    expect(final.winner).toEqual({ userId: users[0].id, username: 'alice', piece: 'R' });
    expect(await History.count({ where: { eventType: 'move' } })).toBe(7);
    expect(unexpected).not.toHaveBeenCalled();
    expect(io.sockets.adapter.rooms.has('game-' + game_id)).toBe(false);
    await expect(command(b, 'game:move', { game_id, column: 2 })).rejects.toMatchObject({ message: 'The game is not in progress' });
});

test('notifies both players of abandonment regardless of whose turn it is', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const game_id = await start(a, b);
    const ended = Promise.all([waitEvent(a, 'game:ended'), waitEvent(b, 'game:ended')]);
    const response = await command(b, 'game:leave', { game_id });
    for (const state of await ended) expect(state).toEqual(response);
    expect(response).toMatchObject({ state: 'finished', winnerId: users[0].id, finishReason: 'abandoned' });
    expect(io.sockets.adapter.rooms.has('game-' + game_id)).toBe(false);
});

test('rejection keeps the creator in the waiting room and removes the recipient', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const { game_id } = await command(a, 'game:create');
    const invitation = await command(a, 'game:invite', { gameId: game_id, opponentId: users[1].id });
    const rejected = waitEvent(a, 'game:invitation:rejected');
    await command(b, 'game:invitation:respond', { gameId: invitation.gameId, accept: false });
    expect(await rejected).toMatchObject({ gameId: invitation.gameId, status: 'REJECTED' });
    expect(io.sockets.adapter.rooms.get('game-' + invitation.gameId)).toEqual(new Set([a.id]));
    expect((await Game.findByPk(game_id)).state).toBe('pending');
    await expect(command(b, 'game:join', { game_id })).rejects.toMatchObject({ message: 'You are not part of this game' });
    const c = await open(users[2]);
    await command(a, 'game:invite', { game_id, opponent_id: users[2].id });
    await command(c, 'game:invitation:respond', { game_id, accept: true });
    expect(io.sockets.adapter.rooms.get('game-' + game_id)).toEqual(new Set([a.id, c.id]));
    await expect(command(b, 'game:invitation:respond', { game_id: invitation.gameId, accept: true }))
        .rejects.toMatchObject({ message: 'Pending invitation not found for this user' });
});

test('validates room membership, moves, malformed payloads and spoofed identity', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const outsider = await open(users[2]);
    const game_id = await start(a, b);
    await expect(command(outsider, 'game:join', { game_id, userId: users[0].id })).rejects.toMatchObject({ message: 'You are not part of this game' });
    await expect(command(b, 'game:move', { game_id, column: 0, userId: users[0].id })).rejects.toMatchObject({ message: 'It is not your turn' });
    await expect(command(a, 'game:move', { game_id, column: 7 })).rejects.toMatchObject({ message: 'column must be an integer from 0 to 6' });
    await expect(command(a, 'game:move', 'not an object')).rejects.toMatchObject({ message: 'Payload must be a JSON object' });
    await expect(command(a, 'game:move', null)).rejects.toMatchObject({ message: 'gameId must be a positive integer' });
    expect(await History.count()).toBe(0);
    expect(io.sockets.adapter.rooms.get('game-' + game_id).has(outsider.id)).toBe(false);
});

test('a disconnected player can rejoin and recover the board without abandoning', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const game_id = await start(a, b);
    const disconnected = waitEvent(io.sockets.sockets.get(b.id), 'disconnect');
    b.disconnect();
    await disconnected;
    await command(a, 'game:move', { game_id, column: 4 });
    const reconnected = await open(users[1]);
    const restored = await command(reconnected, 'game:join', { game_id });
    expect(restored.state).toBe('in_progress');
    expect(restored.board[5][4]).toBe(1);
    expect(restored.currentPlayerId).toBe(users[1].id);
    expect(io.sockets.adapter.rooms.get('game-' + game_id).has(reconnected.id)).toBe(true);
    expect((await command(reconnected, 'game:move', { game_id, column: 4 })).board[4][4]).toBe(2);
});

test('HTTP invitation, acceptance, move, update and deletion notify socket clients', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const waiting = await post('', users[0]);
    const game_id = waiting.body.game_id;
    const invited = waitEvent(b, 'game:invitation');
    const created = await post('/invitations', users[0], { game_id, opponent_id: users[1].id });
    expect(created.status).toBe(201);
    expect(await invited).toEqual(created.body);
    expect(created.body.gameId).toBe(game_id);
    let states = Promise.all([waitEvent(a, 'game:state'), waitEvent(b, 'game:state')]);
    expect((await post('/invitations/respond', users[1], { game_id, accept: true })).status).toBe(201);
    for (const state of await states) expect(state.state).toBe('pending');
    states = Promise.all([waitEvent(a, 'game:state'), waitEvent(b, 'game:state')]);
    expect((await post('/start', users[0], { game_id })).status).toBe(200);
    for (const state of await states) expect(state.state).toBe('in_progress');
    states = Promise.all([waitEvent(a, 'game:state'), waitEvent(b, 'game:state')]);
    const moved = await post('/make-move', users[0], { game_id, column: 2 });
    expect(moved.status).toBe(200);
    for (const state of await states) expect(state).toEqual(moved.body);
    states = Promise.all([waitEvent(a, 'game:state'), waitEvent(b, 'game:state')]);
    expect((await post('/update', users[0], { game_id, updates: { currentPlayerId: users[0].id } })).status).toBe(200);
    for (const state of await states) expect(state.currentPlayerId).toBe(users[0].id);
    const deleted = Promise.all([waitEvent(a, 'game:deleted'), waitEvent(b, 'game:deleted')]);
    expect((await post('/delete', users[0], { game_id })).status).toBe(200);
    for (const response of await deleted) expect(response).toEqual({ message: 'Game deleted successfully', game_id });
    expect(io.sockets.adapter.rooms.has('game-' + game_id)).toBe(false);
});

test('socket CRUD follows the HTTP permissions and response shapes', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const created = await command(a, 'game:create');
    expect(created).toEqual({ message: 'Game created successfully', game_id: expect.any(Number) });
    const { game_id } = created;
    expect(await command(a, 'game:list')).toEqual([expect.objectContaining({ gameId: game_id, state: 'pending' })]);
    expect(await command(b, 'game:get', { game_id })).toMatchObject({ gameId: game_id });
    await expect(command(b, 'game:update', { game_id, updates: { state: 'pending' } })).rejects.toMatchObject({ message: 'Only the creator can update or delete this game' });
    await expect(command(b, 'game:delete', { game_id })).rejects.toMatchObject({ message: 'Only the creator can update or delete this game' });
    expect(await command(a, 'game:update', { game_id, updates: { state: 'pending' } })).toEqual({ message: 'Game updated successfully', game_id });
    const deleted = waitEvent(a, 'game:deleted');
    expect(await command(a, 'game:delete', { game_id })).toEqual({ message: 'Game deleted successfully', game_id });
    await deleted;
    expect(await Game.findByPk(game_id)).toBeNull();
});

test.each(['missing', 'invalid', 'expired', 'revoked'])('rejects a %s handshake token', async (kind) => {
    const accessToken = kind === 'invalid' ? 'invalid-token' : token(users[0], kind === 'expired' ? -1 : '1h');
    if (kind === 'revoked') revoke(accessToken);
    const client = connect(url, { autoConnect: false, auth: kind === 'missing' ? {} : { token: accessToken }, reconnection: false });
    clients.push(client);
    const failed = waitEvent(client, 'connect_error');
    client.connect();
    expect((await failed).message).toMatch(/token|Token|logout/);
    expect(client.connected).toBe(false);
});

test.each(['expired', 'revoked'])('rechecks a %s token after connecting', async (kind) => {
    const a = await open(users[0]);
    if (kind === 'revoked') revoke(a.auth.token);
    else {
        // Advance JWT validation only; changing Date.now also expires Socket.IO heartbeats.
        const verify = jwt.verify;
        jest.spyOn(jwt, 'verify').mockImplementation((value, secret, options) => verify(value, secret, {
            ...options, clockTimestamp: Math.floor(Date.now() / 1000) + 7200,
        }));
    }
    await expect(command(a, 'game:create')).rejects.toMatchObject({ event: 'game:create', message: expect.stringMatching(/Token|logout/) });
    expect(await Game.count()).toBe(0);
});

test('inviting an offline player follows HTTP rules and the recipient can respond later', async () => {
    const a = await open(users[0]);
    const { game_id } = await command(a, 'game:create');
    const invitation = await command(a, 'game:invite', { game_id, opponent_id: users[1].id });
    const b = await open(users[1]);
    expect((await command(b, 'game:join', { game_id: invitation.gameId })).state).toBe('pending');
    expect((await command(b, 'game:invitation:respond', { game_id: invitation.gameId, accept: true })).status).toBe('ACCEPTED');
});

test('unexpected errors reach only the caller without leaking internals', async () => {
    const a = await open(users[0]);
    jest.spyOn(gameService, 'makeMove').mockRejectedValueOnce(new Error('private database details'));
    await expect(command(a, 'game:move', { game_id: 1, column: 0 })).rejects.toEqual({ event: 'game:move', message: 'Something went wrong on the server' });
    expect(await command(a, 'game:list')).toEqual([]);
});

test('a draw broadcasts the final board with no winner to both players', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const game_id = await start(a, b);
    const board = Array.from({ length: 6 }, (_, row) => row % 2
        ? [2, 2, 1, 1, 2, 2, 1] : [1, 1, 2, 2, 1, 1, 2]);
    board[0][6] = 0;
    await (await Game.findByPk(game_id)).update({ board, currentPlayerId: users[1].id });
    const ended = Promise.all([waitEvent(a, 'game:ended'), waitEvent(b, 'game:ended')]);
    const response = await command(b, 'game:move', { game_id, column: 6 });
    expect(response).toMatchObject({ state: 'finished', winnerId: null, finishReason: 'draw' });
    for (const state of await ended) expect(state).toEqual(response);
});

test('notification failure does not report a saved HTTP move as unsuccessful', async () => {
    const a = await open(users[0]);
    const b = await open(users[1]);
    const game_id = await start(a, b);
    jest.spyOn(io, 'to').mockImplementationOnce(() => { throw new Error('Notification failed'); });
    const response = await post('/make-move', users[0], { game_id, column: 0 });
    expect(response.status).toBe(200);
    expect(response.body.board[5][0]).toBe(1);
    expect((await Game.findByPk(game_id)).board[5][0]).toBe(1);
});
