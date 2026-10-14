import { createGameService } from '../../Logic/Services/GameService.js';
import Result from '../../Logic/Monads/result.js';

describe('GameService invitations', () => {
    let gameRepository;
    let gamePlayerRepository;
    let invitationRepository;
    let historyRepository;
    let sequelize;
    let gameRules;
    let helpers;
    let service;

    const emptyBoard = () => Array.from({ length: 6 }, () => Array(7).fill(0));
    const normalizedCreateInput = (data) => ({
        ...data,
        gameId: Number(data.gameId),
        creatorId: Number(data.creatorId),
        opponentId: Number(data.opponentId),
        creator: { id: Number(data.creatorId), username: `user-${data.creatorId}` },
        opponent: { id: Number(data.opponentId), username: `user-${data.opponentId}` },
    });

    beforeEach(() => {
        gameRepository = {
            create: jest.fn().mockResolvedValue({ id: 31 }),
            findByIdForUpdate: jest.fn(),
            update: jest.fn(),
        };
        gamePlayerRepository = {
            create: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue(true),
            findByGameAndUser: jest.fn(),
            findByGameId: jest.fn(),
            updateInvitationStatus: jest.fn().mockResolvedValue(true),
            findActiveGamesByUserId: jest.fn().mockResolvedValue([]),
        };
        invitationRepository = {
            create: jest.fn().mockResolvedValue({ id: 80 }),
            findByGameId: jest.fn(),
            respond: jest.fn().mockResolvedValue(true),
        };
        historyRepository = { create: jest.fn() };
        sequelize = {
            transaction: jest.fn(async (callback) => callback({
                LOCK: { UPDATE: 'UPDATE' },
                id: 'transaction-1',
            })),
        };
        gameRules = {
            validateCreateInvitation: jest.fn(async (data) => Result.Ok(normalizedCreateInput(data))),
            validateRespondInvitation: jest.fn(async (data) => Result.Ok({
                ...data, gameId: Number(data.gameId), userId: Number(data.userId),
            })),
            validateMakeMove: jest.fn(),
            validateLeaveGame: jest.fn(),
        };
        helpers = {
            toGameState: jest.fn((game, players) => ({
                gameId: game.id,
                creatorId: game.creatorId,
                state: game.state,
                board: game.board,
                currentPlayerId: game.currentPlayerId,
                winnerId: game.winnerId,
                finishReason: game.finishReason,
                players,
            })),
        };
        service = createGameService({
            gameRepository,
            gamePlayerRepository,
            historyRepository,
            invitationRepository,
            sequelize,
            gameRules,
            helpers,
        });
    });

    describe('createInvitation', () => {
        it('adds only the invited player and invitation to the existing game', async () => {
            const result = await service.createInvitation({ gameId: 31, creatorId: '1', opponentId: '2' });

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({
                gameId: 31,
                opponentId: 2,
                creator: { id: 1, username: 'user-1' },
            });
            expect(gameRepository.create).not.toHaveBeenCalled();
            expect(gamePlayerRepository.create).toHaveBeenCalledTimes(1);
            expect(gamePlayerRepository.create).toHaveBeenCalledWith({
                gameId: 31, userId: 2, piece: 'Y', turnOrder: 1, invitationStatus: 'invited',
            }, expect.any(Object));
            expect(invitationRepository.create).toHaveBeenCalledWith({
                gameId: 31, senderId: 1, recipientId: 2, status: 'pending',
            }, expect.any(Object));
            expect(sequelize.transaction).toHaveBeenCalledTimes(1);
        });

        it.each([
            [{ statusCode: 400, message: 'You cannot invite yourself' }],
            [{ statusCode: 404, message: 'Opponent not found' }],
            [{ statusCode: 409, message: 'Both players must be available' }],
        ])('returns validation errors without opening a transaction', async (error) => {
            gameRules.validateCreateInvitation.mockResolvedValue(Result.Err(error));

            const result = await service.createInvitation({ gameId: 31, creatorId: 1, opponentId: 2 });

            expect(result.isErr()).toBe(true);
            expect(result.error).toEqual(error);
            expect(sequelize.transaction).not.toHaveBeenCalled();
        });

        it('reports transaction failures', async () => {
            invitationRepository.create.mockRejectedValue(new Error('database failure'));

            const result = await service.createInvitation({ gameId: 31, creatorId: 1, opponentId: 2 });

            expect(result.isErr()).toBe(true);
            expect(result.error.statusCode).toBe(409);
            expect(result.error.message).toMatch(/Could not create invitation/);
        });
    });

    describe('respondInvitation', () => {
        const setupPendingInvitation = () => {
            gameRepository.findByIdForUpdate.mockResolvedValue({
                id: 31, creatorId: 1, state: 'pending', board: emptyBoard(),
            });
            invitationRepository.findByGameId.mockResolvedValue([
                { id: 80, gameId: 31, senderId: 1, recipientId: 2, status: 'pending' },
            ]);
            gamePlayerRepository.findByGameAndUser.mockResolvedValue({ id: 42, invitationStatus: 'invited' });
            gamePlayerRepository.findByGameId.mockResolvedValue([
                { userId: 1, piece: 'R', invitationStatus: 'accepted' },
                { userId: 2, piece: 'Y', invitationStatus: 'accepted' },
            ]);
            gameRepository.update.mockImplementation(async (_id, changes) => ({
                id: 31, creatorId: 1, board: emptyBoard(), winnerId: null, finishReason: null,
                currentPlayerId: null, ...changes,
            }));
        };

        it.each([
            [true, 'accepted'],
            [false, 'rejected'],
        ])('persists the response without starting the game (accept=%s)', async (accept, status) => {
            setupPendingInvitation();

            const result = await service.respondInvitation({ gameId: 31, userId: 2, accept });

            expect(result.isOk()).toBe(true);
            expect(gameRepository.findByIdForUpdate).toHaveBeenCalledWith(31, expect.objectContaining({ id: 'transaction-1' }));
            expect(invitationRepository.respond).toHaveBeenCalledWith(80, 2, status, expect.any(Object));
            if (accept) {
                expect(gamePlayerRepository.updateInvitationStatus).toHaveBeenCalledWith(31, 2, status, expect.any(Object));
                expect(gameRepository.update).not.toHaveBeenCalled();
                expect(gamePlayerRepository.delete).not.toHaveBeenCalled();
            } else {
                expect(gamePlayerRepository.delete).toHaveBeenCalledWith(42, expect.any(Object));
                expect(gameRepository.update).not.toHaveBeenCalled();
                expect(gamePlayerRepository.updateInvitationStatus).not.toHaveBeenCalled();
            }
            expect(result.value).toEqual({
                message: accept ? 'Invitation accepted successfully' : 'Invitation rejected',
                status: accept ? 'ACCEPTED' : 'REJECTED',
            });
        });

        it('does not authorize another user to respond', async () => {
            setupPendingInvitation();

            const result = await service.respondInvitation({ gameId: 31, userId: 3, accept: true });

            expect(result.isErr()).toBe(true);
            expect(result.error.statusCode).toBe(404);
            expect(invitationRepository.respond).not.toHaveBeenCalled();
            expect(gameRepository.update).not.toHaveBeenCalled();
        });

        it('rejects a response when the invitation is no longer pending', async () => {
            setupPendingInvitation();
            gamePlayerRepository.findByGameAndUser.mockResolvedValue({ invitationStatus: 'accepted' });

            const result = await service.respondInvitation({ gameId: 31, userId: 2, accept: true });

            expect(result.isErr()).toBe(true);
            expect(result.error.statusCode).toBe(409);
            expect(invitationRepository.respond).not.toHaveBeenCalled();
            expect(gameRepository.update).not.toHaveBeenCalled();
        });

        it('returns validation errors before opening a transaction', async () => {
            const error = { statusCode: 400, message: 'accept must be a boolean' };
            gameRules.validateRespondInvitation.mockResolvedValue(Result.Err(error));

            const result = await service.respondInvitation({ gameId: 31, userId: 2, accept: 'true' });

            expect(result.isErr()).toBe(true);
            expect(result.error).toEqual(error);
            expect(sequelize.transaction).not.toHaveBeenCalled();
        });
    });
});
