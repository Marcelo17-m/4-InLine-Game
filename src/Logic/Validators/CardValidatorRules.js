import { composeAsyncValidators } from '../../Helpers/composeAsyncValidators.js';

export const createCardRules = (cardValidator) => ({
    validateCreateCard: composeAsyncValidators(
        cardValidator.validateCreateFieldsProvided,
        cardValidator.validateColorValid,
        cardValidator.validateLocationValid,
        cardValidator.validateTypeValid,
        cardValidator.validateGameExistsForCard
    ),
    validateGetCard: composeAsyncValidators(
        cardValidator.validateIdProvided,
        cardValidator.validateCardExists
    ),
    
    validateUpdateCard: composeAsyncValidators(
        cardValidator.validateIdProvided,
        cardValidator.validateCardExists,
        cardValidator.validateColorValid,
        cardValidator.validateLocationValid,
        cardValidator.validateTypeValid,
        cardValidator.validateGameExistsIfGameIdProvided
    ),
    validateDeleteCard: composeAsyncValidators(
        cardValidator.validateIdProvided,
        cardValidator.validateCardExists
    ),
});