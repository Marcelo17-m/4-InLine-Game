import { composeAsyncValidators } from '../../Helpers/composeAsyncValidators.js';

export const createGameRules = (gameValidator) => {
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

    return { validateCreateGame,validateMakeMove, validateLeaveGame, validateCreateInvitation, validateRespondInvitation };
};
