export const createScoreService = ({scoreRepository, scoreRules}) =>{
    const createScore = async ({playerId, gameId, score}) => {
        const result = await scoreRules.validateCreateScore({playerId, gameId, score});
        if (result.isErr()) return result;

        const created = await scoreRepository.create({playerId, gameId, score});
        return result.map(()=> created);
    };

    const getAllScores = async () => {
        return scoreRepository.findAll();
    };

    const getScoreById = async (id) => {
        const result = await scoreRules.validateGetScore({ id });
        if (result.isErr()) return result;
    
        return result.map(({ score }) => score);
    };

    const getScoresByPlayer = async (playerId) => {
        return scoreRepository.findByPlayerId(playerId);
    }

    const updateScore = async (id, data) => {
        const result = await scoreRules.validateUpdateScore({ id, ...data });
        if (result.isErr()) return result;
    
        const score = await scoreRepository.update(id, data);
        return result.map(() => score);
    };

    const deleteScore = async (id) => {
        const result = await scoreRules.validateDeleteScore({ id });
        if (result.isErr()) return result;
    
        await scoreRepository.delete(id);
        return result.map(() => true);
    };

    return { 
        createScore, 
        getAllScores, 
        getScoreById, 
        getScoresByPlayer, 
        updateScore, 
        deleteScore 
    };
};