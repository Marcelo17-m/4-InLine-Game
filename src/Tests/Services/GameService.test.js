import { createGameService } from "../../Logic/Services/GameService.js";
import Result from "../../Logic/Monads/result.js";

describe('GameService Unit Tests', () => {
    let gameRepository, userRepository, gamePlayerRepository, 
    cardRepository, scoreRepository, historyRepository, gameRules, helpers, gameService;
    beforeEach(() => {
        gameRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        userRepository = {
            findById: jest.fn(),
        };

        gamePlayerRepository = {
            create: jest.fn(),
            findByGameId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        cardRepository = {
            bulkCreate: jest.fn(),
            findTopDiscard: jest.fn(),
            update: jest.fn(),
            findPlayerHand: jest.fn(),
            findNextInDeck: jest.fn(),
            findDiscardPile: jest.fn(),
        };

        scoreRepository = {
            create: jest.fn(),
        };

        historyRepository ={
            create: jest.fn(),
            findByGameId: jest.fn(),
        }        

        gameRules = {
            validateCreateGame: jest.fn(),
            validateGetGame: jest.fn(),
            validateUpdateGame: jest.fn(),
            validateDeleteGame: jest.fn(),
            validateJoinGame: jest.fn(),
            validateStartGame: jest.fn(),
            validateLeaveGame: jest.fn(),
            validateEndGame: jest.fn(),
            validateGetGameState: jest.fn(),
            validateGetGamePlayers: jest.fn(),
            validateGetCurrentPlayer: jest.fn(),
            validateGetTopCard: jest.fn(),
            validateGetGameScores: jest.fn(),
            validatePlayCard: jest.fn(),
            validateDrawCard: jest.fn(),
            validateSayUno: jest.fn(),
            validateCatchUno: jest.fn(),
            validateGetGameHistory: jest.fn(),
            validateGetOwnHand: jest.fn(),
            validateGetGameStateDetail: jest.fn(), 
            validateSuggestPlayableCard: jest.fn(),
        };

        helpers ={
            generateAndShuffleDeck: jest.fn(),
            distributeCardsRecursively: jest.fn(),
            calculateHandScore: jest.fn(),
            isValidMove: jest.fn(),
        }
        
        gameService = createGameService({gameRepository, userRepository, gamePlayerRepository, 
            cardRepository, scoreRepository, historyRepository, gameRules, helpers});
    });

    describe('validation failures', () => {
        test.each([
            ['createGame', 'validateCreateGame', [{ name: 'G1', rules: 'classic', creatorId: 1 }], { name: 'G1', rules: 'classic', creatorId: 1 }],
            ['getGameById', 'validateGetGame', [1], { id: 1 }],
            ['updateGame', 'validateUpdateGame', [1, { name: 'G2' }], { id: 1, name: 'G2' }],
            ['deleteGame', 'validateDeleteGame', [1], { id: 1 }],
            ['joinGame', 'validateJoinGame', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['startGame', 'validateStartGame', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['leaveGame', 'validateLeaveGame', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['endGame', 'validateEndGame', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['getGameState', 'validateGetGameState', [1], { id: 1 }],
            ['getGamePlayers', 'validateGetGamePlayers', [1], { id: 1 }],
            ['getCurrentPlayer', 'validateGetCurrentPlayer', [1], { id: 1 }],
            ['getTopCard', 'validateGetTopCard', [1], { id: 1 }],
            ['getGameScores', 'validateGetGameScores', [1], { id: 1 }],
            ['playCard', 'validatePlayCard', [{ gameId: 1, userId: 2, cardString: 'wild', chosenColor: 'red' }], { gameId: 1, userId: 2, cardString: 'wild', chosenColor: 'red' }],
            ['drawCard', 'validateDrawCard', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['sayUno', 'validateSayUno', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['catchUno', 'validateCatchUno', [{ gameId: 1, userId: 2, targetUserId: 3 }], { gameId: 1, userId: 2, targetUserId: 3 }],
            ['getGameHistory', 'validateGetGameHistory', [1], { id: 1 }],
            ['getOwnHand', 'validateGetOwnHand', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['getGameStateDetail', 'validateGetGameStateDetail', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
            ['suggestPlayableCard', 'validateSuggestPlayableCard', [{ gameId: 1, userId: 2 }], { gameId: 1, userId: 2 }],
        ])('%s returns the validator Err without accessing repositories or helpers', async (method, validator, args, input) => {
            const error = Result.Err({ statusCode: 400, message: 'Invalid game action' });
            gameRules[validator].mockResolvedValue(error);

            const result = await gameService[method](...args);

            expect(result).toBe(error);
            expect(gameRules[validator]).toHaveBeenCalledTimes(1);
            expect(gameRules[validator]).toHaveBeenCalledWith(input);
            [gameRepository, userRepository, gamePlayerRepository, cardRepository,
                scoreRepository, historyRepository, helpers].forEach((dependency) => {
                Object.values(dependency).forEach((mock) => expect(mock).not.toHaveBeenCalled());
            });
        });
    });

    describe('createGame', () => {
        test('returns Err if the validation fails', async () => {
            gameRules.validateCreateGame.mockResolvedValue(Result.Err({ statusCode: 400, message:'Err'}));
            const result = await gameService.createGame({ name: 'G1' });
            expect(result.isErr()).toBe(true);
            expect(gameRepository.create).not.toHaveBeenCalled();
        });

        test('creates the game on waiting if its Ok', async () => {
            gameRules.validateCreateGame.mockResolvedValue(Result.Ok(true));
            gameRepository.create.mockResolvedValue({ id: 1, name: 'G1', state: 'waiting'});
            
            const result = await gameService.createGame({ name: 'G1', rules: 'clásico', creatorId: 1});
            
            expect(result.isOk()).toBe(true);
            expect(result.value.name).toBe('G1');
            expect(gameRepository.create).toHaveBeenCalledWith({name: 'G1', rules:'clásico', creatorId: 1, state: 'waiting'});
        });
    });

    describe('joinGame', () => {
        test('returns Ok and register the user in the game and updates the turnOrder', async () => {
            gameRules.validateJoinGame.mockResolvedValue(Result.Ok(true));
            // Simulamos que ya hay 2 jugadores, por lo que el turnOrder debe ser 2 (el tercero)
            gamePlayerRepository.findByGameId.mockResolvedValue([{}, {}]);
            
            const result = await gameService.joinGame({ gameId: 1, userId: 5});
            
            expect(result.isOk()).toBe(true);
            expect(gamePlayerRepository.create).toHaveBeenCalledWith({ gameId: 1, userId: 5, turnOrder: 2});
        });
    });

    describe('startGame', () => {
        test('starts the game and assums the current player', async () => {
            // El validador en startGame expone el array de players
            gameRules.validateStartGame.mockResolvedValue(Result.Ok({ players: [{ userId: 10}, { userId: 20}]}));
            
            helpers.generateAndShuffleDeck.mockReturnValue([
                {type:'number', color:'red', value:'5'},
                {type:'number', color:'blue', value:'2'}
            ]);
            helpers.distributeCardsRecursively.mockReturnValue(0);

            const result = await gameService.startGame({ gameId: 1, userId: 10});
            
            expect(result.isOk()).toBe(true);
            // Verifica que setea a in_progress y asigna al playerId = 10
            expect(gameRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ state: 'in_progress', currentPlayerId: 10}));
        });
    });

    describe('leaveGame', () => {
        test('returns Err if the validation fails', async () => {
            gameRules.validateLeaveGame.mockResolvedValue(Result.Err({ statusCode: 400 }));
            const result = await gameService.leaveGame({ gameId: 1, userId: 1});
            expect(result.isErr()).toBe(true);
        });

        test('pass the turn to the next to exit', async () => {
            gameRules.validateLeaveGame.mockResolvedValue(Result.Ok({ 
                game: { state: 'in_progress', currentPlayerId: 1 }, 
                gamePlayer: { id: 100 } 
            }));
            
            // Había 2 jugadores: id 1 (el que se va) e id 2
            gamePlayerRepository.findByGameId.mockResolvedValue([{ userId: 1}, { userId: 2}]);
            
            const result = await gameService.leaveGame({ gameId: 1, userId: 1});
            
            expect(result.isOk()).toBe(true);
            // El turno pasa al userId: 2
            expect(gameRepository.update).toHaveBeenCalledWith(1, { currentPlayerId: 2});
            expect(gamePlayerRepository.delete).toHaveBeenCalledWith(100);
        });

        test('eliminates CurrentPlayerId if it was the last player', async () => {
            gameRules.validateLeaveGame.mockResolvedValue(Result.Ok({ 
                game: { state: 'in_progress', currentPlayerId: 1 }, 
                gamePlayer: { id: 100 } 
            }));
            
            // Solo quedaba 1 jugador
            gamePlayerRepository.findByGameId.mockResolvedValue([{ userId: 1}]);
            
            await gameService.leaveGame({ gameId: 1, userId: 1 });
            expect(gameRepository.update).toHaveBeenCalledWith(1, { currentPlayerId: null});
        });
    });

    describe('endGame', () => {
        test('trasnfers to the historic score the actual score', async () => {
            gameRules.validateEndGame.mockResolvedValue(Result.Ok(true));
            // Simulamos 2 jugadores con puntajes
            gamePlayerRepository.findByGameId.mockResolvedValue([
                { userId: 1, score: 50 },
                { userId: 2, score: 30 }
            ]);

            const result = await gameService.endGame({ gameId: 1, userId: 1});

            expect(result.isOk()).toBe(true);
            expect(scoreRepository.create).toHaveBeenCalledWith({playerId: 1, gameId: 1, score: 50});
            expect(scoreRepository.create).toHaveBeenCalledWith({playerId: 2, gameId: 1, score: 30});
            expect(gameRepository.update).toHaveBeenCalledWith(1,{ state: 'finished'});
        });
    });

    // --- Consultas del Game (Queries) ---
    describe('getGameState', () => {
        test('returns the state', async () => {
            gameRules.validateGetGameState.mockResolvedValue(Result.Ok({ game: { id: 1, state: 'waiting'}}));
            const result = await gameService.getGameState(1);
            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({ game_id: 1, state: 'waiting'});
        });
    });

    describe('getGamePlayers', () => {
        test('retursn the user map in the corresponding gameId', async () => {
            gameRules.validateGetGamePlayers.mockResolvedValue(Result.Ok({ game: { id: 1}}));
            gamePlayerRepository.findByGameId.mockResolvedValue([
                { User: { username: 'alice' } }, 
                { User: { username: 'bob' } }
            ]);

            const result = await gameService.getGamePlayers(1);
            expect(result.value).toEqual({ game_id: 1, players: ['alice', 'bob']});
        });
    });

    describe('getCurrentPlayer', () => {
        test('returns null if nobody has a turn', async () => {
            gameRules.validateGetCurrentPlayer.mockResolvedValue(Result.Ok({ game: { id: 1, currentPlayerId: null}}));
            
            const result = await gameService.getCurrentPlayer(1);
            
            expect(result.value).toEqual({ game_id: 1, current_player: null});
            expect(userRepository.findById).not.toHaveBeenCalled();
        });

        test('returns the username of the actual player', async () => {
            gameRules.validateGetCurrentPlayer.mockResolvedValue(Result.Ok({ game: { id: 1, currentPlayerId: 10}}));
            userRepository.findById.mockResolvedValue({ username: 'charlie'});

            const result = await gameService.getCurrentPlayer(1);
            
            expect(result.value).toEqual({ game_id: 1, current_player: 'charlie' });
        });
    });

    describe('getTopCard', () => {
        test('returns the card of the last played in the pile of discard', async () => {
            gameRules.validateGetTopCard.mockResolvedValue(Result.Ok({ game: { id: 1}}));
            cardRepository.findTopDiscard.mockResolvedValue({ color: 'blue', value: 'skip'});

            const result = await gameService.getTopCard(1);
            expect(result.value).toEqual({ game_id: 1, top_card: 'blue skip'});
        });
    });

    describe('getGameScores', () => {
        test('return a map of the actual players scores', async () => {
            gameRules.validateGetGameScores.mockResolvedValue(Result.Ok({ game: { id: 1 }}));
            gamePlayerRepository.findByGameId.mockResolvedValue([
                { User: { username: 'alice' }, score: 100},
                { User: { username: 'bob' }, score: 50}
            ]);

            const result = await gameService.getGameScores(1);
            expect(result.value).toEqual({ game_id: 1, scores: { alice: 100, bob: 50 }});
        });
    });
    
    describe('getAllGames, getGameById, updateGame, deleteGame', () => {
        test('getAllGames returns a direct array of games', async () => {
            gameRepository.findAll.mockResolvedValue([]);
            const result = await gameService.getAllGames();
            expect(result).toEqual([]);
        });
        
        test('deleteGame return Err if the validator fails', async () => {
            gameRules.validateDeleteGame.mockResolvedValue(Result.Err({ statusCode: 404}));
            const result = await gameService.deleteGame(1);
            expect(result.isErr()).toBe(true);
        });
        
        test('updateGame return Ok if the validator pass', async () => {
            gameRules.validateUpdateGame.mockResolvedValue(Result.Ok(true));
            gameRepository.update.mockResolvedValue({ id: 1, state: 'finished'});
            const result = await gameService.updateGame(1, { state: 'finished'});
            expect(result.isOk()).toBe(true);
        });
    });

    describe('Game Detail Queries (getGameHistory, getOwnHand, getGameStateDetail)', () => {
        test('getGameHistory maps history arrays correctly', async () => {
            gameRules.validateGetGameHistory.mockResolvedValue(Result.Ok(true));
            historyRepository.findByGameId.mockResolvedValue([
                {player:{username:'alice'}, action:'Played red 5'}
            ]);

            const result = await gameService.getGameHistory(1);
            expect(result.isOk()).toBe(true);
            expect(result.value.history[0]).toEqual({player:'alice',action:'Played red 5'});
        });
        test('getOwnHand maps the current hand correctly', async () => {
            gameRules.validateGetOwnHand.mockResolvedValue(Result.Ok(true));
            cardRepository.findPlayerHand.mockResolvedValue([
                {color:'green',value:'reverse'}
            ]);

            const result = await gameService.getOwnHand({gameId:1, userId:1});
            expect(result.isOk()).toBe(true);
            expect(result.value.hand).toEqual(['green reverse']);
        });
        test('getGameStateDetail returns detailed state parsing actual hand vs rival card counts', async () => {
            gameRules.validateGetGameStateDetail.mockResolvedValue(Result.Ok({
                game:{currentPlayerId:1, currentColor:'green'}
            }));
            gamePlayerRepository.findByGameId.mockResolvedValue([
                {userId:1, User:{username:'moni'}},
                {userId:2, User:{username:'marce'}}
            ]);
            cardRepository.findTopDiscard.mockResolvedValue({
                color:null, type:'wild', value:'wild_draw_four'
            });
            historyRepository.findByGameId.mockResolvedValue([]);
            userRepository.findById.mockResolvedValue({username:'moni'});

            // dinamic simulation: returns the real cards to moni and sinulated array for marce
            cardRepository.findPlayerHand.mockImplementation((gameId, uId) => {
                if (uId === 1) return Promise.resolve([{color:'red', value:'2'}, {color:'blue',value:'4' }]);
                if (uId === 2) return Promise.resolve([{},{},{}]);
            });

            const result = await gameService.getGameStateDetail({gameId:1, userId:1});
            
            expect(result.isOk()).toBe(true);
            expect(result.value.topCard).toBe('green wild_draw_four');
            expect(result.value.currentPlayer).toBe('moni');
            expect(result.value.hands.moni).toEqual(['red 2', 'blue 4']);
            expect(result.value.hands.marce).toEqual({cardCount: 3, userId: 2});
        });
    });

    describe('suggestPlayableCard', () => {
        test('returns the first card that satisfies the game rules', async () => {
            const hand = [
                {type:'number', color:'red', value:'5'},
                {type:'action', color:'blue', value:'skip'},
            ];
            const topCard = {type:'number', color:'blue', value:'2'};
            gameRules.validateSuggestPlayableCard.mockResolvedValue(
                Result.Ok({game:{currentColor:'blue'}})
            );
            cardRepository.findPlayerHand.mockResolvedValue(hand);
            cardRepository.findTopDiscard.mockResolvedValue(topCard);
            helpers.isValidMove.mockImplementation((card) => card.color === 'blue');

            const result = await gameService.suggestPlayableCard({gameId:1, userId:2});

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({
                game_id:1,
                suggested_card:'blue skip',
                message:'Playable card found',
            });
            expect(helpers.isValidMove).toHaveBeenCalledWith(hand[0], topCard, 'blue');
            expect(helpers.isValidMove).toHaveBeenCalledWith(hand[1], topCard, 'blue');
        });

        test('returns null when the user has no playable card', async () => {
            gameRules.validateSuggestPlayableCard.mockResolvedValue(
                Result.Ok({game:{currentColor:'yellow'}})
            );
            cardRepository.findPlayerHand.mockResolvedValue([
                {type:'number', color:'red', value:'5'}
            ]);
            cardRepository.findTopDiscard.mockResolvedValue({
                type:'number', color:'blue', value:'2'
            });
            helpers.isValidMove.mockReturnValue(false);

            const result = await gameService.suggestPlayableCard({gameId:1, userId:2});

            expect(result.value.suggested_card).toBeNull();
            expect(result.value.message).toBe('No playable card available');
        });
    });

    describe('additional game lifecycle and queries', () => {
        test('getGameById returns the game supplied by the validator', async () => {
            const game = { id: 1, name: 'G1', state: 'waiting' };
            gameRules.validateGetGame.mockResolvedValue(Result.Ok({ game }));

            const result = await gameService.getGameById(1);

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual(game);
            expect(gameRules.validateGetGame).toHaveBeenCalledWith({ id: 1 });
        });

        test('deleteGame deletes the validated game and returns true', async () => {
            gameRules.validateDeleteGame.mockResolvedValue(Result.Ok({}));

            const result = await gameService.deleteGame(1);

            expect(result.isOk()).toBe(true);
            expect(result.value).toBe(true);
            expect(gameRepository.delete).toHaveBeenCalledWith(1);
        });

        test('updateGame persists the supplied data and returns the updated game', async () => {
            const data = { name: 'Updated game', rules: 'classic' };
            gameRules.validateUpdateGame.mockResolvedValue(Result.Ok({}));
            gameRepository.update.mockResolvedValue({ id: 1, ...data });

            const result = await gameService.updateGame(1, data);

            expect(result.value).toEqual({ id: 1, ...data });
            expect(gameRules.validateUpdateGame).toHaveBeenCalledWith({ id: 1, ...data });
            expect(gameRepository.update).toHaveBeenCalledWith(1, data);
        });

        test('startGame skips wild cards when selecting the initial discard', async () => {
            const players = [{ userId: 10 }, { userId: 20 }];
            const deck = [
                { id: 1, type: 'number', color: 'red', value: '5', location: 'hand' },
                { id: 2, type: 'wild', value: 'wild', location: 'deck' },
                { id: 3, type: 'wild', value: 'wild_draw_four', location: 'deck' },
                { id: 4, type: 'number', color: 'blue', value: '2', location: 'deck' },
            ];
            gameRules.validateStartGame.mockResolvedValue(Result.Ok({ players }));
            helpers.generateAndShuffleDeck.mockReturnValue(deck);
            helpers.distributeCardsRecursively.mockReturnValue(1);

            const result = await gameService.startGame({ gameId: 1, userId: 10 });

            expect(result.value).toEqual({ message: 'Game started successfully' });
            expect(helpers.generateAndShuffleDeck).toHaveBeenCalledWith(1);
            expect(helpers.distributeCardsRecursively).toHaveBeenCalledWith(deck, players, 7);
            expect(cardRepository.bulkCreate).toHaveBeenCalledWith([
                expect.objectContaining({ id: 1, location: 'hand' }),
                expect.objectContaining({ id: 2, location: 'deck' }),
                expect.objectContaining({ id: 3, location: 'deck' }),
                expect.objectContaining({ id: 4, location: 'discard', playedAt: expect.any(Date) }),
            ]);
            expect(gameRepository.update).toHaveBeenCalledWith(1, {
                state: 'in_progress', currentPlayerId: 10, direction: 1, currentColor: 'blue',
            });
        });

        test.each([
            { state: 'waiting', currentPlayerId: null },
            { state: 'in_progress', currentPlayerId: 2 },
        ])('leaveGame preserves the current turn for $state when the departing user has no turn', async (game) => {
            gameRules.validateLeaveGame.mockResolvedValue(Result.Ok({ game, gamePlayer: { id: 100 } }));

            const result = await gameService.leaveGame({ gameId: 1, userId: 1 });

            expect(result.value).toEqual({ message: 'User left the game successfully' });
            expect(gamePlayerRepository.delete).toHaveBeenCalledWith(100);
            expect(gameRepository.update).not.toHaveBeenCalled();
            expect(gamePlayerRepository.findByGameId).not.toHaveBeenCalled();
        });

        test('getCurrentPlayer returns null when the assigned user no longer exists', async () => {
            gameRules.validateGetCurrentPlayer.mockResolvedValue(Result.Ok({ game: { id: 1, currentPlayerId: 10 } }));
            userRepository.findById.mockResolvedValue(null);

            expect((await gameService.getCurrentPlayer(1)).value).toEqual({ game_id: 1, current_player: null });
            expect(userRepository.findById).toHaveBeenCalledWith(10);
        });

        test.each([
            [null, null],
            [{ type: 'wild', color: null, value: 'wild_draw_four' }, 'green wild_draw_four'],
        ])('getTopCard formats discard %j', async (card, expected) => {
            gameRules.validateGetTopCard.mockResolvedValue(Result.Ok({ game: { id: 1, currentColor: 'green' } }));
            cardRepository.findTopDiscard.mockResolvedValue(card);

            expect((await gameService.getTopCard(1)).value).toEqual({ game_id: 1, top_card: expected });
            expect(cardRepository.findTopDiscard).toHaveBeenCalledWith(1);
        });

        test('getOwnHand formats wild cards without a color prefix', async () => {
            gameRules.validateGetOwnHand.mockResolvedValue(Result.Ok({}));
            cardRepository.findPlayerHand.mockResolvedValue([{ type: 'wild', color: null, value: 'wild' }]);

            expect((await gameService.getOwnHand({ gameId: 1, userId: 2 })).value).toEqual({ hand: ['wild'] });
            expect(cardRepository.findPlayerHand).toHaveBeenCalledWith(1, 2);
        });

        test('getGameStateDetail handles an unstarted game and maps turn history', async () => {
            gameRules.validateGetGameStateDetail.mockResolvedValue(Result.Ok({ game: { currentPlayerId: null } }));
            gamePlayerRepository.findByGameId.mockResolvedValue([{ userId: 1, User: { username: 'alice' } }]);
            cardRepository.findTopDiscard.mockResolvedValue(null);
            cardRepository.findPlayerHand.mockResolvedValue([{ color: null, value: 'wild' }]);
            historyRepository.findByGameId.mockResolvedValue([{ player: { username: 'alice' }, action: 'Said UNO' }]);

            const result = await gameService.getGameStateDetail({ gameId: 1, userId: 1 });

            expect(result.value).toEqual({
                currentPlayer: null, topCard: null, hands: { alice: ['wild'] },
                turnHistory: [{ player: 'alice', action: 'Said UNO' }],
            });
            expect(userRepository.findById).not.toHaveBeenCalled();
        });

        test('suggestPlayableCard returns an uncolored wild and stops at the first playable card', async () => {
            gameRules.validateSuggestPlayableCard.mockResolvedValue(Result.Ok({ game: { currentColor: 'red' } }));
            cardRepository.findPlayerHand.mockResolvedValue([
                { type: 'wild', color: null, value: 'wild' },
                { type: 'number', color: 'red', value: '5' },
            ]);
            cardRepository.findTopDiscard.mockResolvedValue({ color: 'red', value: '2' });
            helpers.isValidMove.mockReturnValue(true);

            const result = await gameService.suggestPlayableCard({ gameId: 1, userId: 2 });

            expect(result.value).toEqual({ game_id: 1, suggested_card: 'wild', message: 'Playable card found' });
            expect(helpers.isValidMove).toHaveBeenCalledTimes(1);
        });
    });

    describe('special cards and turn direction', () => {
        beforeEach(() => {
            // Deliberately unordered: the service must use turnOrder.
            gamePlayerRepository.findByGameId.mockResolvedValue([
                { id: 102, userId: 3, turnOrder: 2, score: 0 },
                { id: 100, userId: 1, turnOrder: 0, score: 10 },
                { id: 101, userId: 2, turnOrder: 1, score: 0 },
            ]);
            cardRepository.findPlayerHand.mockResolvedValue([{ id: 11 }]);
            helpers.calculateHandScore.mockReturnValue(20);
        });

        test.each([
            ['5', 'number', 1, 2, 1, null],
            ['5', 'number', -1, 3, -1, null],
            ['reverse', 'action', 1, 3, -1, null],
            ['reverse', 'action', -1, 2, 1, null],
            ['skip', 'action', 1, 3, 1, 2],
            ['skip', 'action', -1, 2, -1, 3],
            ['wild', 'wild', 1, 2, 1, null],
        ])('playing %s (%s) in direction %i advances to the correct player', async (value, type, direction, nextPlayer, newDirection, skippedPlayer) => {
            const playedCard = { id: 10, value, type, color: type === 'wild' ? null : 'red' };
            gameRules.validatePlayCard.mockResolvedValue(Result.Ok({ game: { direction }, playedCard }));

            const result = await gameService.playCard({ gameId: 1, userId: 1, cardString: value, chosenColor: 'blue' });

            expect(result.value).toEqual({ message: 'Card played successfully', nextPlayerTurn: nextPlayer });
            expect(cardRepository.update).toHaveBeenCalledWith(10, {
                location: 'discard', ownerId: null, playedAt: expect.any(Date),
            });
            expect(gameRepository.update).toHaveBeenCalledWith(1, {
                currentPlayerId: nextPlayer, direction: newDirection, currentColor: type === 'wild' ? 'blue' : 'red',
            });
            expect(gamePlayerRepository.update).toHaveBeenCalledWith(100, { saidUno: false, score: 30 });
            expect(historyRepository.create).toHaveBeenCalledWith({
                gameId: 1, playerId: 1, action: `Played ${type === 'wild' ? '' : 'red '}${value}`,
            });
            if (skippedPlayer) {
                expect(historyRepository.create).toHaveBeenCalledWith({ gameId: 1, playerId: skippedPlayer, action: 'Skipped turn' });
            } else {
                expect(historyRepository.create).toHaveBeenCalledTimes(1);
            }
            expect(cardRepository.findNextInDeck).not.toHaveBeenCalled();
        });

        test('reverse in a two-player game skips the opponent and keeps the current player', async () => {
            gamePlayerRepository.findByGameId.mockResolvedValue([
                { id: 100, userId: 1, turnOrder: 0, score: 0 },
                { id: 101, userId: 2, turnOrder: 1, score: 0 },
            ]);
            gameRules.validatePlayCard.mockResolvedValue(Result.Ok({
                game: { direction: 1 }, playedCard: { id: 10, type: 'action', color: 'red', value: 'reverse' },
            }));

            const result = await gameService.playCard({ gameId: 1, userId: 1, cardString: 'red reverse' });

            expect(result.value.nextPlayerTurn).toBe(1);
            expect(gameRepository.update).toHaveBeenCalledWith(1, { currentPlayerId: 1, direction: -1, currentColor: 'red' });
            expect(historyRepository.create).toHaveBeenCalledWith({ gameId: 1, playerId: 2, action: 'Skipped turn' });
        });

        test.each([
            ['draw_two', 'action', 2, 1, 2, 101, 3],
            ['draw_two', 'action', 2, -1, 3, 102, 2],
            ['wild_draw_four', 'wild', 4, 1, 2, 101, 3],
            ['wild_draw_four', 'wild', 4, -1, 3, 102, 2],
        ])('%s (%s) draws %i cards and skips the affected player in direction %i', async (value, type, count, direction, targetId, targetGamePlayerId, nextId) => {
            const penaltyCards = Array.from({ length: count }, (_, index) => ({ id: 20 + index }));
            cardRepository.findNextInDeck.mockResolvedValue(penaltyCards);
            gameRules.validatePlayCard.mockResolvedValue(Result.Ok({
                game: { direction }, playedCard: { id: 10, value, type, color: type === 'wild' ? null : 'red' },
            }));

            const result = await gameService.playCard({ gameId: 1, userId: 1, cardString: value, chosenColor: 'green' });

            expect(result.value.nextPlayerTurn).toBe(nextId);
            expect(cardRepository.findNextInDeck).toHaveBeenCalledWith(1, count);
            expect(cardRepository.update).toHaveBeenCalledTimes(count + 1);
            penaltyCards.forEach((card) => {
                expect(cardRepository.update).toHaveBeenCalledWith(card.id, { location: 'hand', ownerId: targetId });
            });
            expect(gamePlayerRepository.update).toHaveBeenCalledWith(targetGamePlayerId, { saidUno: false });
            expect(historyRepository.create).toHaveBeenCalledWith({ gameId: 1, playerId: targetId, action: 'Skipped turn' });
            expect(gameRepository.update).toHaveBeenCalledWith(1, {
                currentPlayerId: nextId, direction, currentColor: type === 'wild' ? 'green' : 'red',
            });
            expect(cardRepository.findDiscardPile).not.toHaveBeenCalled();
        });
    });

    describe('drawing and replenishing the deck', () => {
        beforeEach(() => {
            gameRules.validateDrawCard.mockResolvedValue(Result.Ok({ game: { direction: -1 }, gamePlayer: { id: 100 } }));
            gamePlayerRepository.findByGameId.mockResolvedValue([
                { userId: 2, turnOrder: 1 }, { userId: 1, turnOrder: 0 }, { userId: 3, turnOrder: 2 },
            ]);
        });

        test('drawCard wraps backwards and formats a wild without a color prefix', async () => {
            cardRepository.findNextInDeck.mockResolvedValue([{ id: 20, type: 'wild', color: null, value: 'wild' }]);

            const result = await gameService.drawCard({ gameId: 1, userId: 1 });

            expect(result.value).toEqual({ message: 'Card drawn successfully', cardDrawn: 'wild' });
            expect(gameRepository.update).toHaveBeenCalledWith(1, { currentPlayerId: 3 });
            expect(historyRepository.create).toHaveBeenCalledWith({ gameId: 1, playerId: 1, action: 'Drew a card' });
            expect(cardRepository.findDiscardPile).not.toHaveBeenCalled();
        });

        test('drawCard recycles older discards while preserving the top card', async () => {
            cardRepository.findNextInDeck.mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ id: 21, color: 'blue', value: '7' }]);
            cardRepository.findDiscardPile.mockResolvedValue([{ id: 20 }, { id: 21 }, { id: 22 }]);

            const result = await gameService.drawCard({ gameId: 1, userId: 1 });

            expect(result.value.cardDrawn).toBe('blue 7');
            expect(cardRepository.findDiscardPile).toHaveBeenCalledWith(1);
            expect(cardRepository.update.mock.calls).toEqual([
                [21, { location: 'deck', ownerId: null, playedAt: null }],
                [22, { location: 'deck', ownerId: null, playedAt: null }],
                [21, { location: 'hand', ownerId: 1 }],
            ]);
            expect(historyRepository.create).toHaveBeenCalledWith({
                gameId: 1, playerId: 1, action: 'Deck ran out, reshuffled 2cards from the discard pile',
            });
        });

        test('catchUno replenishes a short deck before dealing both penalty cards', async () => {
            gameRules.validateCatchUno.mockResolvedValue(Result.Ok({ targetGamePlayer: { id: 101 } }));
            cardRepository.findNextInDeck.mockResolvedValueOnce([{ id: 30 }])
                .mockResolvedValueOnce([{ id: 30 }, { id: 31 }]);
            cardRepository.findDiscardPile.mockResolvedValue([{ id: 20 }, { id: 31 }]);
            userRepository.findById.mockResolvedValue({ username: 'bob' });

            const result = await gameService.catchUno({ gameId: 1, userId: 1, targetUserId: 2 });

            expect(result.value).toEqual({ message: 'Player was caught without saying UNO and drew 2 penalty cards' });
            expect(cardRepository.findNextInDeck).toHaveBeenCalledWith(1, 2);
            expect(cardRepository.update.mock.calls).toEqual([
                [31, { location: 'deck', ownerId: null, playedAt: null }],
                [30, { location: 'hand', ownerId: 2 }],
                [31, { location: 'hand', ownerId: 2 }],
            ]);
            expect(gamePlayerRepository.update).toHaveBeenCalledWith(101, { saidUno: false });
            expect(userRepository.findById).toHaveBeenCalledWith(2);
            expect(historyRepository.create).toHaveBeenCalledWith({
                gameId: 1, playerId: 1, action: 'Caught bob without saying UNO',
            });
            expect(gameRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('In-Play Actions (playCard, drawCard, sayUno, catchUno', ()=>{
        test('playing the last card saves final scores including card points and the winner bonus', async () => {
            const players = [
                { id: 100, userId: 1, turnOrder: 0, score: 40, User: { username: 'alice' } },
                { id: 101, userId: 2, turnOrder: 1, score: 30, User: { username: 'bob' } },
            ];
            gameRules.validatePlayCard.mockResolvedValue(Result.Ok({
                game: { direction: 1 },
                playedCard: { id: 10, type: 'number', color: 'red', value: '5' },
            }));
            // Finishing the game reloads scores after the played card has earned points.
            gamePlayerRepository.findByGameId.mockResolvedValueOnce(players).mockResolvedValueOnce([
                { ...players[0], score: 45 }, players[1],
            ]);
            helpers.calculateHandScore.mockReturnValue(5);
            cardRepository.findPlayerHand.mockResolvedValue([]);

            const result = await gameService.playCard({ gameId: 1, userId: 1, cardString: 'red 5' });

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({
                message: 'alice has won the game!', scores: { alice: 195, bob: 30 },
            });
            expect(helpers.calculateHandScore).toHaveBeenCalledWith([
                { id: 10, type: 'number', color: 'red', value: '5' },
            ]);
            expect(gamePlayerRepository.update.mock.calls).toEqual([
                [100, { saidUno: false, score: 45 }],
                [100, { score: 195 }],
            ]);
            expect(scoreRepository.create.mock.calls).toEqual([
                [{ playerId: 1, gameId: 1, score: 195 }],
                [{ playerId: 2, gameId: 1, score: 30 }],
            ]);
            expect(gameRepository.update).toHaveBeenCalledTimes(1);
            expect(gameRepository.update).toHaveBeenCalledWith(1, { state: 'finished', currentPlayerId: null });
            expect(historyRepository.create).toHaveBeenCalledWith({ gameId: 1, playerId: 1, action: 'WON THE GAMEE!!!' });
            expect(cardRepository.findNextInDeck).not.toHaveBeenCalled();
        });

        test('playCard plays a card successfully, updateds history and passes the turn', async ()=>{
            const mockGame = {id:1, direction:1, currentPlayerId:1};
            const mockCard = {id:10, type:'number', color: 'red', value:'5'};
            gameRules.validatePlayCard.mockResolvedValue(Result.Ok({ game: mockGame, playedCard: mockCard }));

            gamePlayerRepository.findByGameId.mockResolvedValue([
                {id:100, userId:1, turnOrder:0, score:0},
                {id:101, userId:2, turnOrder:1, score:0}
            ]);
            helpers.calculateHandScore.mockReturnValue(5);
            cardRepository.findPlayerHand.mockResolvedValue([{id:11}]);

            const result = await gameService.playCard({ gameId: 1, userId: 1, cardString: 'red 5', chosenColor: null });
            
            expect(result.isOk()).toBe(true);
            expect(cardRepository.update).toHaveBeenCalledWith(10, expect.objectContaining({ location: 'discard' }));
            expect(historyRepository.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'Played red 5' }));
            expect(gamePlayerRepository.update).toHaveBeenCalledWith(100, { saidUno: false, score: 5 });
            expect(gameRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ currentPlayerId: 2 }));
        });

        test('playCard finishes the game if hand becomes empty', async()=>{
            const mockGame = {id: 1, direction:1, currentPlayerId:1};
            const mockCard = {id:10, type:'number', color: 'red', value:'5'};
            gameRules.validatePlayCard.mockResolvedValue(Result.Ok({ game: mockGame, playedCard: mockCard }));

            gamePlayerRepository.findByGameId.mockResolvedValue([
                {id:100, userId:1, turnOrder:0, score:0, User:{username:'moni'}},
                {id:101, userId:2, turnOrder:1, score:20, User:{username:'bob'}}
            ]);
            helpers.calculateHandScore.mockReturnValue(5);
            cardRepository.findPlayerHand.mockResolvedValue([]);

            const result = await gameService.playCard({gameId:1, userId:1, cardString:'red 5', chosenColor:null});

            expect(result.isOk()).toBe(true);
            expect(result.value.message).toContain('moni has won');
            expect(scoreRepository.create).toHaveBeenCalledTimes(2);
            expect(gameRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({state:'finished', currentPlayerId:null}));
        });

        test('drawCard updates card location and correctly calculates next turn', async () => {
            gameRules.validateDrawCard.mockResolvedValue(Result.Ok({ 
                game:{direction:1}, 
                gamePlayer:{ id:100} 
            }));
            cardRepository.findNextInDeck.mockResolvedValue([
                {id:20, color:'blue', value:'7'}
            ]);
            
            gamePlayerRepository.findByGameId.mockResolvedValue([
                {id:100, userId:1, turnOrder:0},
                {id:101, userId:2, turnOrder:1}
            ]);

            const result = await gameService.drawCard({gameId:1, userId:1});

            expect(result.isOk()).toBe(true);
            expect(result.value.cardDrawn).toBe('blue 7');
            expect(cardRepository.update).toHaveBeenCalledWith(20, expect.objectContaining({location:'hand', ownerId: 1}));
            expect(gamePlayerRepository.update).toHaveBeenCalledWith(100,{saidUno:false});
            expect(gameRepository.update).toHaveBeenCalledWith(1, {currentPlayerId:2});
        });

        test('sayUno sets the flag and creates history record', async()=>{
            gameRules.validateSayUno.mockResolvedValue(Result.Ok({gamePlayer: {id: 100}}));

            const result = await gameService.sayUno({gameId:1, userId:1});

            expect(result.isOk()).toBe(true);
            expect(gamePlayerRepository.update).toHaveBeenCalledWith(100, {saidUno:true});
            expect(historyRepository.create).toHaveBeenCalledWith(expect.objectContaining({action:'Said UNO'}));
        });
        test('catchUno penalizes target user with 2 cards', async () => {
            gameRules.validateCatchUno.mockResolvedValue(Result.Ok({targetGamePlayer:{id:101}}));
            cardRepository.findNextInDeck.mockResolvedValue([{id:30}, {id:31}]);
            userRepository.findById.mockResolvedValue({username:'bob'});
            
            const result = await gameService.catchUno({gameId:1, userId:1, targetUserId:2});
            
            expect(result.isOk()).toBe(true);
            expect(cardRepository.update).toHaveBeenCalledWith(30, expect.objectContaining({location:'hand', ownerId:2}));
            expect(cardRepository.update).toHaveBeenCalledWith(31, expect.objectContaining({location:'hand', ownerId:2}));
            expect(gamePlayerRepository.update).toHaveBeenCalledWith(101, {saidUno:false});
        });
    })
});
