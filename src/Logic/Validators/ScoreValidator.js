import Result from '../Monads/result.js';

export const createScoreValidator = ({ scoreRepository, gameRepository, userRepository }) => {
    const validateIdProvided = async (data) => {
        if (!data.id){
            return Result.Err({statusCode:400, message: 'id is required'});
        }
        return Result.Ok(data);
    };

    const validateScoreExists = async (data) => {
        const score = await scoreRepository.findById(data.id);
        if (!score) {
            return Result.Err({statusCode: 404, message: 'Score not found'});
        }
        return Result.Ok({...data, score});
    };

    const validateCreateFieldsProvided = async (data) =>{
        const { playerId, gameId, score} = data;
        if(!playerId || !gameId || score === undefined) {
            return Result.Err({statusCode: 400, message: 'playerId, gameId and score are mandatory'});
        }
        return Result.Ok(data);
    };

    const validateGameExistsForScore = async (data) => {
        const game = await gameRepository.findById(data.gameId);
        if(!game) {
            return Result.Err({statusCode:400, message: 'the gameId doesnt exist'});
        }
        return Result.Ok({...data, game});
    };

    const validatePlayerExistsForScore = async (data) => {
        const player = await userRepository.findById(data.playerId);
        if (!player) {
            return Result.Err({ statusCode: 400, message: 'the playerId doesnt exist' });
        }
        return Result.Ok({ ...data, player });
    };

    return {
        validateIdProvided,
        validateScoreExists,
        validateCreateFieldsProvided,
        validateGameExistsForScore,
        validatePlayerExistsForScore
    };
};
