import { createGameValidator } from '../../Logic/Validators/GameValidator.js';
import { createGameRules } from '../../Logic/Validators/GameValidatorRules.js';

describe('game invitation validation rules', () => {
    let userRepository, gameRepository, gamePlayerRepository, invitationRepository, rules;
    const input = { gameId: '5', creatorId: '1', opponentId: '2' };

    beforeEach(() => {
        userRepository = { findById: jest.fn(async (id) => ({ id, username: 'user-' + id })) };
        gameRepository = { findById: jest.fn().mockResolvedValue({ id: 5, creatorId: 1, state: 'pending' }) };
        gamePlayerRepository = {
            findByGameId: jest.fn().mockResolvedValue([
                { userId: 1, gameId: 5, piece: 'R', turnOrder: 0, invitationStatus: 'accepted' },
            ]),
            findActiveGamesByUserId: jest.fn(async (id) => id === 1 ? [{ gameId: 5 }] : []),
        };
        invitationRepository = { findByGameId: jest.fn().mockResolvedValue([]) };
        rules = createGameRules(createGameValidator({
            gameRepository, gamePlayerRepository, invitationRepository, userRepository, helpers: {},
        }));
    });

    it('allows the creator to invite into their own existing pending game', async () => {
        const result = await rules.validateCreateInvitation(input);
        expect(result.isOk()).toBe(true);
        expect(result.value).toMatchObject({ gameId: 5, creatorId: 1, userId: 1, opponentId: 2 });
    });

    it.each([undefined, 0, -1, true, {}, 'abc'])('rejects invalid game ID %p', async (gameId) => {
        expect((await rules.validateCreateInvitation({ ...input, gameId })).error.statusCode).toBe(400);
        expect(gameRepository.findById).not.toHaveBeenCalled();
    });

    it('rejects self invitations and invalid opponent types before database access', async () => {
        for (const opponentId of [1, true, {}, null]) {
            expect((await rules.validateCreateInvitation({ ...input, opponentId })).error.statusCode).toBe(400);
        }
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('requires an existing game owned by the sender', async () => {
        gameRepository.findById.mockResolvedValueOnce(null);
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(404);
        gameRepository.findById.mockResolvedValueOnce({ id: 5, creatorId: 3, state: 'pending' });
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(403);
    });

    it.each(['in_progress', 'finished', 'rejected'])('rejects invitations to %s games', async (state) => {
        gameRepository.findById.mockResolvedValueOnce({ id: 5, creatorId: 1, state });
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(409);
    });

    it('requires the creator to be an accepted participant', async () => {
        gamePlayerRepository.findByGameId.mockResolvedValueOnce([]);
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(403);
        gamePlayerRepository.findByGameId.mockResolvedValueOnce([{ userId: 1, invitationStatus: 'invited' }]);
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(403);
    });

    it('rejects an occupied opponent slot or unanswered invitation', async () => {
        gamePlayerRepository.findByGameId.mockResolvedValueOnce([
            { userId: 1, piece: 'R', turnOrder: 0, invitationStatus: 'accepted' },
            { userId: 3, piece: 'Y', turnOrder: 1, invitationStatus: 'invited' },
        ]);
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(409);
        invitationRepository.findByGameId.mockResolvedValueOnce([{ recipientId: 3, status: 'pending' }]);
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(409);
    });

    it('preserves previous invitations and reports repeat recipients clearly', async () => {
        invitationRepository.findByGameId.mockResolvedValue([{ recipientId: 2, status: 'rejected' }]);
        expect((await rules.validateCreateInvitation(input)).error.message).toMatch(/already been invited/);
        expect((await rules.validateCreateInvitation({ ...input, opponentId: 3 })).isOk()).toBe(true);
    });

    it('rejects missing opponents and players occupied in other games', async () => {
        userRepository.findById.mockImplementation(async (id) => id === 1 ? { id, username: 'alice' } : null);
        expect((await rules.validateCreateInvitation(input)).error.statusCode).toBe(404);
        userRepository.findById.mockImplementation(async (id) => ({ id, username: 'user-' + id }));
        gamePlayerRepository.findActiveGamesByUserId.mockImplementation(async (id) => id === 1 ? [{ gameId: 5 }] : [{ gameId: 8 }]);
        expect((await rules.validateCreateInvitation(input)).error.message).toMatch(/opponent already/);
        gamePlayerRepository.findActiveGamesByUserId.mockImplementation(async (id) => id === 1 ? [{ gameId: 5 }, { gameId: 8 }] : []);
        expect((await rules.validateCreateInvitation(input)).error.message).toMatch(/another pending or active/);
    });

    it('blocks creation while occupied, but allows an available user to create', async () => {
        expect((await rules.validateCreateGame({ userId: 1 })).error).toEqual({
            statusCode: 409, message: 'You already have a pending or active game',
        });
        expect((await rules.validateCreateGame({ userId: 2 })).isOk()).toBe(true);
    });

    it('requires positive response IDs and a boolean decision', async () => {
        expect((await rules.validateRespondInvitation({ gameId: 0, userId: 2, accept: true })).error.statusCode).toBe(400);
        expect((await rules.validateRespondInvitation({ gameId: 5, userId: 2, accept: 'true' })).error.statusCode).toBe(400);
    });
});