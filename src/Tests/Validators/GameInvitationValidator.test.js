import { createGameValidator } from '../../Logic/Validators/GameValidator.js';
import { createGameRules } from '../../Logic/Validators/GameValidatorRules.js';

describe('game invitation validation rules', () => {
    let userRepository;
    let gamePlayerRepository;
    let rules;

    beforeEach(() => {
        userRepository = {
            findById: jest.fn(async (id) => ({ id, username: `user-${id}` })),
        };
        gamePlayerRepository = {
            findActiveGamesByUserId: jest.fn().mockResolvedValue([]),
        };
        const validator = createGameValidator({
            gameRepository: {},
            gamePlayerRepository,
            userRepository,
            helpers: {},
        });
        rules = createGameRules(validator);
    });

    it('accepts valid distinct users who do not have another active game', async () => {
        const result = await rules.validateCreateInvitation({ creatorId: '1', opponentId: '2' });

        expect(result.isOk()).toBe(true);
        expect(result.value.creatorId).toBe(1);
        expect(result.value.opponentId).toBe(2);
        expect(gamePlayerRepository.findActiveGamesByUserId).toHaveBeenCalledTimes(2);
    });

    it('rejects a self invitation before looking up users', async () => {
        const result = await rules.validateCreateInvitation({ creatorId: 1, opponentId: '1' });

        expect(result.isErr()).toBe(true);
        expect(result.error.statusCode).toBe(400);
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('rejects missing users and unavailable players', async () => {
        userRepository.findById.mockImplementation(async (id) => id === 1 ? { id, username: 'alice' } : null);
        const missingOpponent = await rules.validateCreateInvitation({ creatorId: 1, opponentId: 2 });
        expect(missingOpponent.error.statusCode).toBe(404);

        userRepository.findById.mockImplementation(async (id) => ({ id, username: `user-${id}` }));
        gamePlayerRepository.findActiveGamesByUserId.mockResolvedValueOnce([{ gameId: 4 }]);
        const busyCreator = await rules.validateCreateInvitation({ creatorId: 1, opponentId: 2 });
        expect(busyCreator.error.statusCode).toBe(409);
    });

    it('requires a positive game ID, authenticated user ID, and boolean decision', async () => {
        const invalidId = await rules.validateRespondInvitation({ gameId: 0, userId: 2, accept: true });
        const invalidDecision = await rules.validateRespondInvitation({ gameId: 1, userId: 2, accept: 'true' });

        expect(invalidId.error.statusCode).toBe(400);
        expect(invalidDecision.error.statusCode).toBe(400);
    });
});
