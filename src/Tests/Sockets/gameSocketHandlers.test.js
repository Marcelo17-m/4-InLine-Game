import { gameService } from '../../container.js';
import Result from '../../Logic/Monads/result.js';
import { registerGameSocketHandlers } from '../../Presentation/Sockets/gameSocketHandlers.js';

jest.mock('../../container.js', () => ({
    gameService: {
        playCard: jest.fn(),
        getGameStateDetail: jest.fn(),
    },
}));

describe('game socket handlers', () => {
    test('broadcasts the final result to the entire room when a player wins', async () => {
        const socketHandlers = {};
        const roomEmit = jest.fn();
        const socket = {
            id: 'socket-1',
            user: {id: 1, username: 'alice'},
            on: jest.fn((eventName, handler) => {
                socketHandlers[eventName] = handler;
            }),
            emit: jest.fn(),
        };
        const io = {
            on: jest.fn((eventName, handler) => {
                if (eventName === 'connection') handler(socket);
            }),
            to: jest.fn(() => ({emit: roomEmit})),
            sockets: {
                adapter: {rooms: new Map([['game-5', new Set([socket.id])]])},
                sockets: new Map([[socket.id, socket]]),
            },
        };
        const finalResult = {
            message: 'alice has won the game!',
            scores: {alice: 170, bob: 45},
        };

        gameService.playCard.mockResolvedValue(Result.Ok(finalResult));
        gameService.getGameStateDetail.mockResolvedValue(Result.Err({message: 'Game finished'}));

        registerGameSocketHandlers(io);
        await socketHandlers['play-card']({game_id: 5, card: 'red 7', chosen_color: null});

        expect(socket.emit).toHaveBeenCalledWith('play-card', finalResult);
        expect(io.to).toHaveBeenCalledWith('game-5');
        expect(roomEmit).toHaveBeenCalledWith('game-ended', finalResult);
    });
});
