//the sockets controller
import { gameService } from "../../container.js";
import logger from '../../Helpers/logger.js';
import { safeSocketHandler } from "./safeSocketHandler.js";
import {registerConnection, setConnectionGame, removeConnection, getSocketsInGame,} 
from './connectionRegistry.js';

//after every action that changes the state, each connected player receives his own view of the game
//his own hand and the rivals just in quantity
const broadcastGameState = async (io, gameId) => {
    for (const {socket, userId} of getSocketsInGame(io,gameId)){
        try {
            const result = await gameService.getGameStateDetail({gameId, userId});
            if (result.isOk()){
                socket.emit('game-state', result.value);
            }
        } catch (err){
            logger.error(`broadcastGameState failed for user ${userId} in game ${gameId}:`);
            logger.error(err);
        }
    }
};

const emitResult = (socket, eventName, result) =>{
    if (result.isErr()) {
        socket.emit('error',{event:eventName,message:result.error.message});
        return false;
    }
    socket.emit(eventName,result.value);
    return true;
};

export const registerGameSocketHandlers = (io) =>{
    io.on('connection', (socket) => {
        registerConnection(socket.id, socket.user.id);

        socket.on('join', safeSocketHandler(socket, 'join', async({game_id})=>{
            const result = await gameService.joinGame({gameId:game_id,userId:socket.user.id});

            const alreadyJoined = result.isErr() && result.error.message === 'You are alredy in this game';
            if (result.isErr() && !alreadyJoined) {
                return emitResult(socket, 'join', result);
            }

            socket.join(`game-${game_id}`);
            setConnectionGame(socket.id, game_id);
            const players = await gameService.getGamePlayers(game_id);
            io.to(`game-${game_id}`).emit('join', {
                message: `${socket.user.username} has joined the game.`,
                players: players.isOk() ? players.value.players : [],
            });
        }));
        socket.on('start-game', safeSocketHandler(socket, 'start-game', async ({ game_id }) => {
            const result = await gameService.startGame({gameId:game_id,userId:socket.user.id });
            if (!emitResult(socket, 'start-game', result)) return;
            await broadcastGameState(io, game_id);
        }));

        socket.on('play-card', safeSocketHandler(socket, 'play-card', async ({ game_id, card, chosen_color }) => {
            const result = await gameService.playCard({
                gameId: game_id, userId: socket.user.id, cardString:card, chosenColor:chosen_color,
            });
            if (!emitResult(socket, 'play-card', result)) return;

            if (result.value.scores) {
                io.to(`game-${game_id}`).emit('game-ended', result.value);
            }

            await broadcastGameState(io, game_id);
        }));

        socket.on('draw-card', safeSocketHandler(socket, 'draw-card', async ({ game_id }) => {
            const result = await gameService.drawCard({gameId:game_id, userId:socket.user.id});
            if (!emitResult(socket, 'draw-card', result)) return;
            await broadcastGameState(io, game_id);
        }));

        socket.on('say-uno', safeSocketHandler(socket, 'say-uno', async ({ game_id }) => {
            const result = await gameService.sayUno({gameId:game_id, userId:socket.user.id});
            if (!emitResult(socket, 'say-uno', result)) return;
            await broadcastGameState(io, game_id);
        }));

        socket.on('catch-uno', safeSocketHandler(socket, 'catch-uno', async ({ game_id, target_user_id }) => {
            const result = await gameService.catchUno({
                gameId:game_id, userId:socket.user.id, targetUserId:target_user_id,
            });
            if (!emitResult(socket, 'catch-uno', result)) return;
            await broadcastGameState(io, game_id);
        }));

        socket.on('leave-game', safeSocketHandler(socket, 'leave-game', async ({ game_id }) => {
            const result = await gameService.leaveGame({gameId:game_id, userId:socket.user.id});
            if (!emitResult(socket, 'leave-game', result)) return;
            socket.leave(`game-${game_id}`);
            await broadcastGameState(io, game_id);
        }));

        socket.on('disconnect', safeSocketHandler(socket, 'disconnect', async () => {
            removeConnection(socket.id);
            //future rule to add that we do not force the lave game
        }));
    })
}
