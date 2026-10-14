import sequelize from '../../Data Access/database.js';
import { Game, GamePlayer, Invitation } from '../../Data Access/Models/index.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import gamePlayerRepository from '../../Data Access/Repositories/GameplayerRepository.js';
import historyRepository from '../../Data Access/Repositories/HistoryRepository.js';
import invitationRepository from '../../Data Access/Repositories/InvitationRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import { createGameService } from '../../Logic/Services/GameService.js';
import { createGameValidator } from '../../Logic/Validators/GameValidator.js';
import { createGameRules } from '../../Logic/Validators/GameValidatorRules.js';
import * as helpers from '../../Helpers/connectFourRules.js';

const dependencies = { gameRepository, gamePlayerRepository, invitationRepository, userRepository, helpers };
const gameRules = createGameRules(createGameValidator(dependencies));
const service = createGameService({ ...dependencies, historyRepository, sequelize, gameRules });
const create = async () => {
    const result = await service.createGame({ creatorId: 1 });
    expect(result.isOk()).toBe(true);
    return result.value.gameId;
};
const invite = (gameId, opponentId = 2) => service.createInvitation({ gameId, creatorId: 1, opponentId });

beforeEach(async () => {
    jest.restoreAllMocks();
    await sequelize.sync({ force: true });
    for (const username of ['alice', 'bob', 'carol']) {
        await userRepository.create({ username, passwordHash: 'test-only-hash' });
    }
});
afterAll(() => sequelize.close());

test('creates one waiting game with its creator, then invites and starts that same game', async () => {
    const gameId = await create();
    expect(await gamePlayerRepository.findByGameId(gameId)).toEqual([
        expect.objectContaining({ userId: 1, piece: 'R', invitationStatus: 'accepted' }),
    ]);
    const invitation = await invite(gameId);
    expect(invitation.isOk()).toBe(true);
    expect(invitation.value.gameId).toBe(gameId);
    expect(await Game.count()).toBe(1);
    expect(await gameRepository.findById(gameId)).toMatchObject({
        state: 'pending', currentPlayerId: null, board: helpers.createEmptyBoard(),
    });
    expect((await gamePlayerRepository.findByGameId(gameId)).map((p) => [p.userId, p.invitationStatus]))
        .toEqual([[1, 'accepted'], [2, 'invited']]);
    const accepted = await service.respondInvitation({ gameId, userId: 2, accept: true });
    expect(accepted.value).toEqual({ message: 'Invitation accepted successfully', status: 'ACCEPTED' });
    expect(await gameRepository.findById(gameId)).toMatchObject({ state: 'pending', currentPlayerId: null });
    expect((await service.makeMove({ gameId, userId: 1, column: 0 })).error.statusCode).toBe(409);
    expect((await service.startGame({ gameId, userId: 1 })).isOk()).toBe(true);
    expect(await gameRepository.findById(gameId)).toMatchObject({ state: 'in_progress', currentPlayerId: 1 });
    expect((await invitationRepository.findByGameId(gameId))[0].status).toBe('accepted');
    expect((await service.makeMove({ gameId, userId: 1, column: 0 })).isOk()).toBe(true);
});

test('blocks duplicate games and invitations while pending or active', async () => {
    const gameId = await create();
    expect((await service.createGame({ creatorId: 1 })).error.statusCode).toBe(409);
    await invite(gameId);
    expect((await service.createGame({ creatorId: 2 })).error.statusCode).toBe(409);
    expect((await invite(gameId, 3)).error.statusCode).toBe(409);
    await service.respondInvitation({ gameId, userId: 2, accept: true });
    expect((await service.createGame({ creatorId: 1 })).error.statusCode).toBe(409);
    expect((await service.createGame({ creatorId: 2 })).error.statusCode).toBe(409);
    expect((await invite(gameId, 3)).error.statusCode).toBe(409);
    expect(await Game.count()).toBe(1);
    expect(await GamePlayer.count()).toBe(2);
    expect(await Invitation.count()).toBe(1);
});

test('rejection preserves the game and invitation history and permits a different opponent', async () => {
    const gameId = await create();
    await invite(gameId);
    const rejected = await service.respondInvitation({ gameId, userId: 2, accept: false });
    expect(rejected.value).toEqual({ message: 'Invitation rejected', status: 'REJECTED' });
    expect(await gameRepository.findById(gameId)).toMatchObject({
        state: 'pending', currentPlayerId: null, winnerId: null, finishReason: null, finishedAt: null,
    });
    expect(await GamePlayer.count({ where: { gameId } })).toBe(1);
    expect((await invitationRepository.findByGameId(gameId))[0]).toMatchObject({ status: 'rejected', recipientId: 2 });
    expect((await service.getGameForPlayer({ gameId, userId: 2 })).error.statusCode).toBe(403);
    expect((await invite(gameId, 2)).error.message).toMatch(/already been invited/);
    expect((await invite(gameId, 3)).isOk()).toBe(true);
    expect((await service.respondInvitation({ gameId, userId: 3, accept: true })).isOk()).toBe(true);
    expect((await gamePlayerRepository.findByGameId(gameId)).map((p) => p.userId)).toEqual([1, 3]);
    expect((await invitationRepository.findByGameId(gameId)).map((i) => i.status)).toEqual(['rejected', 'accepted']);
    expect(await Game.count()).toBe(1);
    expect((await service.createGame({ creatorId: 2 })).isOk()).toBe(true);
});

test('rejects invitation requests without creating an implicit game', async () => {
    expect((await invite(undefined)).error.statusCode).toBe(400);
    expect((await invite(999)).error.statusCode).toBe(404);
    expect(await Game.count()).toBe(0);
    const gameId = await create();
    expect((await service.createInvitation({ gameId, creatorId: 2, opponentId: 3 })).error.statusCode).toBe(403);
    await service.createGame({ creatorId: 2 });
    expect((await invite(gameId, 2)).error.message).toMatch(/opponent already/);
    expect(await Invitation.count()).toBe(0);
});

test('a finished game no longer prevents another game', async () => {
    const gameId = await create();
    await invite(gameId);
    await service.respondInvitation({ gameId, userId: 2, accept: true });
    await service.startGame({ gameId, userId: 1 });
    await service.leaveGame({ gameId, userId: 2 });
    expect((await service.createGame({ creatorId: 1 })).isOk()).toBe(true);
    expect((await service.createGame({ creatorId: 2 })).isOk()).toBe(true);
});

test('only the creator can start, after both players accept, and never restart', async () => {
    const gameId = await create();
    expect((await service.startGame({ gameId, userId: 1 })).error.statusCode).toBe(409);
    await invite(gameId);
    expect((await service.startGame({ gameId, userId: 1 })).error.statusCode).toBe(409);
    await service.respondInvitation({ gameId, userId: 2, accept: true });
    expect((await service.startGame({ gameId, userId: 2 })).error.statusCode).toBe(403);
    expect((await service.startGame({ gameId, userId: 3 })).error.statusCode).toBe(403);
    expect((await service.startGame({ gameId, userId: 1 })).value).toMatchObject({ state: 'in_progress', currentPlayerId: 1 });
    await service.makeMove({ gameId, userId: 1, column: 2 });
    expect((await service.startGame({ gameId, userId: 1 })).error.statusCode).toBe(409);
    expect(await gameRepository.findById(gameId)).toMatchObject({ currentPlayerId: 2 });
    await service.leaveGame({ gameId, userId: 2 });
    expect((await service.startGame({ gameId, userId: 1 })).error.statusCode).toBe(409);
});

test('an invitation write failure rolls back the opponent while retaining the waiting game', async () => {
    const gameId = await create();
    jest.spyOn(invitationRepository, 'create').mockRejectedValueOnce(new Error('Write failed'));
    expect((await invite(gameId)).isErr()).toBe(true);
    expect(await Game.count()).toBe(1);
    expect(await GamePlayer.count()).toBe(1);
    expect(await Invitation.count()).toBe(0);
    expect((await invite(gameId)).isOk()).toBe(true);
});

test('a failed rejection rolls back the invitation response and retains the opponent', async () => {
    const gameId = await create();
    await invite(gameId);
    jest.spyOn(gamePlayerRepository, 'delete').mockRejectedValueOnce(new Error('Delete failed'));
    expect((await service.respondInvitation({ gameId, userId: 2, accept: false })).isErr()).toBe(true);
    expect((await invitationRepository.findByGameId(gameId))[0].status).toBe('pending');
    expect((await gamePlayerRepository.findByGameAndUser(gameId, 2)).invitationStatus).toBe('invited');
    expect((await service.respondInvitation({ gameId, userId: 2, accept: false })).isOk()).toBe(true);
});
