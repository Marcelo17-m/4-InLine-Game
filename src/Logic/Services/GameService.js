export const createGameService = ({
    gameRepository, gamePlayerRepository, historyRepository, gameRules, helpers,
}) => {
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

    return { makeMove, leaveGame };
};
