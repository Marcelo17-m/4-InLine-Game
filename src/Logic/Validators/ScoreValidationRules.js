import { composeAsyncValidators } from "../../Helpers/composeAsyncValidators.js";

export const createScoreRules = (scoreValidator)=>({
    validateCreateScore: composeAsyncValidators(
    scoreValidator.validateCreateFieldsProvided,
    scoreValidator.validateGameExistsForScore,
    scoreValidator.validatePlayerExistsForScore
    ),
    
    validateGetScore: composeAsyncValidators(
        scoreValidator.validateIdProvided,
        scoreValidator.validateScoreExists
    ),
    
    validateUpdateScore: composeAsyncValidators(
        scoreValidator.validateIdProvided,
        scoreValidator.validateScoreExists
    ),
    
    validateDeleteScore: composeAsyncValidators(
        scoreValidator.validateIdProvided,
        scoreValidator.validateScoreExists
    ),
});
