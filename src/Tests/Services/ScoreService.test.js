import { createScoreService } from "../../Logic/Services/ScoreService.js";
import Result from '../../Logic/Monads/result.js';

describe('ScoreService Unit Tests', ()=>{
    let scoreRepository, scoreRules, scoreService;

    beforeEach(() => {
        scoreRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findByPlayerId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };
        
        scoreRules = {
            validateCreateScore: jest.fn(),
            validateGetScore: jest.fn(),
            validateUpdateScore: jest.fn(),
            validateDeleteScore: jest.fn(),
        };

        scoreService = createScoreService({scoreRepository, scoreRules});
    });

    describe('createScore', ()=>{
        const payload = {playerId:1, gameId:1, score:500};

        test('return Err if it fails', async () => {
            scoreRules.validateCreateScore.mockResolvedValue(Result.Err({statusCode:400}));
            
            const result = await scoreService.createScore(payload);
            
            expect(result.isErr()).toBe(true);
            expect(scoreRepository.create).not.toHaveBeenCalled();
        });

        test('creates the score if the validation is correct', async ()=>{
            scoreRules.validateCreateScore.mockResolvedValue(Result.Ok(true));
            scoreRepository.create.mockResolvedValue({id:10, ...payload});

            const result = await scoreService.createScore(payload);
            
            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({id:10, ...payload});
            expect(scoreRepository.create).toHaveBeenCalledWith(payload);
        });
    });

    describe('getAllScores and getScoresByPlayer', ()=>{
        test('getAllScores returns direct array', async () => {
            scoreRepository.findAll.mockResolvedValue([{id:1}]);
            const result = await scoreService.getAllScores();
            expect(result).toHaveLength(1);
        });

        test('getScoresByPlayer returns a direct array', async()=>{
            scoreRepository.findByPlayerId.mockResolvedValue([{id:1, playerId:5}]);
            const result = await scoreService.getScoresByPlayer(5);
            expect(result).toEqual([{ id: 1, playerId: 5 }]);
            expect(scoreRepository.findByPlayerId).toHaveBeenCalledWith(5);
        });
    });

    describe('getScoreById', ()=>{
        test('return if the validator fails with Err', async ()=>{
            scoreRules.validateGetScore.mockResolvedValue(Result.Err({statusCode:404}));
            const result = await scoreService.getScoreById(99);
            expect(result.isErr()).toBe(true);
        });

        test('returns the score if the validator is Ok', async()=>{
            scoreRules.validateGetScore.mockResolvedValue(Result.Ok({score:{ id:1, score:100}}));
            const result = await scoreService.getScoreById(1);
            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({ id: 1, score: 100 });
        });
    });

    describe('updateScore', ()=>{
        test('updates the data if the validator is Ok', async()=>{
            scoreRules.validateUpdateScore.mockResolvedValue(Result.Ok(true));
            scoreRepository.update.mockResolvedValue({id:1, score:200});

            const result = await scoreService.updateScore(1, {score:200});
            
            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({id:1, score:200});
            expect(scoreRepository.update).toHaveBeenCalledWith(1,{score:200});
        });

        test('returns Err if validation fails', async () => {
            scoreRules.validateUpdateScore.mockResolvedValue(Result.Err({statusCode: 400}));
            
            const result = await scoreService.updateScore(1, { score: 200 });
            
            expect(result.isErr()).toBe(true);
            expect(scoreRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('deleteScore', ()=>{
        test('eliminates the score if its true then return Ok', async ()=>{
            scoreRules.validateDeleteScore.mockResolvedValue(Result.Ok(true));
            scoreRepository.delete.mockResolvedValue(true);

            const result = await scoreService.deleteScore(1);
            
            expect(result.isOk()).toBe(true);
            expect(result.value).toBe(true);
            expect(scoreRepository.delete).toHaveBeenCalledWith(1);
        });

        test('returns Err if validation fails', async()=>{
            scoreRules.validateDeleteScore.mockResolvedValue(Result.Err({statusCode:404}));
            
            const result = await scoreService.deleteScore(1);

            expect(result.isErr()).toBe(true);
            expect(scoreRepository.delete).not.toHaveBeenCalled();
        })
    });
});