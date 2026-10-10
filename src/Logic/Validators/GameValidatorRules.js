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
    );

    const validateRespondInvitation = composeAsyncValidators(
        gameValidator.validateRespondInvitationInput,
    );

    return {
        validateCreateGame, validateMakeMove, validateLeaveGame, validateCreateInvitation, validateRespondInvitation,
        validateGetAllGames, validateGetGameById, validateGetGameForPlayer, validateDeleteGame, validateUpdateGame,
    };
};
