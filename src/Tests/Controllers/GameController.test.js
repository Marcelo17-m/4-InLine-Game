import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import { gameService } from '../../container.js';
import Result from '../../Logic/Monads/result.js';

// Mockeamos el servicio para no tocar la base de datos real
jest.mock('../../container.js', () => ({
    gameService: {
        createGame: jest.fn(),
        getAllGames: jest.fn(),
        getGameById: jest.fn(),
        updateGame: jest.fn(),
        deleteGame: jest.fn(),
        joinGame: jest.fn(),
        startGame: jest.fn(),
        leaveGame: jest.fn(),
        endGame: jest.fn(),
        getGameState: jest.fn(),
        getGamePlayers: jest.fn(),
        getCurrentPlayer: jest.fn(),
        getTopCard: jest.fn(),
        getGameScores: jest.fn(),
        playCard: jest.fn(),
        drawCard: jest.fn(),
        sayUno: jest.fn(),
        catchUno: jest.fn(),
        getOwnHand: jest.fn(),
        getGameHistory: jest.fn(),
        getGameStateDetail: jest.fn(),
        suggestPlayableCard: jest.fn()
    }
}));

// Helper para generar tokens en las pruebas
const tokenFor =(userId, username = 'alice')=>
    jwt.sign({ sub: userId, username }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('GameController Tests',()=>{
    beforeEach(()=>{
        jest.clearAllMocks();
    });

    describe('POST /api/games',()=>{
        test('401 when trying to create without access_token', async()=>{
            const response = await request(app).post('/api/games').send({name:'Partida A'});

            expect(response.status).toBe(401);
            expect(gameService.createGame).not.toHaveBeenCalled();
        });

        test('201 creates a game successfully and returns custom JSON', async()=>{
            // El servicio devuelve el objeto `game` completo dentro de Result.Ok
            gameService.createGame.mockResolvedValue(Result.Ok({id:10, name:'Partida A', state:'waiting'}));

            const response = await request(app)
                .post('/api/games')
                .send({name:'Partida A', rules:'clásico', access_token:tokenFor(1)});

            expect(response.status).toBe(201);
            // El controlador manualmente envía { message, game_id } extraído de result.value.id
            expect(response.body).toEqual({message:'Game created successfully', game_id:10});
            
            // Verificamos que creatorId fue inyectado correctamente por el authMiddleware
            expect(gameService.createGame).toHaveBeenCalledWith({
                name: 'Partida A',
                rules: 'clásico',
                creatorId: 1, 
            });
        });

        test('400 when the service validation fails', async()=>{
            gameService.createGame.mockResolvedValue(
                Result.Err({ statusCode: 400, message: 'name and creatorId are mandatory' })
            );

            const response = await request(app)
                .post('/api/games')
                .send({access_token: tokenFor(1)});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({error: 'name and creatorId are mandatory'});
        });
    });

    describe('GET /api/games',()=>{
        test('401 without a token', async ()=>{
            const response = await request(app).get('/api/games');
            expect(response.status).toBe(401);
        });

        test('200 returns all games directly (does not use Result wrapper)',async()=>{
            // getAllGames devuelve el array directamente, no usa Result.Ok
            gameService.getAllGames.mockResolvedValue([{id: 1, name:'G1'}, {id:2, name:'G2'}]);

            const response = await request(app)
                .get('/api/games')
                .set('Authorization', `Bearer ${tokenFor(1)}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('G1');
        });
    });

    describe('GET /api/games/:id', () => {
        test('200 returns the game if found', async () => {
            gameService.getGameById.mockResolvedValue(Result.Ok({id: 1, name:'Partida A'}));

            const response = await request(app)
                .get('/api/games/1')
                .set('Authorization', `Bearer ${tokenFor(1)}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ id: 1, name: 'Partida A' });
        });

        test('404 when the game does not exist', async () => {
            gameService.getGameById.mockResolvedValue(Result.Err({statusCode:404, message:'Game not found'}));

            const response = await request(app)
                .get('/api/games/999')
                .set('Authorization', `Bearer ${tokenFor(1)}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/games/:id', () =>{
        test('200 updates the game and returns it',async()=> {
            gameService.updateGame.mockResolvedValue(Result.Ok({id: 1, state: 'in_progress'}));

            const response = await request(app)
                .put('/api/games/1')
                .send({state:'in_progress', access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({id: 1, state:'in_progress'});
            expect(gameService.updateGame).toHaveBeenCalledWith('1', {state:'in_progress', access_token:expect.any(String)});
        });
    });

    describe('DELETE /api/games/:id', () =>{
        test('204 successfully deletes the game with no body', async ()=>{
            // El servicio devuelve true envuelto en un Result.Ok
            gameService.deleteGame.mockResolvedValue(Result.Ok(true));

            const response = await request(app)
                .delete('/api/games/1')
                .send({access_token:tokenFor(1)});

            expect(response.status).toBe(204);
            expect(response.body).toEqual({});
        });

        test('404 fails to delete if game not found', async ()=>{
            gameService.deleteGame.mockResolvedValue(Result.Err({statusCode:404, message:'Game not found'}));

            const response = await request(app)
                .delete('/api/games/999')
                .send({access_token:tokenFor(1)});

            expect(response.status).toBe(404);
        });
    });

    describe('Game Action Routes (Join, Start, Leave, End)',()=>{
        test('POST /api/games/join - 200 handles joining correctly', async ()=>{
            gameService.joinGame.mockResolvedValue(Result.Ok({message: 'User joined the game successfully'}));

            const response = await request(app)
                .post('/api/games/join')
                .send({game_id:5, access_token:tokenFor(2)});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({message:'User joined the game successfully'});
            expect(gameService.joinGame).toHaveBeenCalledWith({gameId:5, userId:2});
        });

        test('POST /api/games/start - 200 handles starting the game', async () => {
            gameService.startGame.mockResolvedValue(Result.Ok({message:'Game started successfully'}));

            const response = await request(app)
                .post('/api/games/start')
                .send({game_id:5, access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(gameService.startGame).toHaveBeenCalledWith({gameId:5, userId:1});
        });

        test('POST /api/games/leave - 200 handles leaving the game', async()=> {
            gameService.leaveGame.mockResolvedValue(Result.Ok({message:'User left the game successfully'}));

            const response = await request(app)
                .post('/api/games/leave')
                .send({game_id:5, access_token:tokenFor(3)});

            expect(response.status).toBe(200);
            expect(gameService.leaveGame).toHaveBeenCalledWith({gameId:5, userId:3});
        });

        test('POST /api/games/end - 200 handles ending the game', async()=> {
            gameService.endGame.mockResolvedValue(Result.Ok({message:'Game ended successfully'}));

            const response = await request(app)
                .post('/api/games/end')
                .send({game_id: 5, access_token: tokenFor(1)});

            expect(response.status).toBe(200);
            expect(gameService.endGame).toHaveBeenCalledWith({gameId: 5, userId: 1});
        });
    });

    describe('Game State and Query Routes (State, Players, Current-Player, Top-Card, Scores)', ()=> {
        test('POST /api/games/state - 200 returns the current state', async ()=>{
            gameService.getGameState.mockResolvedValue(Result.Ok({game_id: 1, state: 'in_progress'}));

            const response = await request(app)
                .post('/api/games/state')
                .send({game_id: 1, access_token: tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({game_id: 1, state: 'in_progress'});
        });

        test('POST /api/games/players - 200 returns the list of players', async () => {
            gameService.getGamePlayers.mockResolvedValue(Result.Ok({game_id: 1, players:['alice', 'bob']}));

            const response = await request(app)
                .post('/api/games/players')
                .send({game_id: 1, access_token: tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.players).toEqual(['alice', 'bob']);
        });

        test('POST /api/games/current-player - 200 returns the current player turn', async () => {
            gameService.getCurrentPlayer.mockResolvedValue(Result.Ok({game_id: 1, current_player: 'alice'}));

            const response = await request(app)
                .post('/api/games/current-player')
                .send({game_id: 1, access_token: tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.current_player).toBe('alice');
        });

        test('POST /api/games/top-card - 200 returns the top card', async () => {
            gameService.getTopCard.mockResolvedValue(Result.Ok({ game_id: 1, top_card: 'red 7' }));

            const response = await request(app)
                .post('/api/games/top-card')
                .send({game_id: 1, access_token: tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.top_card).toBe('red 7');
        });

        test('POST /api/games/scores - 200 returns the scores mapping', async () => {
            gameService.getGameScores.mockResolvedValue(Result.Ok({game_id: 1, scores:{ alice: 20, bob: 15 }}));

            const response = await request(app)
                .post('/api/games/scores')
                .send({game_id: 1, access_token: tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.scores).toEqual({ alice: 20, bob: 15 });
        });

        test('POST /api/games/state - 404 when querying state of a non-existent game', async () => {
            gameService.getGameState.mockResolvedValue(Result.Err({ statusCode: 404, message: 'Game not found'}));

            const response = await request(app)
                .post('/api/games/state')
                .send({game_id: 999, access_token: tokenFor(1)});

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'Game not found' }); // Asumiendo que handleResult mapea 'message' a 'error' en status >= 400
        });
    });

    describe('POST /api/games/play-card', ()=>{
        test('200 plays a normal card', async()=>{
            gameService.playCard.mockResolvedValue(Result.Ok({ message: 'Card played successfully', nextPlayerTurn: 2 }));

            const response = await request(app).post('/api/games/play-card')
                .send({game_id:5, card:'red 7', access_token: tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({message:'Card played successfully', nextPlayerTurn:2});
            expect(gameService.playCard).toHaveBeenCalledWith({
                gameId:5,
                userId:1,
                cardString:'red 7',
                chosenColor:undefined,
            });
        });

        test('200 plays a wild card with chose_color', async()=>{
            gameService.playCard.mockResolvedValue(Result.Ok({ message: 'Card played successfully', nextPlayerTurn: 3 }));

            const response = await request(app).post('/api/games/play-card')
                .send({game_id:5,card:'wild_draw_four', chosen_color:'blue', access_token: tokenFor(1) });

            expect(response.status).toBe(200);
            expect(gameService.playCard).toHaveBeenCalledWith({
                gameId:5,
                userId:1,
                cardString:'wild_draw_four',
                chosenColor: 'blue',
            });
        });

        test('400 when the move is invalid', async()=>{
            gameService.playCard.mockResolvedValue(
                Result.Err({ statusCode: 400, message: 'Invalid card. Please play a card that matches the top card on the discard pile' })
            );

            const response = await request(app).post('/api/games/play-card')
                .send({game_id:5,card:'blue 3', access_token: tokenFor(1)});

            expect(response.status).toBe(400);
        });

        test('403 when its not your turn', async()=>{
            gameService.playCard.mockResolvedValue(Result.Err({ statusCode: 403, message: 'It is not your turn to play.' }));

            const response = await request(app).post('/api/games/play-card')
                .send({game_id:5,card:'red 7', access_token: tokenFor(2)});

            expect(response.status).toBe(403);
        });
    });

    describe('POST /api/games/draw-card', ()=>{
        test('200 draws a card successfully', async()=>{
            gameService.drawCard.mockResolvedValue(
                Result.Ok({ message: 'Card drawn successfully', cardDrawn: 'green reverse', nextPlayerTurn: 2 }));
            
            const response = await request(app).post('/api/games/draw-card')
                .send({game_id:5,access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.cardDrawn).toBe('green reverse');
            expect(gameService.drawCard).toHaveBeenCalledWith({gameId:5, userId:1});
        });

        test('400 when the player has a playable card and must play instead', async()=>{
            gameService.drawCard.mockResolvedValue(
                Result.Err({statusCode:400,message:'You have a playable card, you must play it instead of drawing'})
            );

            const response = await request(app).post('/api/games/draw-card')
                .send({game_id:5, access_token: tokenFor(1)});

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/games/say-uno', ()=>{
        test('200 says UNO successfully', async()=>{
            gameService.sayUno.mockResolvedValue(Result.Ok({message: 'Player Said UNOOOO successfully'}));

            const response = await request(app).post('/api/games/say-uno')
                .send({game_id:5,access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(gameService.sayUno).toHaveBeenCalledWith({gameId:5, userId:1});
        });

        test('400 when player doesnt have exactly one card', async()=>{
            gameService.sayUno.mockResolvedValue(
                Result.Err({ statusCode: 400, message: 'You dont have exactly one card in your hand cheater!' })
            );

            const response = await request(app).post('/api/games/say-uno')
                .send({game_id:5,access_token:tokenFor(1)});

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/games/catch-uno', ()=>{
        test('200 catches a player who didnt say UNO', async()=>{
            gameService.catchUno.mockResolvedValue(
                Result.Ok({ message: 'Player was caught without saying UNO and drew 2 penalty cards' })
            );

            const response = await request(app).post('/api/games/catch-uno')
                .send({game_id:5, target_user_id:2,access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(gameService.catchUno).toHaveBeenCalledWith({gameId:5, userId:1, targetUserId:2});
        });

        test('400 when trying to catch yourself', async()=>{
            gameService.catchUno.mockResolvedValue(
                Result.Err({ statusCode: 400, message: 'You cant snitch yourself for not saying uno bro' })
            );

            const response = await request(app).post('/api/games/catch-uno')
                .send({game_id:5, target_user_id:1,access_token:tokenFor(1)});

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/games/hand', ()=>{
        test('200 returns your own hand', async()=>{
            gameService.getOwnHand.mockResolvedValue(Result.Ok({ hand: ['red 3', 'blue skip', 'wild'] }));

            const response = await request(app).post('/api/games/hand')
                .send({game_id:5,access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.hand).toEqual(['red 3', 'blue skip', 'wild']);
            expect(gameService.getOwnHand).toHaveBeenCalledWith({ gameId: 5, userId: 1 });
        });
        
        test('400 when the user is not part of the game', async()=>{
            gameService.getOwnHand.mockResolvedValue(
                Result.Err({statusCode:400, message: 'You are not part of this game'})
            );

            const response = await request(app)
                .post('/api/games/hand')
                .send({ game_id: 5, access_token: tokenFor(99) });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/games/history', ()=>{
        test('200 returns the game history', async()=>{
            gameService.getGameHistory.mockResolvedValue(Result.Ok({
                history:[
                    {player:'moni', action:'Played red 5'},
                    {player:'marce', action:'Drew a card'},
                ],
            }));

            const response = await request(app).post('/api/games/history')
                .send({game_id:5, access_token: tokenFor(1)});
            
            expect(response.status).toBe(200);
            expect(response.body.history).toHaveLength(2);
            expect(gameService.getGameHistory).toHaveBeenCalledWith(5);
        });

        test('404 when the game does not exists', async()=>{
            gameService.getGameHistory.mockResolvedValue(Result.Err({ statusCode: 404, message: 'Game not found' }));


            const response = await request(app).post('/api/games/history')
                .send({game_id:999, access_token: tokenFor(1)});

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/games/state-detail', ()=>{
        test('200 returns detailed state, own hand reveleade and rivals hidden', async()=>{
            gameService.getGameStateDetail.mockResolvedValue(Result.Ok({
                currentPlayer: 'alice',
                topCard: 'green 7',
                hands: {
                    alice: ['red 3', 'blue skip', 'green 7'],
                    bob: { cardCount: 5 },
                },
                turnHistory: [{ player: 'alice', action: 'Played green 7' }],
            }));

            const response = await request(app).post('/api/games/state-detail')
                .send({game_id:5,access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.hands.alice).toEqual(['red 3', 'blue skip', 'green 7']);
            expect(response.body.hands.bob).toEqual({ cardCount: 5 });
            expect(gameService.getGameStateDetail).toHaveBeenCalledWith({ gameId: 5, userId: 1 });
        });

        test('400 when the user is not part of the game', async()=>{
            gameService.getGameStateDetail.mockResolvedValue(
                Result.Err({ statusCode: 400, message: 'You are not part of this game' })
            );

            const response = await request(app).post('/api/games/state-detail')
                .send({game_id:5, access_token:tokenFor(99)});

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/games/suggest-card', () => {
        test('200 returns a playable card suggestion', async () => {
            gameService.suggestPlayableCard.mockResolvedValue(Result.Ok({
                game_id:5,
                suggested_card:'green reverse',
                message:'Playable card found',
            }));

            const response = await request(app).post('/api/games/suggest-card')
                .send({game_id:5, access_token:tokenFor(1)});

            expect(response.status).toBe(200);
            expect(response.body.suggested_card).toBe('green reverse');
            expect(gameService.suggestPlayableCard).toHaveBeenCalledWith({gameId:5, userId:1});
        });

        test('403 when it is not the requesting user turn', async () => {
            gameService.suggestPlayableCard.mockResolvedValue(
                Result.Err({statusCode:403, message:'It is not your turn to play.'})
            );

            const response = await request(app).post('/api/games/suggest-card')
                .send({game_id:5, access_token:tokenFor(2)});

            expect(response.status).toBe(403);
        });
    });
});
