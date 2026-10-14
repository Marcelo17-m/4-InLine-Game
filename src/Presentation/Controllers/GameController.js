import { gameService, gameEvents } from '../../container.js';
import { handleResult } from '../../Middleware/handleResult.js';

export const getAll = async (req, res, next) => {
    const result = await gameService.getAllGames({ userId: req.user.id });
    return handleResult(res, result);
};

export const getById = async (req, res, next) => {
    const result = await gameService.getGameById({ gameId: req.body?.game_id, userId: req.user.id });
    return handleResult(res, result);
};

export const deleteGame = async (req, res, next) => {
    const result = await gameService.deleteGame({ gameId: req.body?.game_id, userId: req.user.id });
    if (result.isOk()) await gameEvents.gameDeleted(result.value);
    return handleResult(res, result);
};

export const update = async (req, res, next) => {
    const result = await gameService.updateGame({
        gameId: req.body?.game_id, userId: req.user.id, updates: req.body?.updates,
    });
    if (result.isOk()) await gameEvents.refreshState({ gameId: req.body.game_id, userId: req.user.id });
    return handleResult(res, result);
};

export const create = async (req, res, next) => {
    const result = await gameService.createGame({ creatorId: req.user.id });
    if (result.isOk()) await gameEvents.publishState(result.value);
    return handleResult(res, result.map((game) => ({
        message: 'Game created successfully',
        game_id: game.gameId,
    })), 201);
};

export const createInvitation = async (req, res) => {
    const result = await gameService.createInvitation({
        gameId: req.body?.game_id,
        creatorId: req.user.id,
        opponentId: req.body?.opponent_id,
    });
    if (result.isOk()) await gameEvents.invitationCreated(result.value);
    return handleResult(res, result, 201);
};

export const respondInvitation = async (req, res) => {
    const result = await gameService.respondInvitation({
        gameId: req.body?.game_id,
        userId: req.user.id,
        accept: req.body?.accept,
    });
    if (result.isOk()) await gameEvents.invitationResponded({
        gameId: req.body.game_id, userId: req.user.id, response: result.value,
    });
    return handleResult(res, result, 201);
};

export const start = async (req, res) => {
    const result = await gameService.startGame({ gameId: req.body?.game_id, userId: req.user.id });
    if (result.isOk()) await gameEvents.publishState(result.value);
    return handleResult(res, result);
};

export const makeMove = async (req, res, next) => {
    const result = await gameService.makeMove({
        gameId: req.body?.game_id,
        userId: req.user.id,
        column: req.body?.column,
    });
    if (result.isOk()) await gameEvents.publishState(result.value);
    return handleResult(res, result);
};

export const leave = async (req, res, next) => {
    const result = await gameService.leaveGame({
        gameId: req.body?.game_id,
        userId: req.user.id,
    });
    if (result.isOk()) await gameEvents.publishState(result.value);
    return handleResult(res, result);
};
