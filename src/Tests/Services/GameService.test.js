import sequelize from '../../Data Access/database.js';
import { Game, GamePlayer, History, User } from '../../Data Access/Models/index.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import gamePlayerRepository from '../../Data Access/Repositories/GameplayerRepository.js';
import historyRepository from '../../Data Access/Repositories/HistoryRepository.js';
import { createGameService } from '../../Logic/Services/GameService.js';
import { createGameValidator } from '../../Logic/Validators/GameValidator.js';
import { createGameRules } from '../../Logic/Validators/GameValidatorRules.js';
import * as helpers from '../../Helpers/connectFourRules.js';

const dependencies = { gameRepository, gamePlayerRepository, historyRepository };
const gameRules = createGameRules(createGameValidator({ ...dependencies, helpers }));
const service = createGameService({ ...dependencies, gameRules, helpers });
let red, yellow, outsider;

const value = (result) => {
    expect(result.error).toBeNull();
    return result.value;
};
// These tests start from an existing active game; invitation setup is outside this service.
const start = async () => {
    const game = await Game.create({
        creatorId: red.id, state: 'in_progress', currentPlayerId: red.id,
    });
    await GamePlayer.bulkCreate([
        { gameId: game.id, userId: red.id, piece: 'R', turnOrder: 0, invitationStatus: 'accepted' },
        { gameId: game.id, userId: yellow.id, piece: 'Y', turnOrder: 1, invitationStatus: 'accepted' },
    ]);
    return helpers.toGameState(game, await gamePlayerRepository.findByGameId(game.id));
};
const move = (gameId, userId, column) => service.makeMove({ gameId, userId, column });
const expectError = (result, statusCode, message) => {
    expect(result.isErr()).toBe(true);
    expect(result.error).toEqual({ statusCode, message });
};

beforeEach(async () => {
    jest.restoreAllMocks();
    await sequelize.sync({ force: true });
    [red, yellow, outsider] = await User.bulkCreate(['red', 'yellow', 'outsider'].map((username) => ({
        username, passwordHash: 'test-only-hash',
    })));
});
afterAll(() => sequelize.close());

test('exposes only makeMove and leaveGame', () => {
    expect(Object.keys(service).sort()).toEqual(['leaveGame', 'makeMove']);
});

test('rejects moves and abandonment while a game is pending', async () => {
    const initial = await start();
    await gameRepository.update(initial.gameId, { state: 'pending', currentPlayerId: null });
    expectError(await move(initial.gameId, red.id, 0), 409, 'The game is not in progress');
    expectError(await service.leaveGame({ gameId: initial.gameId, userId: red.id }), 409, 'The game is not in progress');
    expect(await History.count()).toBe(0);
});

test.each([-1, 7, 1.5, '2', null, undefined, NaN, true])('rejects invalid column %p before reading the database', async (column) => {
    const read = jest.spyOn(gameRepository, 'findById');
    expectError(await move(1, red.id, column), 400, 'column must be an integer from 0 to 6');
    expect(read).not.toHaveBeenCalled();
});

test('rejects invalid identity, game ID, missing games and nonmembers', async () => {
    expectError(await move(1, null, 0), 401, 'Authentication is required');
    expectError(await move('abc', red.id, 0), 400, 'gameId must be a positive integer');
    expectError(await move(999, red.id, 0), 404, 'Game not found');
    const state = await start();
    expectError(await move(state.gameId, outsider.id, 0), 403, 'You are not part of this game');
    expect(await History.count({ where: { eventType: 'move' } })).toBe(0);
});

test('drops each piece in the lowest empty row, alternates turns and records coordinates', async () => {
    const initial = await start();
    expectError(await move(initial.gameId, yellow.id, 2), 403, 'It is not your turn');
    const first = value(await move(initial.gameId, red.id, 2));
    expect(first.board[5][2]).toBe(1);
    expect(first.currentPlayerId).toBe(yellow.id);
    expect(initial.board[5][2]).toBe(0);
    expectError(await move(initial.gameId, red.id, 3), 403, 'It is not your turn');
    const second = value(await move(String(initial.gameId), String(yellow.id), 2));
    expect(second.board[4][2]).toBe(2);
    expect(second.currentPlayerId).toBe(red.id);
    const history = await History.findAll({ where: { eventType: 'move' }, order: [['moveNumber', 'ASC']] });
    expect(history.map((h) => [h.row, h.column, h.moveNumber, h.playerId])).toEqual([
        [5, 2, 1, red.id], [4, 2, 2, yellow.id],
    ]);
    const persisted = await Game.findByPk(initial.gameId);
    expect(persisted.board).toEqual(second.board);
    expect(persisted.currentPlayerId).toBe(red.id);
    expect(JSON.stringify(second)).not.toContain('password');
});

test('rejects a full column without modifying the board, turn or history', async () => {
    const state = await start();
    for (let turn = 0; turn < 6; turn++) value(await move(state.gameId, turn % 2 ? yellow.id : red.id, 0));
    const before = (await Game.findByPk(state.gameId)).toJSON();
    expectError(await move(state.gameId, red.id, 0), 409, 'The selected column is full');
    expect((await Game.findByPk(state.gameId)).toJSON()).toEqual(before);
    expect(await History.count({ where: { eventType: 'move' } })).toBe(6);
});

test.each([
    ['horizontal', [0, 6, 1, 6, 2, 5, 3]],
    ['vertical', [0, 1, 0, 1, 0, 1, 0]],
    ['diagonal rising', [0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 5, 3, 3]],
    ['diagonal falling', [6, 5, 5, 4, 2, 4, 4, 3, 2, 3, 1, 3, 3]],
])('finishes a %s victory and rejects later moves or abandonment', async (_direction, columns) => {
    const initial = await start();
    let state;
    for (let i = 0; i < columns.length; i++) {
        state = value(await move(initial.gameId, i % 2 ? yellow.id : red.id, columns[i]));
        if (i < columns.length - 1) expect(state.state).toBe('in_progress');
    }
    expect(state).toMatchObject({ state: 'finished', winnerId: red.id, currentPlayerId: null, finishReason: 'four_in_line' });
    expect(state.finishedAt).toBeInstanceOf(Date);
    expect(await History.count({ where: { eventType: 'finished' } })).toBe(1);
    expectError(await move(state.gameId, yellow.id, 4), 409, 'The game is not in progress');
    expectError(await service.leaveGame({ gameId: state.gameId, userId: yellow.id }), 409, 'The game is not in progress');
    expect((await Game.findByPk(state.gameId)).winnerId).toBe(red.id);
});

test('a full board without four in line ends in a draw', async () => {
    const state = await start();
    const board = Array.from({ length: 6 }, (_, row) => row % 2
        ? [2, 2, 1, 1, 2, 2, 1] : [1, 1, 2, 2, 1, 1, 2]);
    board[0][6] = 0;
    await gameRepository.update(state.gameId, { board, currentPlayerId: yellow.id });
    const draw = value(await move(state.gameId, yellow.id, 6));
    expect(draw).toMatchObject({ state: 'finished', winnerId: null, currentPlayerId: null, finishReason: 'draw' });
    expect(helpers.countMoves(draw.board)).toBe(42);
    expect((await History.findOne({ where: { eventType: 'move' } })).moveNumber).toBe(42);
});

test('either participant may abandon regardless of turn; the rival wins', async () => {
    const state = await start();
    expectError(await service.leaveGame({ gameId: state.gameId, userId: outsider.id }), 403, 'You are not part of this game');
    const ended = value(await service.leaveGame({ gameId: state.gameId, userId: yellow.id }));
    expect(ended).toMatchObject({ state: 'finished', winnerId: red.id, currentPlayerId: null, finishReason: 'abandoned' });
    expect(ended.players[1].invitationStatus).toBe('abandoned');
    expect(ended.board).toEqual(state.board);
    expect(await History.count({ where: { eventType: 'abandoned', playerId: yellow.id } })).toBe(1);
});

test.each(['makeMove', 'leaveGame'])('%s propagates a failed history write', async (method) => {
    const initial = await start();
    jest.spyOn(historyRepository, 'create').mockRejectedValueOnce(new Error('History write failed'));
    await expect(service[method]({ gameId: initial.gameId, userId: red.id, column: 0 })).rejects.toThrow('History write failed');
});
