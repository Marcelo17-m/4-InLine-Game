import Result from '../Monads/result.js';

export const createGameValidator = ({ gameRepository, gamePlayerRepository, userRepository, helpers }) => {
    const validateAuthenticatedUser = async (data) => {
        const userId = Number(data.userId);
        if (!['number', 'string'].includes(typeof data.userId) || !Number.isSafeInteger(userId) || userId <= 0) {
            return Result.Err({ statusCode: 401, message: 'Authentication is required' });
        }
        return Result.Ok({ ...data, userId });
    };

    const validateCreatorExists = async (data) => {
        const creator = await userRepository.findById(data.userId);
        if (!creator) {
            return Result.Err({ statusCode: 404, message: 'Creator not found' });
        }
        return Result.Ok({ ...data, creator });
    };

    const validateGameIdProvided = async (data) => {
        const gameId = Number(data.gameId);
        if (!['number', 'string'].includes(typeof data.gameId) || !Number.isSafeInteger(gameId) || gameId <= 0) {
            return Result.Err({ statusCode: 400, message: 'gameId must be a positive integer' });
        }
        return Result.Ok({ ...data, gameId });
    };

    const validateColumn = async (data) => {
        if (!Number.isInteger(data.column) || data.column < 0 || data.column > 6) {
            return Result.Err({ statusCode: 400, message: 'column must be an integer from 0 to 6' });
        }
        return Result.Ok(data);
    };

    const validateGameExistsByGameId = async (data) => {
        const game = await gameRepository.findById(data.gameId);
        if (!game) {
            return Result.Err({ statusCode: 404, message: 'Game not found' });
        }
        return Result.Ok({ ...data, game });
    };

    const validateUserIsInGame = async (data) => {
        const players = await gamePlayerRepository.findByGameId(data.gameId);
        const gamePlayer = players.find((player) => player.userId === data.userId);
        if (!gamePlayer) {
            return Result.Err({ statusCode: 403, message: 'You are not part of this game' });
        }
        return Result.Ok({ ...data, players, gamePlayer });
    };

    const validateAcceptedPlayer = async (data) => {
        if (data.gamePlayer.invitationStatus !== 'accepted') {
            return Result.Err({ statusCode: 403, message: 'You are not an accepted participant' });
        }
        return Result.Ok(data);
    };

    const validateGameInProgress = async (data) => {
        if (data.game.state !== 'in_progress') {
            return Result.Err({ statusCode: 409, message: 'The game is not in progress' });
        }
        return Result.Ok(data);
    };

    const validateTwoPlayers = async (data) => {
        const accepted = data.players.filter((player) => player.invitationStatus === 'accepted');
        if (data.players.length !== 2 || accepted.length !== 2 ||
            new Set(accepted.map((player) => player.piece)).size !== 2 ||
            accepted.some((player) => !helpers.pieceValue(player.piece))) {
            return Result.Err({ statusCode: 409, message: 'The game requires two accepted players with different pieces' });
        }
        const opponent = accepted.find((player) => player.userId !== data.userId);
        return Result.Ok({ ...data, opponent });
    };

    const validateIsPlayerTurn = async (data) => {
        if (data.game.currentPlayerId !== data.userId) {
            return Result.Err({ statusCode: 403, message: 'It is not your turn' });
        }
        return Result.Ok(data);
    };

    const validateColumnHasSpace = async (data) => {
        const row = helpers.findLowestEmptyRow(data.game.board, data.column);
        if (row < 0) {
            return Result.Err({ statusCode: 409, message: 'The selected column is full' });
        }
        return Result.Ok({ ...data, row });
    };

    return {
        validateAuthenticatedUser, validateCreatorExists, validateGameIdProvided, validateColumn,
        validateGameExistsByGameId, validateUserIsInGame, validateAcceptedPlayer,
        validateGameInProgress, validateTwoPlayers, validateIsPlayerTurn, validateColumnHasSpace,
    };
};
