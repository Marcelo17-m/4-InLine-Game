import { composeAsyncValidators } from '../../Helpers/composeAsyncValidators.js';

export const createGameRules = (gameValidator) => {
    
    const validateCreateGame = composeAsyncValidators(
        gameValidator.validateCreateGameFieldsProvided,
        gameValidator.validateCreatorExists
    );

    const validateGetGame = composeAsyncValidators(
        gameValidator.validateIdProvided,
        gameValidator.validateGameExists
    );

    // getGameState, getGamePlayers, getCurrentPlayer, getTopCard y getGameScores
    // piden exactamente lo mismo que getGameById el id y que el juego exista, así
    // que reusamos la misma regla con otro nombre para que el controller sea mas claro
    const validateGetGameState = validateGetGame;
    const validateGetGamePlayers = validateGetGame;
    const validateGetCurrentPlayer = validateGetGame;
    const validateGetTopCard = validateGetGame;
    const validateGetGameScores = validateGetGame;
    const validateGetGameHistory = validateGetGame;

    const validateUpdateGame = composeAsyncValidators(
        gameValidator.validateIdProvided,
        gameValidator.validateGameExists,
        gameValidator.validateStateValidIfProvided
    );

    const validateDeleteGame = composeAsyncValidators(
        gameValidator.validateIdProvided,
        gameValidator.validateGameExists
    );

    const validateJoinGame = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateGameIsWaiting,
        gameValidator.validateUserNotAlreadyJoined
    );

    const validateStartGame = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateIsCreator,
        gameValidator.validateGameIsWaitingToStart,
        gameValidator.validateEnoughPlayers
    );

    const validateLeaveGame = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame
    );

    const validateEndGame = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateIsCreatorToEnd,
        gameValidator.validateGameInProgress
    );

    const validatePlayCard = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame,
        gameValidator.validateGameInProgress,
        gameValidator.validateIsPlayerTurn,
        gameValidator.validateCardInHand,
        gameValidator.validateChosenColorIfWild,
        gameValidator.validateValidMove,
    );

    const validateDrawCard = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame,
        gameValidator.validateGameInProgress,
        gameValidator.validateIsPlayerTurn,
        gameValidator.validateHasNoPlayableCard,
        gameValidator.validateDeckHasCards
    );

    const validateSayUno = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateGameInProgress,
        gameValidator.validateUserIsInGame,
        gameValidator.validateHandHasOneCard,
        gameValidator.validateNotAlreadySaidUno
    );

    const validateCatchUno = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateGameInProgress,
        gameValidator.validateUserIsInGame,          
        gameValidator.validateTargetUserIdProvided,
        gameValidator.validateNotCatchingSelf,
        gameValidator.validateTargetIsInGame,
        gameValidator.validateTargetHandHasOneCard,
        gameValidator.validateTargetHasNotSaidUno
    );

    const validateGetOwnHand = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame
    );

    const validateGetGameStateDetail = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame
    );

    const validateSuggestPlayableCard = composeAsyncValidators(
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame,
        gameValidator.validateGameInProgress,
        gameValidator.validateIsPlayerTurn
    );

    return {
        validateCreateGame, validateGetGame, validateGetGameState, validateGetGamePlayers,
        validateGetCurrentPlayer, validateGetTopCard, validateGetGameScores,
        validateUpdateGame, validateDeleteGame, validateJoinGame, validateStartGame,
        validateLeaveGame, validateEndGame, validatePlayCard, validateDrawCard, validateSayUno,
        validateCatchUno, validateGetGameHistory, validateGetOwnHand, validateGetGameStateDetail,
        validateSuggestPlayableCard
    };
};
