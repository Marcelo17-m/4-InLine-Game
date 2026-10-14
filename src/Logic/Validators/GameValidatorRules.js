import { composeAsyncValidators } from '../../Helpers/composeAsyncValidators.js';

export const createGameRules = (gameValidator) => {
    const validateGetAllGames = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
    );

    const validateGetGameById = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
    );

    const validateGetGameForPlayer = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame,
    );

    const validateDeleteGame = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateGameCreator,
    );

    const validateUpdateGame = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateGameCreator,
        gameValidator.validateUpdateFields,
        gameValidator.validateUpdatedBoard,
        gameValidator.validateUpdatedGameState,
    );

    const validateCreateGame = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateCreatorExists,
        gameValidator.validateUserAvailable,
    );

    const validateStartGame = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateStartCreator,
        gameValidator.validateGamePending,
        gameValidator.validateUserIsInGame,
        gameValidator.validateAcceptedPlayer,
        gameValidator.validateTwoPlayers,
    );

    const validateMakeMove = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateGameIdProvided,
        gameValidator.validateColumn,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame,
        gameValidator.validateAcceptedPlayer,
        gameValidator.validateGameInProgress,
        gameValidator.validateTwoPlayers,
        gameValidator.validateIsPlayerTurn,
        gameValidator.validateColumnHasSpace,
    );

    const validateLeaveGame = composeAsyncValidators(
        gameValidator.validateAuthenticatedUser,
        gameValidator.validateGameIdProvided,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateUserIsInGame,
        gameValidator.validateAcceptedPlayer,
        gameValidator.validateGameInProgress,
        gameValidator.validateTwoPlayers,
    );

    const validateCreateInvitation = composeAsyncValidators(
        gameValidator.validateCreateInvitationInput,
        gameValidator.validateGameIdProvided,
        gameValidator.validateCreatorExists,
        gameValidator.validateGameExistsByGameId,
        gameValidator.validateInvitationGame,
        gameValidator.validateUserIsInGame,
        gameValidator.validateAcceptedPlayer,
        gameValidator.validateInvitationSlotAvailable,
        gameValidator.validateInvitationPlayersAvailable,
    );

    const validateRespondInvitation = composeAsyncValidators(
        gameValidator.validateRespondInvitationInput,
    );

    return {
        validateCreateGame, validateStartGame, validateMakeMove, validateLeaveGame, validateCreateInvitation, validateRespondInvitation,
        validateGetAllGames, validateGetGameById, validateGetGameForPlayer, validateDeleteGame, validateUpdateGame,
    };
};
