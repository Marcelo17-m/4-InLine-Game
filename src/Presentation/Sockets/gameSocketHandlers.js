import { gameService, gameEvents } from '../../container.js';
import { safeSocketHandler } from './safeSocketHandler.js';
import { gameRoom, userRoom } from './connectionRegistry.js';

const emitResult = (socket, event, result) => {
    if (result.isErr()) {
        socket.emit('error', { event, message: result.error.message });
        return false;
    }
    socket.emit(event, result.value);
    return true;
};

export const registerGameSocketHandlers = (io) => {
    gameEvents.attach(io);
    io.on('connection', (socket) => {
        socket.join(userRoom(socket.user.id));
        const on = (event, handler) => socket.on(event, safeSocketHandler(socket, event, handler));
        // Match HTTP body keys; also accept the previous camelCase invitation payloads.
        const gameIdFrom = (data) => data.game_id ?? data.gameId;

        on('game:create', async () => {
            const result = await gameService.createGame({ creatorId: socket.user.id });
            if (result.isOk()) await gameEvents.publishState(result.value);
            emitResult(socket, 'game:create', result.map((game) => ({
                message: 'Game created successfully', game_id: game.gameId,
            })));
        });

        on('game:list', async () => {
            emitResult(socket, 'game:list', await gameService.getAllGames({ userId: socket.user.id }));
        });

        on('game:get', async (data) => {
            emitResult(socket, 'game:get', await gameService.getGameById({
                gameId: gameIdFrom(data), userId: socket.user.id,
            }));
        });

        // Rejoin an existing game room; this never adds a participant or starts a match.
        on('game:join', async (data) => {
            const result = await gameService.getGameForPlayer({ gameId: gameIdFrom(data), userId: socket.user.id });
            if (result.isErr()) return emitResult(socket, 'game:join', result);
            if (['pending', 'in_progress'].includes(result.value.state)) {
                await socket.join(gameRoom(result.value.gameId));
            }
            emitResult(socket, 'game:join', result);
            socket.emit('game:state', result.value);
        });

        on('game:invite', async (data) => {
            const result = await gameService.createInvitation({
                creatorId: socket.user.id, opponentId: data.opponent_id ?? data.opponentId,
            });
            if (result.isOk()) await gameEvents.invitationCreated(result.value);
            emitResult(socket, 'game:invite', result);
        });

        on('game:invitation:respond', async (data) => {
            const gameId = gameIdFrom(data);
            const result = await gameService.respondInvitation({ gameId, userId: socket.user.id, accept: data.accept });
            if (result.isOk()) await gameEvents.invitationResponded({ gameId, userId: socket.user.id, response: result.value });
            emitResult(socket, 'game:invitation:respond', result);
        });

        on('game:move', async (data) => {
            const result = await gameService.makeMove({
                gameId: gameIdFrom(data), userId: socket.user.id, column: data.column,
            });
            if (result.isOk()) await gameEvents.publishState(result.value);
            emitResult(socket, 'game:move', result);
        });

        on('game:leave', async (data) => {
            const result = await gameService.leaveGame({ gameId: gameIdFrom(data), userId: socket.user.id });
            if (result.isOk()) await gameEvents.publishState(result.value);
            emitResult(socket, 'game:leave', result);
        });

        on('game:update', async (data) => {
            const gameId = gameIdFrom(data);
            const result = await gameService.updateGame({ gameId, userId: socket.user.id, updates: data.updates });
            if (result.isOk()) await gameEvents.refreshState({ gameId, userId: socket.user.id });
            emitResult(socket, 'game:update', result);
        });

        on('game:delete', async (data) => {
            const result = await gameService.deleteGame({ gameId: gameIdFrom(data), userId: socket.user.id });
            if (result.isOk()) await gameEvents.gameDeleted(result.value);
            emitResult(socket, 'game:delete', result);
        });
        // Disconnect only removes Socket.IO memberships; abandonment requires game:leave.
    });
};
