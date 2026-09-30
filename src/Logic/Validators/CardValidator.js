import Result from '../Monads/result.js';

export const createCardValidator = ({cardRepository, gameRepository, config})=>{
    const validateIdProvided = async (data) => {
        if (!data.id) {
            return Result.Err({ statusCode: 400, message: 'id is required' });
        }
        return Result.Ok(data);
    };

    const validateCardExists = async (data) => {
        const card = await cardRepository.findById(data.id);
        if (!card) {
            return Result.Err({statusCode:404, message: 'Card not found'});
        }
        return Result.Ok({...data, card});
    };

    const validateCreateFieldsProvided = async (data) =>{
        const {color, value, gameId} = data;
        if (!color || !value || !gameId) {
            return Result.Err({statusCode:400, message: 'color, value and GameId are mandatory' });
        }
        return Result.Ok(data);
    };

    const validateColorValid = async (data) => {
        if (data.color !== undefined && !config.validColors.includes(data.color)) {
            return Result.Err({statusCode:400, message:`color debe ser uno de: ${config.validColors.join(', ')}` });
        }
        return Result.Ok(data);
    };

    const validateLocationValid = async(data) =>{
        if (data.location !== undefined && !config.validLocations.includes(data.location)){
            return Result.Err({ statusCode: 400, message: `location debe ser uno de: ${config.validLocations.join(', ')}` });
        }
        return Result.Ok(data);
    };

    const validateTypeValid = async(data) =>{
        if (data.type !== undefined && !config.validTypes.includes(data.type)){
            return Result.Err({ statusCode: 400, message: `type debe ser uno de: ${config.validTypes.join(', ')}` });
        }
        return Result.Ok(data);
    };

    const validateGameExistsForCard = async(data) => {
        const game = await gameRepository.findById(data.gameId);
        if(!game) {
            return Result.Err({ statusCode: 400, message: 'the gameId doesnt exist' });
        }
        return Result.Ok({...data, game});
    };

    const validateGameExistsIfGameIdProvided = async (data) => {
        if(data.gameId === undefined) return Result.Ok(data);

        const game = await gameRepository.findById(data.gameId);
        if(!game){
            return Result.Err({statusCode:400, message: 'the gameId doesnt exist'});
        }
        return Result.Ok({...data, game});
    }

    return {
        validateIdProvided,
        validateGameExistsIfGameIdProvided,
        validateGameExistsForCard,
        validateLocationValid,
        validateCreateFieldsProvided,
        validateColorValid,
        validateCardExists,
        validateTypeValid
    };
};