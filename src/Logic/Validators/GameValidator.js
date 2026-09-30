import Result from '../Monads/result.js';

export const createGameValidator = ({ gameRepository, userRepository, gamePlayerRepository, cardRepository, helpers, config }) => {
    const VALID_STATES = ['waiting', 'in_progress', 'finished'];

    const validateIdProvided = async(data) =>{
        if(!data.id){
            return Result.Err({statusCode:400, message:'id is required'});
        }
        return Result.Ok(data);
    };

    const validateGameExists = async (data) =>{
        const game = await gameRepository.findById(data.id);
        if(!game) {
            return Result.Err({statusCode:404, message:'Game not found'});
        }
        return Result.Ok({...data, game});
    };

    const validateStateValidIfProvided = async(data)=>{
        if (data.state !== undefined && !VALID_STATES.includes(data.state)) {
            return Result.Err({statusCode:400, message:`status has to be one of: ${VALID_STATES.join(', ')}` });
        }
        return Result.Ok(data);
    };

    const validateCreateGameFieldsProvided = async (data) => {
        if (!data.name || !data.creatorId) {
            return Result.Err({statusCode: 400, message: 'name and creatorId are mandatory'});
        }
        return Result.Ok(data);
    };

    const validateCreatorExists = async (data) => {
        const creator = await userRepository.findById(data.creatorId);
        if (!creator) {
            return Result.Err({statusCode: 400, message: 'CreatorId doesnt exist'});
        }
        return Result.Ok({...data, creator});
    };

    const validateGameIdProvided = async (data) =>{
        if (!data.gameId) {
            return Result.Err({statusCode: 400, message: 'gameId is required'});
        }
        return Result.Ok(data);
    };

    const validateGameExistsByGameId = async (data) => {
        const game = await gameRepository.findById(data.gameId);
        if(!game) {
            return Result.Err({ statusCode: 404, message: 'Game not found'});
        }
        return Result.Ok({...data, game});
    };

    const validateGameIsWaiting = async (data) => {
        if (data.game.state !== 'waiting') {
            return Result.Err({statusCode: 400, message: 'You cant join the game the game is not waiting anymore'});
        }
        return Result.Ok(data);
    };

    const validateUserNotAlreadyJoined = async (data) => {
        const alredyJoined = await gamePlayerRepository.findByGameAndUser(data.gameId, data.userId);
        if(alredyJoined){
            return Result.Err({statusCode: 400, message: 'You are alredy in this game'});
        }
        return Result.Ok(data);
    };

    const validateIsCreator = async (data) => {
        if (data.game.creatorId !== data.userId) {
            return Result.Err({statusCode: 403, message: 'Only the creator can start the game'});
        }
        return Result.Ok(data);
    };

    const validateGameIsWaitingToStart = async (data) => {
        if (data.game.state !== 'waiting') {
            return Result.Err({ statusCode: 400, message: 'The game has alredy started or finished' });
        }
        return Result.Ok(data);
    };

    const validateEnoughPlayers = async (data) =>{
        const players = await gamePlayerRepository.findByGameId(data.gameId);
        if(players.length <2){
            return Result.Err({ statusCode: 400, message: 'You need atleast 2 players to start' });
        }
        // lo guardamos en data para que el service no lo 
        // vuelva a pedir (players[0] es el que arranca jugando)
        return Result.Ok({...data, players})
    };

    const validateUserIsInGame = async (data) =>{
        const gamePlayer = await gamePlayerRepository.findByGameAndUser(data.gameId, data.userId);
        if(!gamePlayer){
            return Result.Err({statusCode:400, message: 'You are not part of this game'});
        }
        return Result.Ok({...data, gamePlayer});
    };

    const validateIsCreatorToEnd = async (data) => {
        if (data.game.creatorId !== data.userId) {
            return Result.Err({statusCode: 403, message: 'Only the creator can finish the game'});
        }
        return Result.Ok(data);
    };

    const validateGameInProgress = async (data) => {
        if (data.game.state !== 'in_progress') {
            return Result.Err({ statusCode: 400, message: 'El juego no esta en curso' });
        }
        return Result.Ok(data);
    };

    const validateIsPlayerTurn = async (data) => {
        if (data.game.currentPlayerId !== data.userId){
           return Result.Err({ statusCode: 403, message: "It is not your turn to play." });
        }
        return Result.Ok(data);
    };

    const validateCardInHand = async (data) =>{
        const hand = await cardRepository.findPlayerHand(data.gameId, data.userId);

        const cardGenerator = helpers.findCardInHand(hand, data.cardString);
        const playedCard = cardGenerator.next().value;

        if (!playedCard){
            return Result.Err({statusCode: 400, message: 'You dont have that card in your hand' });
        }

        return Result.Ok({...data, playedCard});
    };

    const validateValidMove = async (data) => {
        const topCard = await cardRepository.findTopDiscard(data.gameId);

        if (!helpers.isValidMove(data.playedCard, topCard, data.game.currentColor)) {
            return Result.Err({
                statusCode: 400,
                message: 'Invalid card. Please play a card that matches the top card on the discard pile'
            });
        }

        return Result.Ok({...data, topCard});
    };

    const validateHasNoPlayableCard = async (data) => {
        const topCard = await cardRepository.findTopDiscard(data.gameId);
        const hand = await cardRepository.findPlayerHand(data.gameId, data.userId);

        const hasPlayableCard = hand.some((card) => helpers.isValidMove(card, topCard, data.game.currentColor));
        if(hasPlayableCard){
            return Result.Err({ statusCode: 400, message: 'You have a playable card, you must play it instead of drawing' });
        }

        return Result.Ok({...data, topCard});
    };

    const validateDeckHasCards = async (data) => {
        const deckCards = await cardRepository.findNextInDeck(data.gameId, 1);
        if (deckCards.length > 0) {
            return Result.Ok(data);
        }

        const discardPile = await cardRepository.findDiscardPile(data.gameId);
        if (discardPile.length <= 1) {
            return Result.Err({
                statusCode: 400,
                message: 'There are no cards left to draw, not even after reshuffling the discard pile'
            });
        }

        return Result.Ok(data);
    };

    const validateChosenColorIfWild = async (data) =>{
        if (data.playedCard.type === 'wild'){
            if (!data.chosenColor || !config.validColors.includes(data.chosenColor)){
                return Result.Err({
                    statusCode: 400,
                    message: `chosenColor is required and must be one of: ${config.validColors} when playing a wild card`
                });
            }
        }
        return Result.Ok(data);
    };

    const validateHandHasOneCard = async (data) => {
        const hand = await cardRepository.findPlayerHand(data.gameId, data.userId);
        if (hand.length!==1){//maybe two to be able to say uno and then play the card.
            return Result.Err({statusCode:400, message: 'You dont have exactly one card in your hand cheater!'})
        }
        return Result.Ok(data);
    };

    const validateNotAlreadySaidUno = async (data) =>{
        if (data.gamePlayer.saidUno){
            return Result.Err({statusCode:400, message: 'You alredy said UNO buddy'});
        }
        return Result.Ok(data);
    };

    const validateTargetUserIdProvided = async (data) =>{
        if (!data.targetUserId){
            return Result.Err({statusCode:400, message: 'targetUserId is required'});
        }
        return Result.Ok(data);
    };

    const validateNotCatchingSelf = async (data)=>{
        if (data.userId === data.targetUserId){
            return Result.Err({statusCode:400, message: 'You cant snitch yourself for not saying uno bro'});
        }
        return Result.Ok(data);
    };

    const validateTargetIsInGame = async (data) =>{
        const targetGamePlayer = await gamePlayerRepository.findByGameAndUser(data.gameId, data.targetUserId);
        if (!targetGamePlayer) {
            return Result.Err({ statusCode: 400, message:'targetUserId is not part of this game'});
        }
        return Result.Ok({ ...data, targetGamePlayer });
    };

    const validateTargetHandHasOneCard = async (data) => {
        const hand = await cardRepository.findPlayerHand(data.gameId, data.targetUserId);
        if (hand.length !==1){
            return Result.Err({statusCode:400, message: 'Your target doesnt have exactly one card you cheater!'})
        }
        return Result.Ok(data);
    };

    const validateTargetHasNotSaidUno = async (data) =>{
        if (data.targetGamePlayer.saidUno) {
            return Result.Err({ statusCode: 400, message: 'target already said UNO, cant be penalized' });
        }
        return Result.Ok(data);
    };
 
    return {
        validateIdProvided, validateGameExists, validateStateValidIfProvided,
        validateCreateGameFieldsProvided, validateCreatorExists, validateGameIdProvided,
        validateGameExistsByGameId, validateGameIsWaiting, validateUserNotAlreadyJoined,
        validateIsCreator, validateGameIsWaitingToStart, validateEnoughPlayers,
        validateUserIsInGame, validateIsCreatorToEnd, validateGameInProgress, validateIsPlayerTurn,
        validateValidMove, validateCardInHand, validateHasNoPlayableCard, validateDeckHasCards, validateChosenColorIfWild,
        validateHandHasOneCard, validateTargetHasNotSaidUno, validateTargetHandHasOneCard,
        validateTargetIsInGame, validateNotCatchingSelf, validateTargetUserIdProvided, validateNotAlreadySaidUno,
        
    };
};