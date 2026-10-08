import { gameService } from '../../container.js';
import { handleResult } from '../../Middleware/handleResult.js';

export const create = async (req, res, next) => {
    const result = await gameService.createGame({ creatorId: req.user.id });
    return handleResult(res, result.map(() => ({ message: 'Game created successfully' })), 201);
};

export const makeMove = async (req, res, next) => {
    const result = await gameService.makeMove({
        gameId: req.body?.game_id,
        userId: req.user.id,
        column: req.body?.column,
    });
    return handleResult(res, result);
};

export const leave = async (req, res, next) => {
    const result = await gameService.leaveGame({
        gameId: req.body?.game_id,
        userId: req.user.id,
    });
    return handleResult(res, result);
};
