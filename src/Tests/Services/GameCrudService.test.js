import sequelize from '../../Data Access/database.js';
import { Game, GamePlayer, History, Invitation, User } from '../../Data Access/Models/index.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import gamePlayerRepository from '../../Data Access/Repositories/GameplayerRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import historyRepository from '../../Data Access/Repositories/HistoryRepository.js';
import { createGameService } from '../../Logic/Services/GameService.js';
import { createGameValidator } from '../../Logic/Validators/GameValidator.js';
import { createGameRules } from '../../Logic/Validators/GameValidatorRules.js';
import * as helpers from '../../Helpers/connectFourRules.js';

const dependencies = { gameRepository, gamePlayerRepository, userRepository, historyRepository, helpers };
const gameRules = createGameRules(createGameValidator(dependencies));
const service = createGameService({ ...dependencies, gameRules });
let creator, opponent, outsider;
const value = (result) => {
    expect(result.error).toBeNull();
    return result.value;
};
const error = (result, statusCode) => {
    expect(result.isErr()).toBe(true);
    expect(result.error).toEqual({ statusCode, message: expect.any(String) });
};
const create = async () => value(await service.createGame({ creatorId: creator.id }));
const activate = async () => {
    const game = await create();
    await GamePlayer.create({ gameId: game.gameId, userId: opponent.id, piece: 'Y', turnOrder: 1, invitationStatus: 'accepted' });
    await gameRepository.update(game.gameId, { state: 'in_progress', currentPlayerId: creator.id });
    return game;
};

beforeEach(async () => {
    jest.restoreAllMocks();
    await sequelize.sync({ force: true });
    [creator, opponent, outsider] = await User.bulkCreate(['creator', 'opponent', 'outsider'].map((username) => ({
        username, passwordHash: 'private-hash',
    })));
});
afterAll(() => sequelize.close());

test('lists an empty database and returns public snapshots for all games', async () => {
    expect(value(await service.getAllGames({ userId: creator.id }))).toEqual([]);
    const first = await create();
    const second = value(await service.createGame({ creatorId: opponent.id }));
    const games = value(await service.getAllGames({ userId: outsider.id }));
    expect(games.map((game) => game.gameId).sort()).toEqual([first.gameId, second.gameId].sort());
    expect(games[0].board).toEqual(helpers.createEmptyBoard());
    expect(games[0].players[0].username).toBe('creator');
    expect(JSON.stringify(games)).not.toMatch(/password|private-hash/);
});

test('gets a game by numeric-string ID with public player data', async () => {
    const created = await create();
    const game = value(await service.getGameById({ gameId: String(created.gameId), userId: String(creator.id) }));
    expect(game).toEqual(created);
});

test.each(['getAllGames', 'getGameById', 'updateGame', 'deleteGame'])('%s requires authenticated identity', async (method) => {
    error(await service[method]({ userId: null, gameId: 1, updates: { state: 'pending' } }), 401);
});

test.each(['getGameById', 'updateGame', 'deleteGame'])('%s rejects invalid and missing game IDs', async (method) => {
    error(await service[method]({ userId: creator.id, gameId: -1, updates: { state: 'pending' } }), 400);
    error(await service[method]({ userId: creator.id, gameId: 999, updates: { state: 'pending' } }), 404);
});

test.each(['updateGame', 'deleteGame'])('%s requires the creator even when the caller is a participant', async (method) => {
    const game = await activate();
    const before = (await Game.findByPk(game.gameId)).toJSON();
    for (const userId of [opponent.id, outsider.id]) {
        error(await service[method]({ userId, gameId: game.gameId, updates: { state: 'pending' } }), 403);
    }
    expect((await Game.findByPk(game.gameId)).toJSON()).toEqual(before);
});

test('updates board and turn without overwriting omitted fields', async () => {
    const game = await activate();
    const board = helpers.createEmptyBoard();
    board[5][3] = 1;
    expect(value(await service.updateGame({
        gameId: game.gameId, userId: creator.id, updates: { board, currentPlayerId: String(opponent.id) },
    }))).toEqual({ message: 'Game updated successfully', game_id: game.gameId });
    const persisted = await Game.findByPk(game.gameId);
    expect(persisted.board).toEqual(board);
    expect(persisted.currentPlayerId).toBe(opponent.id);
    expect(persisted.creatorId).toBe(creator.id);
    expect(persisted.state).toBe('in_progress');
});

test.each([
    undefined, null, [], {}, { creatorId: 99 }, { id: 99 }, { finishedAt: '2000-01-01' },
    { state: 'waiting' }, { board: [[0]] }, { board: Array.from({ length: 6 }, () => Array(7).fill(9)) },
    { currentPlayerId: true }, { winnerId: -1 }, { currentPlayerId: 999 }, { winnerId: 999 },
    { winnerId: 1 }, { finishReason: 'draw' }, { state: 'in_progress', currentPlayerId: 1 },
])('rejects invalid manual update %p before writing', async (updates) => {
    const game = await create();
    const write = jest.spyOn(gameRepository, 'update');
    error(await service.updateGame({ gameId: game.gameId, userId: creator.id, updates }), 400);
    expect(write).not.toHaveBeenCalled();
});

test.each(['four_in_line', 'draw', 'abandoned'])('saves a coherent manual %s result with a server-generated end time', async (finishReason) => {
    const game = await activate();
    value(await service.updateGame({
        gameId: game.gameId, userId: creator.id,
        updates: { state: 'finished', currentPlayerId: null, winnerId: finishReason === 'draw' ? null : opponent.id, finishReason },
    }));
    const saved = await Game.findByPk(game.gameId);
    expect(saved.state).toBe('finished');
    expect(saved.currentPlayerId).toBeNull();
    expect(saved.finishedAt).toBeInstanceOf(Date);
    expect(saved.finishReason).toBe(finishReason);
});

test('rejects inconsistent results and can reopen a game with its result cleared', async () => {
    const game = await activate();
    for (const updates of [
        { state: 'finished' },
        { state: 'finished', currentPlayerId: null, finishReason: 'draw', winnerId: creator.id },
        { state: 'finished', currentPlayerId: null, finishReason: 'four_in_line', winnerId: null },
        { state: 'rejected', currentPlayerId: null, finishReason: 'draw' },
    ]) error(await service.updateGame({ gameId: game.gameId, userId: creator.id, updates }), 400);
    value(await service.updateGame({ gameId: game.gameId, userId: creator.id,
        updates: { state: 'finished', currentPlayerId: null, finishReason: 'draw', winnerId: null },
    }));
    value(await service.updateGame({ gameId: game.gameId, userId: creator.id,
        updates: { state: 'in_progress', currentPlayerId: creator.id, finishReason: null, winnerId: null },
    }));
    expect((await Game.findByPk(game.gameId)).finishedAt).toBeNull();
});

test('deletes a game with its related players, invitation and history without deleting users', async () => {
    const game = await activate();
    await Invitation.create({ gameId: game.gameId, senderId: creator.id, recipientId: opponent.id });
    await History.create({ gameId: game.gameId, playerId: creator.id, eventType: 'started', action: 'Test game started' });
    expect(value(await service.deleteGame({ gameId: game.gameId, userId: creator.id })))
        .toEqual({ message: 'Game deleted successfully', game_id: game.gameId });
    expect(await Game.findByPk(game.gameId)).toBeNull();
    expect(await GamePlayer.count()).toBe(0);
    expect(await Invitation.count()).toBe(0);
    expect(await History.count()).toBe(0);
    expect(await User.count()).toBe(3);
});
