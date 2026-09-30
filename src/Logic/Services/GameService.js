// Cada función corre primero su validador compuesto. Si da Err, se corta ahí
// mismo devolviendo el propio result (el controller lo manda a handleResult)
// Si da Ok, sigue con la lógica real de siempre, y al final envuelve la
// respuesta con result.map(...) para que el controller siempre reciba un Result
export const createGameService = ({ 
    gameRepository, userRepository, gamePlayerRepository, 
    cardRepository, scoreRepository, historyRepository, gameRules, helpers }) => {

    const formatCard = (card, currentColor = null) => {
        if (!card) return null;

        const displayColor = card.type === 'wild' ? currentColor : card.color;
        return `${displayColor ? displayColor + ' ' : ''}${card.value}`;
    };
        
    const createGame = async ({name, rules, creatorId}) => {
        const result = await gameRules.validateCreateGame({name, rules, creatorId});
        if (result.isErr()) return result;

        const game = await gameRepository.create({name, rules, creatorId, state: 'waiting'});
        return result.map(() => game);
    };

    const getAllGames = async () => {
        return gameRepository.findAll();
    };

    const getGameById = async (id) => {
        const result = await gameRules.validateGetGame({id});
        if (result.isErr()) return result;
    
        return result.map(({ game }) => game);
    };

    const updateGame = async (id, data) => {
        const result = await gameRules.validateUpdateGame({ id, ...data });
        if (result.isErr()) return result;
    
        const game = await gameRepository.update(id, data);
        return result.map(() => game);
    };

    const deleteGame = async (id) => {
        const result = await gameRules.validateDeleteGame({id});
        if(result.isErr()) return result;

        await gameRepository.delete(id);
        return result.map(()=> true);
    };

    const joinGame = async ({gameId, userId}) => {
        const result = await gameRules.validateJoinGame({gameId, userId});
        if (result.isErr()) return result;

        const currentPlayer = await gamePlayerRepository.findByGameId(gameId);
        await gamePlayerRepository.create({gameId, userId, turnOrder: currentPlayer.length,});

        return result.map(()=>({message: 'User joined the game successfully' }));
    };

    const startGame = async ({gameId, userId}) => {
        const result = await gameRules.validateStartGame({gameId, userId});
        if(result.isErr()) return result;

        // players is alredy calculated in validateEnoughPlayers, no need to ask for it again
        const {players} = result.value;

        const deck = helpers.generateAndShuffleDeck(gameId);//posibilidad de cambiarlo al container

        const cardsPerPlayer = 7;
        let nextAvailableCardIndex = helpers.distributeCardsRecursively(deck, players, cardsPerPlayer);

        while (deck[nextAvailableCardIndex].type === 'wild'){
            nextAvailableCardIndex++; //this prevents the game to start with a wild card
        }
        deck[nextAvailableCardIndex].location = 'discard';
        deck[nextAvailableCardIndex].playedAt = new Date();

        //save everything massively
        await cardRepository.bulkCreate(deck);

        await gameRepository.update(gameId, {
            state: 'in_progress',
            currentPlayerId: players[0].userId, 
            direction: 1,
            currentColor: deck[nextAvailableCardIndex].color //save the initial color
        });

        return result.map(()=> ({message: 'Game started successfully'}));
    };

    const leaveGame = async ({gameId, userId}) => {
        const result = await gameRules.validateLeaveGame({ gameId, userId });
        if (result.isErr()) return result;
    
        const {game, gamePlayer} = result.value;

        // Si le tocaba el turno justo al que se va, se lo pasamos al
        // siguiente ANTES de sacarlo de la lista. 
        if (game.state === 'in_progress' && game.currentPlayerId === userId) {
            const players = await gamePlayerRepository.findByGameId(gameId);
            const currentIndex = players.findIndex((p) => p.userId === userId);
            const remaining = players.filter((p) => p.userId !== userId);
    
            if (remaining.length > 0) {
                const next = players[(currentIndex + 1) % players.length];
                await gameRepository.update(gameId, { currentPlayerId: next.userId });
            } else {
                await gameRepository.update(gameId, { currentPlayerId: null });
            }
        }

        await gamePlayerRepository.delete(gamePlayer.id);
        return result.map(() => ({ message: 'User left the game successfully' }));
    };

    const endGame = async ({gameId, userId}) => {
        const result = await gameRules.validateEndGame({gameId, userId});
        if(result.isErr()) return result;

        //Pasamos el score actual de cada jugador al score historico de la tabla Score
        //antes de cerrar el juego
        const players = await gamePlayerRepository.findByGameId(gameId);
        for (const gamePlayer of players) {
            await scoreRepository.create({playerId: gamePlayer.userId, gameId, score: gamePlayer.score,});
        }

        await gameRepository.update(gameId, {state: 'finished'});
        return result.map(()=> ({message: 'Game ended successfully'}));
    };

    const getGameState = async (gameId) => {
        const result = await gameRules.validateGetGameState({id: gameId});
        if (result.isErr()) return result;

        return result.map(({game})=> ({game_id: game.id, state: game.state}));
    };

    const getGamePlayers = async (gameId) => {
        const result = await gameRules.validateGetGamePlayers({id: gameId});
        if(result.isErr()) return result;

        const {game} = result.value;
        const gamePlayers = await gamePlayerRepository.findByGameId(game.id);

        return result.map(()=> ({game_id: game.id, players: gamePlayers.map((gp) => gp.User.username)}));
    };

    const getCurrentPlayer = async (gameId) => {
        const result = await gameRules.validateGetCurrentPlayer({ id: gameId });
        if (result.isErr()) return result;
    
        const { game } = result.value;
    
        //esto no es una validacion todavia cuenta como logica ya que todavia nadie tiene turno.
        if (!game.currentPlayerId) {
            return result.map(() => ({ game_id: game.id, current_player: null }));
        }

        const user = await userRepository.findById(game.currentPlayerId);
        return result.map(() => ({ game_id: game.id, current_player: user?.username ?? null }));
    };

    const getTopCard = async (gameId) => {
        const result = await gameRules.validateGetTopCard({id:gameId});
        if(result.isErr()) return result;

        const {game} = result.value;
        const topCard = await cardRepository.findTopDiscard(game.id);
        if(!topCard) {
            return result.map(() => ({ game_id: game.id, top_card: null }));
        }

        return result.map(()=> ({game_id: game.id, top_card: formatCard(topCard, game.currentColor) }));
    };

    const getGameScores = async (gameId) => {
        const result = await gameRules.validateGetGameScores({id: gameId});
        if(result.isErr()) return result;

        const { game } = result.value;
        const gamePlayers = await gamePlayerRepository.findByGameId(game.id);
        const scores = {};
        gamePlayers.forEach((gp) => {
            scores[gp.User.username] = gp.score;
        });
    
        return result.map(() => ({ game_id: game.id, scores }));
    }

    const playCard = async ({gameId, userId, cardString, chosenColor}) => {
        const result = await gameRules.validatePlayCard({gameId, userId, cardString, chosenColor});
        if(result.isErr()) return result;

        const {game, playedCard} = result.value;

        //move the card to discard
        await cardRepository.update(playedCard.id, {
            location: 'discard',
            ownerId: null,
            playedAt: new Date()
        });

        //we registry the play
        await historyRepository.create({
            gameId,
            playerId: userId,
            action: `Played ${playedCard.color ? playedCard.color + ' ' : ''}${playedCard.value}`,
        });

        //logic for the next turn
        const players = await gamePlayerRepository.findByGameId(gameId);
        players.sort((a, b) => a.turnOrder - b.turnOrder);
        // if your hand is left with 1 card or any amount after playing your declaration of saying UNO
        // is not going to apply to the new hand it resets
        const currentGamePlayer = players.find((p) => p.userId === userId);
        const cardPoints = helpers.calculateHandScore([playedCard]);
        await gamePlayerRepository.update(currentGamePlayer.id, { saidUno: false,
            score: currentGamePlayer.score + cardPoints });

        //if the player has no cards after this the match ends right here
        const remainingHand = await cardRepository.findPlayerHand(gameId, userId);
        if (remainingHand.length === 0){//add a future extra validation to say uno with 2 cards
            const gameOverPayload = await finishGameByEmptyHand({ gameId, players, winnerUserId: userId });
            return result.map(()=> gameOverPayload)
        }

        const currentIndex = players.findIndex((p) => p.userId === userId);
        const totalPlayers = players.length;

        let step = 1;
        let newDirection = game.direction;
        let drawCount = 0;

        if (playedCard.value === 'reverse') {
            newDirection = newDirection === 1 ? -1 : 1;
            if (players.length ===2) step = 2;
        } else if (playedCard.value === 'skip') {
            step = 2;
        } else if (playedCard.value === 'draw_two') {
            step = 2;
            drawCount = 2;
        } else if (playedCard.value === 'wild_draw_four') {
        step = 2;
        drawCount = 4;
        }

        //who is going to get the turn but we skipped
        let skippedPlayerId = null;
        if (step === 2){
            const skippedIndex = (currentIndex + newDirection + totalPlayers) % totalPlayers;
            skippedPlayerId = players[skippedIndex].userId;
        }
        //who draws the cards is always the same person in the new direction no matter what
        if (drawCount > 0){
            await ensureDeckHasEnoughCards({ gameId, neededCount: drawCount, triggeredByUserId: userId });
            const drawnCards = await cardRepository.findNextInDeck(gameId, drawCount);
            for (const card of drawnCards){
                await cardRepository.update(card.id, { location: 'hand', ownerId: skippedPlayerId });
            }
            //so however has to drew cards now it doesnt has 1 card we are going to sum the cards
            //so now the UNO doesnt count
            const affectedGamePlayer = players.find((p) => p.userId === skippedPlayerId);
            await gamePlayerRepository.update(affectedGamePlayer.id, { saidUno: false });
        }

        // we leave the history knowing that his turn got skipped either by a skip, reverse, 
        //draw two or draw four
        if (skippedPlayerId){
            await historyRepository.create({ gameId, playerId: skippedPlayerId, action: 'Skipped turn' });
        }

        //we sum totalPlayers before applying the remainder to avoid negative indices
        const nextIndex = (currentIndex + (step * newDirection % totalPlayers) + totalPlayers) % totalPlayers;
        const nextPlayerId = players[nextIndex].userId;

        //we update the color if it's a wild card
        const newCurrentColor = playedCard.type === 'wild' ? chosenColor : playedCard.color;

        //update the db
        await gameRepository.update(gameId, {
            currentPlayerId: nextPlayerId,
            direction: newDirection,
            currentColor: newCurrentColor
        });

        return result.map(() => ({ 
            message: 'Card played successfully',
            nextPlayerTurn: nextPlayerId
        }));
    }

    const drawCard = async ({gameId, userId}) =>{
        const result = await gameRules.validateDrawCard({ gameId, userId });
        if (result.isErr()) return result;

        const {game} = result.value;

        await ensureDeckHasEnoughCards({gameId, neededCount:1, triggeredByUserId:userId});
        const [deckCard] = await cardRepository.findNextInDeck(gameId,1);

        await cardRepository.update(deckCard.id, {
            location: 'hand',
            ownerId: userId,
        });

        //whenever you drawCard it means you are not with one card anymore
        await gamePlayerRepository.update(result.value.gamePlayer.id, { saidUno: false });

        const players = await gamePlayerRepository.findByGameId(gameId);
        players.sort((a, b) => a.turnOrder - b.turnOrder);
        const currentIndex = players.findIndex((p) => p.userId === userId);
        const totalPlayers = players.length;
        const nextIndex = (currentIndex+game.direction+totalPlayers) % totalPlayers;
        const nextPlayerId = players[nextIndex].userId;

        await gameRepository.update(gameId, {currentPlayerId: nextPlayerId});

        await historyRepository.create({ gameId, playerId: userId, action: 'Drew a card'});

        return result.map(() => ({
        message: 'Card drawn successfully',
        cardDrawn: `${deckCard.color ? deckCard.color + ' ' : ''}${deckCard.value}`
        }));
    }

    const sayUno = async ({gameId, userId}) => {
        const result = await gameRules.validateSayUno({gameId, userId});
        if (result.isErr()) return result;

        const {gamePlayer} = result.value;
        await gamePlayerRepository.update(gamePlayer.id, {saidUno: true});
        await historyRepository.create({ gameId, playerId: userId, action: 'Said UNO'}); 

        return result.map(() => ({message: 'Player Said UNOOOO successfully'}));
    }

    const catchUno = async ({gameId, userId, targetUserId}) => {
        const result = await gameRules.validateCatchUno({gameId, userId, targetUserId});
        if (result.isErr()) return result;

        const {targetGamePlayer} = result.value;

        await ensureDeckHasEnoughCards({ gameId, neededCount: 2, triggeredByUserId: userId });
        const penaltyCards = await cardRepository.findNextInDeck(gameId, 2);
        for (const card of penaltyCards){
            await cardRepository.update(card.id, {location: 'hand', ownerId: targetUserId});
        }

        //this hand is alredy penalized so we reset
        await gamePlayerRepository.update(targetGamePlayer.id, {saidUno: false});
        const targetUser = await userRepository.findById(targetUserId);
        await historyRepository.create({
            gameId,
            playerId: userId,
            action: `Caught ${targetUser.username} without saying UNO`,
        });

        return result.map(()=> ({ message:'Player was caught without saying UNO and drew 2 penalty cards' }));
    }

    const finishGameByEmptyHand = async ({gameId, winnerUserId}) => {
        const WINNER_BONUS = 150;
        const players = await gamePlayerRepository.findByGameId(gameId);
        const scores = {};
        let winnerUsername = null;

        //we run all th players including the winner and we calculate the score based on the cards
        // that are left
        for (const gamePlayer of players) {
            let finalScore = gamePlayer.score;

            if (gamePlayer.userId === winnerUserId) {
                finalScore += WINNER_BONUS;
                await gamePlayerRepository.update(gamePlayer.id, { score:finalScore});
                winnerUsername = gamePlayer.User.username;
            }
            await scoreRepository.create({playerId:gamePlayer.userId, gameId, score:finalScore});
            scores[gamePlayer.User.username] = finalScore;
        }
        await gameRepository.update(gameId, { state: 'finished', currentPlayerId: null });
        await historyRepository.create({ gameId, playerId: winnerUserId, action: 'WON THE GAMEE!!!'}); 
        return { message: `${winnerUsername} has won the game!`, scores };
    }

    const ensureDeckHasEnoughCards = async ({gameId, neededCount, triggeredByUserId}) =>{
        const currentDeckCards = await cardRepository.findNextInDeck(gameId, neededCount);
        if (currentDeckCards.length >= neededCount) return;

        const discardPile = await cardRepository.findDiscardPile(gameId);
        const [, ...restOfDiscard] = discardPile; //everything except the topcard

        for (const card of restOfDiscard){
            await cardRepository.update(card.id, {location: 'deck', ownerId: null, playedAt: null});
        }

        if (restOfDiscard.length > 0){
            await historyRepository.create({
                gameId,
                playerId: triggeredByUserId,
                action: `Deck ran out, reshuffled ${restOfDiscard.length}cards from the discard pile`,
            });
        }
    };

    const getGameHistory = async (gameId) => {
        const result = await gameRules.validateGetGameHistory({id: gameId});
        if (result.isErr()) return result;

        const historyEntries = await historyRepository.findByGameId(gameId);

        return result.map(()=> ({
            history: historyEntries.map((entry) =>({
                player: entry.player.username,
                action: entry.action,
            }))
        }));
    };

    const getOwnHand = async ({gameId, userId}) => {
        const result = await gameRules.validateGetOwnHand({gameId, userId});
        if (result.isErr()) return result;

        const hand = await cardRepository.findPlayerHand(gameId, userId);

        return result.map(() => ({
        hand: hand.map((card) => `${card.color ? card.color + ' ' : ''}${card.value}`)
        }));
    };

    const suggestPlayableCard = async ({gameId, userId}) => {
        const result = await gameRules.validateSuggestPlayableCard({gameId, userId});
        if (result.isErr()) return result;

        const {game} = result.value;
        const [hand, topCard] = await Promise.all([
            cardRepository.findPlayerHand(gameId, userId),
            cardRepository.findTopDiscard(gameId),
        ]);
        const suggestedCard = hand.find((card) =>
            helpers.isValidMove(card, topCard, game.currentColor)
        );

        return result.map(() => ({
            game_id: gameId,
            suggested_card: suggestedCard ? formatCard(suggestedCard) : null,
            message: suggestedCard ? 'Playable card found' : 'No playable card available',
        }));
    };

    const getGameStateDetail = async ({gameId, userId}) => {
        const result = await gameRules.validateGetGameStateDetail({gameId, userId});
        if (result.isErr()) return result;

        const {game} = result.value;

        const players = await gamePlayerRepository.findByGameId(gameId);
        const topCard = await cardRepository.findTopDiscard(gameId);
        const historyEntries = await historyRepository.findByGameId(gameId);
        const currentPlayerUser = game.currentPlayerId ? await userRepository.findById(game.currentPlayerId)
            : null;

        const hands = {};
        for (const gp of players){
            if (gp.userId === userId){
                //only the person that asked is going to get the his own real cards
                const ownHand = await cardRepository.findPlayerHand(gameId, userId);
                hands[gp.User.username] = ownHand.map(
                    (card) => `${card.color ? card.color + ' ' : ''}${card.value}`
                );
            } else {
                //to the rivals only the amount of cards and their user ID for catching UNO
                const rivalHand = await cardRepository.findPlayerHand(gameId, gp.userId);
                hands[gp.User.username] = {cardCount: rivalHand.length, userId: gp.userId};
            }
        }
        return result.map(() => ({
        currentPlayer: currentPlayerUser?.username ?? null,
        topCard: formatCard(topCard, game.currentColor),
        hands,
        turnHistory: historyEntries.map((entry) => ({
            player: entry.player.username,
            action: entry.action,
            })),
        }));
    }

    return {createGame, getAllGames, getGameById, updateGame, deleteGame, joinGame, startGame,
        leaveGame, endGame, getGameState, getGamePlayers, getCurrentPlayer, getTopCard, getGameScores,
        playCard, drawCard, sayUno, catchUno, getGameHistory, getOwnHand, getGameStateDetail,
        suggestPlayableCard
    };
};
