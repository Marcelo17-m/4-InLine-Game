import logger from '../../Helpers/logger.js';
import socketAuthMiddleware from '../../Middleware/socketAuthMiddleware.js';

// Wraps a socket.io handler. If something goes wrong inside a real bug,
// a malformed payload, a gameService that throws something unexpected it
// catches it here, logs it, and notifies ONLY that socket with an
// ‘error’ event. Without this, that exception escapes as a rejected promise
// with no one to catch it (unhandledRejection) and crashes the
// entire process disconnecting all players from all
// games, not just the one who caused the bug.
export const safeSocketHandler = (socket, eventName, handler) => async (payload) => {
    try {
        // Reuse handshake authentication so an expired or logged-out token cannot act.
        const authError = await new Promise((resolve) => socketAuthMiddleware(socket, resolve));
        if (authError) {
            socket.emit('error', { event: eventName, message: authError.message });
            return;
        }
        const data = payload ?? {};
        if (typeof data !== 'object' || Array.isArray(data)) {
            socket.emit('error', { event: eventName, message: 'Payload must be a JSON object' });
            return;
        }
        await handler(data);
    } catch (err) {
        logger.error(`Socket event "${eventName}" (user ${socket.user?.id ?? 'unknown'}) threw an unexpected error:`);
        logger.error(err);
        socket.emit('error', {event:eventName, message:'Something went wrong on the server'});
    }
};
