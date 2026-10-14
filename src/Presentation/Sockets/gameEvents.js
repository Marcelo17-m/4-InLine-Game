import logger from '../../Helpers/logger.js';
import { gameRoom, userRoom, joinPlayersToGame, leaveGameRoom } from './connectionRegistry.js';

// Shared by HTTP controllers and socket handlers; persistence stays in GameService.
export const createGameEvents = ({ gameService }) => {
    let io;
    const attach = (server) => { io = server; };
    const notify = async (operation) => {
        if (!io) return;
        try {
            await operation();
        } catch (error) {
            // A notification failure must not turn a saved move into a failed HTTP request.
            logger.error('Could not publish game event');
            logger.error(error);
        }
    };

    const sendState = (state) => {
        joinPlayersToGame(io, state.gameId, state.players.map((player) => player.userId));
        io.to(gameRoom(state.gameId)).emit('game:state', state);
        if (state.state === 'finished') io.to(gameRoom(state.gameId)).emit('game:ended', state);
        if (['finished', 'rejected'].includes(state.state)) leaveGameRoom(io, state.gameId);
    };
    const publishState = (state) => notify(() => sendState(state));
    const refreshState = (data) => notify(async () => {
        const result = await gameService.getGameById(data);
        if (result.isErr()) throw new Error(result.error.message);
        sendState(result.value);
    });
    const invitationCreated = (invitation) => notify(async () => {
        joinPlayersToGame(io, invitation.gameId, [invitation.creator.id, invitation.opponentId]);
        io.to(userRoom(invitation.opponentId)).emit('game:invitation', invitation);
        const result = await gameService.getGameById({ gameId: invitation.gameId, userId: invitation.creator.id });
        if (result.isErr()) throw new Error(result.error.message);
        sendState(result.value);
    });
    const invitationResponded = ({ gameId, userId, response }) => notify(async () => {
        // The service returns a message/status, so read the saved board separately.
        const result = await gameService.getGameById({ gameId, userId });
        if (result.isErr()) throw new Error(result.error.message);
        const state = result.value;
        joinPlayersToGame(io, state.gameId, state.players.map((player) => player.userId));
        const event = response.status === 'ACCEPTED' ? 'game:invitation:accepted' : 'game:invitation:rejected';
        io.to(gameRoom(state.gameId)).to(userRoom(userId)).emit(event, { ...response, gameId: state.gameId });
        if (response.status === 'REJECTED') {
            // The recipient is no longer a participant; keep only the creator in the waiting room.
            io.in(userRoom(userId)).socketsLeave(gameRoom(state.gameId));
        }
        sendState(state);
    });
    const gameDeleted = (response) => notify(() => {
        io.to(gameRoom(response.game_id)).emit('game:deleted', response);
        leaveGameRoom(io, response.game_id);
    });

    return { attach, publishState, refreshState, invitationCreated, invitationResponded, gameDeleted };
};
