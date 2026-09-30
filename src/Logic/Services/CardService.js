export const createCardService = ({cardRepository, cardRules}) =>{
    const createCard = async ({color, value, gameId, location = 'deck', playedAt = null}) => {
        const result = await cardRules.validateCreateCard({color, value, gameId, location, playedAt});
        if (result.isErr()) return result;

        const card = await cardRepository.create({color, value, gameId, location, playedAt});
        return result.map(()=> card);
    };

    const getAllCards = async () => {
        return cardRepository.findAll();
    };

    const getCardById = async (id) => {
        const result = await cardRules.validateGetCard({id});
        if(result.isErr()) return result;

        return result.map(({card})=> card);
    };

    const getCardsByGame = async (gameId) => {
        return cardRepository.findByGameId(gameId);
    };

    const updateCard = async (id, data) => {
        const result = await cardRules.validateUpdateCard({id, ...data});
        if(result.isErr()) return result;

        const card = await cardRepository.update(id, data);
        return result.map(()=> card);
    };

    const deleteCard = async (id) => {
        const result = await cardRules.validateDeleteCard({id});
        if (result.isErr()) return result;
    
        await cardRepository.delete(id);
        return result.map(() => true);
    };

    return{deleteCard, updateCard, getCardById, getAllCards, createCard, getCardsByGame};
};