import { composeAsyncValidators } from '../../Helpers/composeAsyncValidators.js';

export const createAuthRules = (authValidator) => ({
    validateRegisterUser: composeAsyncValidators(
        authValidator.validateRegisterFieldsProvided,
        authValidator.validateUsernameNotTaken
    ),
    validateLoginUser: composeAsyncValidators(
        authValidator.validateLoginFieldsProvided,
        authValidator.validateUserExistsForLogin,
        authValidator.validatePasswordMatches
    ),
    validateGetProfile: composeAsyncValidators(
        authValidator.validateIdProvided,
        authValidator.validateUserExists
    ),
    validateDeleteUser: composeAsyncValidators(
        authValidator.validateIdProvided,
        authValidator.validateUserCanDeleteAccount,
        authValidator.validateUserExists
    ),
    validateLogoutUser: composeAsyncValidators(
        authValidator.validateTokenProvided
    ),
});
