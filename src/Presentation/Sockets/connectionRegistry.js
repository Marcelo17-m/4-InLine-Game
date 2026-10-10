// Socket.IO owns membership and automatically removes disconnected sockets.
export const userRoom = (userId) => `user:${userId}`;
export const gameRoom = (gameId) => `game-${gameId}`;

export const joinPlayersToGame = (io, gameId, userIds) => {
    for (const userId of new Set(userIds)) {
        io.in(userRoom(userId)).socketsJoin(gameRoom(gameId));
    }
};

export const leaveGameRoom = (io, gameId) => {
    io.in(gameRoom(gameId)).socketsLeave(gameRoom(gameId));
};
