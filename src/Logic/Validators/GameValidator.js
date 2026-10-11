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

    const validateGameCreator = async (data) => {
        if (Number(data.game.creatorId) !== data.userId) {
            return Result.Err({ statusCode: 403, message: 'Only the creator can update or delete this game' });
        }
        return Result.Ok(data);
    };

    const validateUpdateFields = async (data) => {
        const { updates } = data;
        const allowed = ['board', 'state', 'currentPlayerId', 'winnerId', 'finishReason'];
        if (!updates || typeof updates !== 'object' || Array.isArray(updates) || !Object.keys(updates).length) {
            return Result.Err({ statusCode: 400, message: 'updates must be a non-empty object' });
        }
        if (Object.keys(updates).some((field) => !allowed.includes(field))) {
            return Result.Err({ statusCode: 400, message: 'Only board, state, currentPlayerId, winnerId and finishReason can be updated' });
        }
        const changes = { ...updates };
        for (const field of ['currentPlayerId', 'winnerId']) {
            if (Object.hasOwn(changes, field) && changes[field] !== null) {
                const id = Number(changes[field]);
                if (!['number', 'string'].includes(typeof changes[field]) || !Number.isSafeInteger(id) || id <= 0) {
                    return Result.Err({ statusCode: 400, message: field + ' must be a positive integer or null' });
                }
                changes[field] = id;
            }
        }
        return Result.Ok({ ...data, updates: changes });
    };

    const validateUpdatedBoard = async (data) => {
        if (Object.hasOwn(data.updates, 'board')) {
            const { board } = data.updates;
            if (!Array.isArray(board) || board.length !== helpers.ROWS ||
                Array.from(board).some((row) => !Array.isArray(row) || row.length !== helpers.COLUMNS ||
                    Array.from(row).some((cell) => ![0, 1, 2].includes(cell)))) {
                return Result.Err({ statusCode: 400, message: 'board must be a 6 by 7 matrix containing only 0, 1 and 2' });
            }
        }
        return Result.Ok(data);
    };

    const validateUpdatedGameState = async (data) => {
        const proposed = {
            state: data.game.state, currentPlayerId: data.game.currentPlayerId,
            winnerId: data.game.winnerId, finishReason: data.game.finishReason,
            ...data.updates,
        };
        if (!['pending', 'in_progress', 'finished', 'rejected'].includes(proposed.state)) {
            return Result.Err({ statusCode: 400, message: 'Invalid game state' });
        }
        const players = await gamePlayerRepository.findByGameId(data.gameId);
        if (proposed.currentPlayerId != null && !players.some((player) =>
            Number(player.userId) === proposed.currentPlayerId && player.invitationStatus === 'accepted')) {
            return Result.Err({ statusCode: 400, message: 'The current player must be an accepted participant' });
        }
        if (proposed.winnerId != null && !players.some((player) => Number(player.userId) === proposed.winnerId)) {
            return Result.Err({ statusCode: 400, message: 'The winner must belong to this game' });
        }
        if (proposed.state === 'in_progress') {
            if (players.length !== 2 || players.some((player) => player.invitationStatus !== 'accepted') ||
                new Set(players.map((player) => player.piece)).size !== 2 ||
                players.some((player) => !['R', 'Y'].includes(player.piece)) || proposed.currentPlayerId == null) {
                return Result.Err({ statusCode: 400, message: 'An active game requires two accepted players and a current player' });
            }
        } else if (proposed.currentPlayerId != null) {
            return Result.Err({ statusCode: 400, message: 'Only an active game can have a current player' });
        }
        if (proposed.state === 'finished') {
            if (!['four_in_line', 'draw', 'abandoned'].includes(proposed.finishReason) ||
                ((proposed.finishReason === 'draw') !== (proposed.winnerId == null))) {
                return Result.Err({ statusCode: 400, message: 'A finished game requires a valid reason and a winner, except for a draw' });
            }
        } else if (proposed.state === 'rejected') {
            if (proposed.finishReason !== 'rejected' || proposed.winnerId != null) {
                return Result.Err({ statusCode: 400, message: 'A rejected game requires reason rejected and no winner' });
            }
        } else if (proposed.winnerId != null || proposed.finishReason != null) {
            return Result.Err({ statusCode: 400, message: 'An unfinished game cannot have a winner or finish reason' });
        }
        return Result.Ok({ ...data, proposed });
    };

    const validateCreateInvitationInput = async (data) => {
        const creatorId = Number(data.creatorId);
        const opponentId = Number(data.opponentId);
        if (!Number.isSafeInteger(creatorId) || creatorId <= 0 || !Number.isSafeInteger(opponentId) || opponentId <= 0) {
            return Result.Err({ statusCode: 400, message: 'creatorId and opponentId must be positive integers' });
        }
        if (creatorId === opponentId) {
            return Result.Err({ statusCode: 400, message: 'You cannot invite yourself' });
        }
        const [creator, opponent] = await Promise.all([
            userRepository.findById(creatorId),
            userRepository.findById(opponentId),
        ]);
        if (!creator) return Result.Err({ statusCode: 404, message: 'Creator not found' });
        if (!opponent) return Result.Err({ statusCode: 404, message: 'Opponent not found' });
        const [creatorGames, opponentGames] = await Promise.all([
            gamePlayerRepository.findActiveGamesByUserId(creatorId),
            gamePlayerRepository.findActiveGamesByUserId(opponentId),
        ]);
        if (creatorGames.length || opponentGames.length) {
            return Result.Err({ statusCode: 409, message: 'Both players must be available to start a game' });
        }
        return Result.Ok({ ...data, creatorId, opponentId, creator, opponent });
    };

    const validateRespondInvitationInput = async (data) => {
        const gameId = Number(data.gameId);
        const userId = Number(data.userId);
        if (!Number.isSafeInteger(gameId) || gameId <= 0 || !Number.isSafeInteger(userId) || userId <= 0) {
            return Result.Err({ statusCode: 400, message: 'gameId and authenticated userId must be positive integers' });
        }
        if (typeof data.accept !== 'boolean') {
            return Result.Err({ statusCode: 400, message: 'accept must be a boolean' });
        }
        return Result.Ok({ ...data, gameId, userId });
    };

    return {
        validateAuthenticatedUser, validateCreatorExists, validateGameIdProvided, validateColumn,
        validateGameExistsByGameId, validateUserIsInGame, validateAcceptedPlayer,
        validateGameInProgress, validateTwoPlayers, validateIsPlayerTurn, validateColumnHasSpace,
        validateCreateInvitationInput, validateRespondInvitationInput,
        validateGameCreator, validateUpdateFields, validateUpdatedBoard, validateUpdatedGameState,
    };
};
