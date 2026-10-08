import { gameService } from '../../container.js';
import { handleResult } from '../../Middleware/handleResult.js';

export const create = async (req, res, next) => {
    const result = await gameService.createGame({ creatorId: req.user.id });
    return handleResult(res, result.map((game) => ({
        message: 'Game created successfully',
        game_id: game.gameId,
    })), 201);
};

export const createInvitation = async (req, res) => {
    const result = await gameService.createInvitation({
        creatorId: req.user.id,
        opponentId: req.body?.opponent_id,
    });
    return handleResult(res, result, 201);
};

export const respondInvitation = async (req, res) => {
    const result = await gameService.respondInvitation({
        gameId: req.body?.game_id,
        userId: req.user.id,
        accept: req.body?.accept,
    });
    return handleResult(res, result, 201);
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
