import Result from '../Monads/result.js';

export const createGameService = ({
    gameRepository, gamePlayerRepository, historyRepository, invitationRepository,
    sequelize, gameRules, helpers,
}) => {
    
    const createGame = async ({ creatorId }) => {
        const result = await gameRules.validateCreateGame({ userId: creatorId });
        if (result.isErr()) return result;

        const { userId } = result.value;
        const game = await gameRepository.create({ creatorId: userId, state: 'pending' });
        await gamePlayerRepository.create({
            gameId: game.id, userId, piece: 'R', turnOrder: 0, invitationStatus: 'accepted',
        });


        const players = await gamePlayerRepository.findByGameId(game.id);
        return result.map(() => helpers.toGameState(game, players));
    };
    const createInvitation = async ({ creatorId, opponentId }) => {
        const validation = await gameRules.validateCreateInvitation({ creatorId, opponentId });
        if (validation.isErr()) return validation;
        const {
            creatorId: normalizedCreatorId,
            opponentId: normalizedOpponentId,
            creator,
        } = validation.value;

        try {
            const game = await sequelize.transaction(async (transaction) => {
                const created = await gameRepository.create({
                    creatorId: normalizedCreatorId, state: 'pending', currentPlayerId: null,
                }, { transaction });
                await gamePlayerRepository.create({
                    gameId: created.id, userId: normalizedCreatorId, piece: 'R', turnOrder: 0,
                    invitationStatus: 'accepted',
                }, { transaction });
                await gamePlayerRepository.create({
                    gameId: created.id, userId: normalizedOpponentId, piece: 'Y', turnOrder: 1,
                    invitationStatus: 'invited',
                }, { transaction });
                await invitationRepository.create({
                    gameId: created.id, senderId: normalizedCreatorId, recipientId: normalizedOpponentId, status: 'pending',
                }, { transaction });
                return created;
            });
            return validation.map(() => ({
                gameId: game.id,
                opponentId: normalizedOpponentId,
                creator: { id: creator.id, username: creator.username },
            }));
        } catch (error) {
            return Result.Err({ statusCode: 409, message: 'Could not create invitation; one player may no longer be available' });
        }
    };

    const respondInvitation = async ({ gameId, userId, accept }) => {
    const validation = await gameRules.validateRespondInvitation({ gameId, userId, accept });
    if (validation.isErr()) return validation;
    ({ gameId, userId, accept } = validation.value);

    try {
        const response = await sequelize.transaction(async (transaction) => {
            const game = await gameRepository.findByIdForUpdate(gameId, transaction);
            if (!game) return { error: { statusCode: 404, message: 'Game not found' } };
            
            const invitations = await invitationRepository.findByGameId(gameId, transaction);
            const invitation = invitations.find((item) =>
                Number(item.recipientId) === userId && item.status === 'pending'
            );
            if (!invitation) return { error: { statusCode: 404, message: 'Pending invitation not found for this user' } };

            const participant = await gamePlayerRepository.findByGameAndUser(gameId, userId, transaction);
            if (!participant || participant.invitationStatus !== 'invited' || game.state !== 'pending') {
                return { error: { statusCode: 409, message: 'Invitation is no longer available' } };
            }

            const status = accept ? 'accepted' : 'rejected';
            const updatedInvitation = await invitationRepository.respond(invitation.id, userId, status, transaction);
            if (!updatedInvitation) return { error: { statusCode: 409, message: 'Invitation has already been answered' } };
            
            await gamePlayerRepository.updateInvitationStatus(gameId, userId, status, transaction);

            const changes = accept
                ? { state: 'in_progress', currentPlayerId: game.creatorId }
                : { state: 'rejected', finishReason: 'rejected', finishedAt: new Date(), currentPlayerId: null };
            
            await gameRepository.update(gameId, changes, { transaction });

            return {
                message: accept ? 'Invitation accepted successfully' : 'Invitation rejected',
                status: accept ? 'ACCEPTED' : 'REJECTED'
            };
        });
        
        return response.error ? Result.Err(response.error) : Result.Ok(response);
    } catch (error) {
        return Result.Err({ statusCode: 409, message: 'Could not respond to invitation' });
    }
};

    const makeMove = async (data) => {
        const result = await gameRules.validateMakeMove(data);
        if (result.isErr()) return result;

        const { game, gameId, userId, gamePlayer, opponent, row, column } = result.value;
        const board = helpers.placePiece(game.board, row, column, helpers.pieceValue(gamePlayer.piece));
        const won = helpers.hasFourInLine(board, row, column);
        const draw = !won && helpers.isBoardFull(board);
        const finished = won || draw;

        const updated = await gameRepository.update(gameId, {
            board,
            state: finished ? 'finished' : 'in_progress',
            currentPlayerId: finished ? null : opponent.userId,
            winnerId: won ? userId : null,
            finishReason: won ? 'four_in_line' : draw ? 'draw' : null,
            finishedAt: finished ? new Date() : null,
        });
        await historyRepository.create({
            gameId, playerId: userId, eventType: 'move', row, column,
            moveNumber: helpers.countMoves(board), action: 'Placed a piece in column ' + column,
        });
        if (finished) {
            await historyRepository.create({
                gameId, playerId: won ? userId : null, eventType: 'finished',
                action: won ? 'Won with four in line' : 'Game ended in a draw',
            });
        }

        const players = await gamePlayerRepository.findByGameId(gameId);
        return result.map(() => helpers.toGameState(updated, players));
    };

    const leaveGame = async (data) => {
        const result = await gameRules.validateLeaveGame(data);
        if (result.isErr()) return result;

        const { gameId, userId, opponent } = result.value;
        await gamePlayerRepository.updateInvitationStatus(gameId, userId, 'abandoned');
        const updated = await gameRepository.update(gameId, {
            state: 'finished', winnerId: opponent.userId, finishReason: 'abandoned',
            finishedAt: new Date(), currentPlayerId: null,
        });
        await historyRepository.create({
            gameId, playerId: userId, eventType: 'abandoned', action: 'Player abandoned the game',
        });

        const players = await gamePlayerRepository.findByGameId(gameId);
        return result.map(() => helpers.toGameState(updated, players));
    };

    return { createGame,createInvitation, respondInvitation, makeMove, leaveGame };
};
