import request from 'supertest';
import app from '../../app.js';
import { scoreService } from '../../container.js';
import Result from '../../Logic/Monads/result.js';

jest.mock('../../container.js', () => ({
    scoreService: {
        createScore: jest.fn(),
        getAllScores: jest.fn(),
        getScoreById: jest.fn(),
        updateScore: jest.fn(),
        deleteScore: jest.fn()
    }
}));

describe('Score routes', ()=>{
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/scores', ()=>{
        test('201 creates a score successfully', async () => {
            const mockScore = { id: 1, playerId: 1, gameId: 1, score: 100 };
            scoreService.createScore.mockResolvedValue(Result.Ok(mockScore));

            const response = await request(app)
                .post('/api/scores')
                .send({playerId:1, gameId:1, score:100 });

            expect(response.status).toBe(201);
            expect(response.body).toEqual(mockScore);
        });
    });

    describe('GET /api/scores', ()=>{
        test('200 returns all scores', async () => {
            const mockScores = [{id: 1, score:100}, {id:2, score:50,}];
            scoreService.getAllScores.mockResolvedValue(mockScores);

            const response = await request(app).get('/api/scores');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockScores);
        });
    });

    describe('GET /api/scores/:id', () => {
        test('200 returns the score by id', async () => {
            scoreService.getScoreById.mockResolvedValue(Result.Ok({id:1, score:100 }));

            const response = await request(app).get('/api/scores/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({id:1, score:100});
        });
    });

    describe('PUT /api/scores/:id', () => {
        test('200 updates the score', async () => {
            scoreService.updateScore.mockResolvedValue(Result.Ok({id:1, score:150}));

            const response = await request(app)
                .put('/api/scores/1')
                .send({score:150});

            expect(response.status).toBe(200);
            expect(scoreService.updateScore).toHaveBeenCalledWith('1', {score:150});
        });
    });

    describe('DELETE /api/scores/:id', () => {
        test('204 deletes the score', async () => {
            scoreService.deleteScore.mockResolvedValue(Result.Ok(true));

            const response = await request(app).delete('/api/scores/1');

            expect(response.status).toBe(204);
        });

        test('404 fails when score not found', async () => {
            scoreService.deleteScore.mockResolvedValue(Result.Err({statusCode:404, message:'Score not found'}));

            const response = await request(app).delete('/api/scores/999');

            expect(response.status).toBe(404);
        });
    });
});