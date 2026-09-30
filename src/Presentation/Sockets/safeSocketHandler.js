import logger from '../../Helpers/logger.js';

// Wraps a socket.io handler. If something goes wrong inside a real bug,
// a malformed payload, a gameService that throws something unexpected it
// catches it here, logs it, and notifies ONLY that socket with an
// ‘error’ event. Without this, that exception escapes as a rejected promise
// with no one to catch it (unhandledRejection) and crashes the
// entire process disconnecting all players from all
// games, not just the one who caused the bug.
export const safeSocketHandler = (socket, eventName, handler) => async (payload) => {
    try {
        await handler(payload);
    } catch (err) {
        logger.error(`Socket event "${eventName}" (user ${socket.user?.id ?? 'unknown'}) threw an unexpected error:`);
        logger.error(err);
        socket.emit('error', {event:eventName, message:'Something went wrong on the server'});
    }
};