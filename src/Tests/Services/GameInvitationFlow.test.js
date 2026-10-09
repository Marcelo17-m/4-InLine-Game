import sequelize from '../../Data Access/database.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import gamePlayerRepository from '../../Data Access/Repositories/GameplayerRepository.js';
import historyRepository from '../../Data Access/Repositories/HistoryRepository.js';
import invitationRepository from '../../Data Access/Repositories/InvitationRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import { createGameService } from '../../Logic/Services/GameService.js';
import { createGameValidator } from '../../Logic/Validators/GameValidator.js';
import { createGameRules } from '../../Logic/Validators/GameValidatorRules.js';
import * as helpers from '../../Helpers/connectFourRules.js';

const validator = createGameValidator({ gameRepository, gamePlayerRepository, userRepository, helpers });
const gameRules = createGameRules(validator);
const service = createGameService({
    gameRepository,
    gamePlayerRepository,
    historyRepository,
    invitationRepository,
    sequelize,
    gameRules,
    helpers,
});

describe('Connect Four invitation persistence flow', () => {
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await userRepository.create({ username: 'alice', passwordHash: 'hash-a' });
        await userRepository.create({ username: 'bob', passwordHash: 'hash-b' });
        await userRepository.create({ username: 'carol', passwordHash: 'hash-c' });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    it('creates a pending invitation and accepts it into an empty Connect Four game', async () => {
        const created = await service.createInvitation({ creatorId: 1, opponentId: 2 });
        expect(created.isOk()).toBe(true);

        const gameId = created.value.gameId;
        const game = await gameRepository.findById(gameId);
        const players = await gamePlayerRepository.findByGameId(gameId);
        const [invitation] = await invitationRepository.findByGameId(gameId);
        expect(game.state).toBe('pending');
        expect(game.currentPlayerId).toBeNull();
        expect(game.board).toEqual(helpers.createEmptyBoard());
        expect(players.map(({ userId, piece, turnOrder, invitationStatus }) => ({
            userId, piece, turnOrder, invitationStatus,
        }))).toEqual([
            { userId: 1, piece: 'R', turnOrder: 0, invitationStatus: 'accepted' },
            { userId: 2, piece: 'Y', turnOrder: 1, invitationStatus: 'invited' },
        ]);
        expect(invitation.status).toBe('pending');

        const accepted = await service.respondInvitation({ gameId, userId: 2, accept: true });
        expect(accepted.isOk()).toBe(true);
        expect(accepted.value.state).toBe('in_progress');
        expect(accepted.value.currentPlayerId).toBe(1);
        expect(accepted.value.players).toHaveLength(2);
        expect((await gameRepository.findById(gameId)).state).toBe('in_progress');
        expect((await invitationRepository.findByGameId(gameId))[0].status).toBe('accepted');
    });

    it('rejects an invitation and prevents the players from starting another pending game', async () => {
        const created = await service.createInvitation({ creatorId: 1, opponentId: 2 });
        const gameId = created.value.gameId;

        const secondInvitation = await service.createInvitation({ creatorId: 1, opponentId: 3 });
        expect(secondInvitation.isErr()).toBe(true);
        expect(secondInvitation.error.statusCode).toBe(409);

        const rejected = await service.respondInvitation({ gameId, userId: 2, accept: false });
        expect(rejected.isOk()).toBe(true);
        expect(rejected.value.state).toBe('rejected');
        expect((await gameRepository.findById(gameId)).finishReason).toBe('rejected');
        expect((await invitationRepository.findByGameId(gameId))[0].status).toBe('rejected');
    });
});
