//Concurrent map: what socket is from each user and what game is in.
//It allows us to know who is connected where without consulting back the db
//in each broadcast
const connections = new Map(); //socketId -> {userid, gameId}

export const registerConnection = (socketId, userId) => {
    connections.set(socketId,{userId,gameId:null});
};

export const setConnectionGame = (socketId, gameId) => {
    const entry = connections.get(socketId);
    if (entry) entry.gameId = gameId;
};

export const removeConnection = (socketId) => {
    connections.delete(socketId);
};

//Generator that runs all the sockets connected to a specific game
//it relays on the internal rooms of socket.io and it sends the userId
//that we save to be able to send each one a different view of the same game
export function* getSocketsInGame(io, gameId) {
    const room = io.sockets.adapter.rooms.get(`game-${gameId}`);
    if(!room) return;

    for (const socketId of room) {
        const socket=io.sockets.sockets.get(socketId);
        const connection=connections.get(socketId);
        if (socket &&connection) {
            yield {socket, userId:connection.userId};
        }
    }
}