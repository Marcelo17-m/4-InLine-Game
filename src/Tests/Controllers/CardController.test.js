import request from 'supertest';
import app from '../../app.js';
import { cardService } from '../../container.js';
import Result from '../../Logic/Monads/result.js';

jest.mock('../../container.js', () => ({
    cardService: {
        createCard: jest.fn(),
        getAllCards: jest.fn(),
        getCardById: jest.fn(),
        updateCard: jest.fn(),
        deleteCard: jest.fn()
    }
}));

describe('Card routes',()=>{
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/cards',()=>{
        test('201 creates a card successfully',async() =>{
            const mockCard = { id: 1, color: 'red', value: '5', gameId: 1 };
            cardService.createCard.mockResolvedValue(Result.Ok(mockCard));

            const response = await request(app)
                .post('/api/cards')
                .send({ color: 'red', value: '5', gameId: 1 });

            expect(response.status).toBe(201);
            expect(response.body).toEqual(mockCard);
            expect(cardService.createCard).toHaveBeenCalledWith({
                color: 'red', value: '5', gameId: 1
            });
        });
    });

    describe('GET /api/cards', () => {
        test('200 returns all cards', async()=>{
            const mockCards = [{ id: 1, color: 'red' }, { id: 2, color: 'blue' }];
            // Como este controlador no usa handleResult sino res.json directo:
            cardService.getAllCards.mockResolvedValue(mockCards);

            const response = await request(app).get('/api/cards');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCards);
        });
    });

    describe('GET /api/cards/:id',()=>{
        test('200 returns the card', async()=> {
            cardService.getCardById.mockResolvedValue(Result.Ok({ id: 1, color: 'red' }));

            const response = await request(app).get('/api/cards/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ id: 1, color: 'red' });
        });

        test('404 when card is not found', async()=>{
            cardService.getCardById.mockResolvedValue(Result.Err({ statusCode: 404, message: 'Card not found' }));

            const response = await request(app).get('/api/cards/999');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'Card not found' });
        });
    });

    describe('PUT /api/cards/:id',()=>{
        test('200 updates the card successfully', async ()=>{
            cardService.updateCard.mockResolvedValue(Result.Ok({ id: 1, location: 'hand' }));

            const response = await request(app)
                .put('/api/cards/1')
                .send({ location: 'hand' });

            expect(response.status).toBe(200);
            expect(cardService.updateCard).toHaveBeenCalledWith('1', { location: 'hand' });
        });
    });

    describe('DELETE /api/cards/:id', ()=>{
        test('204 deletes the card successfully', async ()=>{
            cardService.deleteCard.mockResolvedValue(Result.Ok(true));

            const response = await request(app).delete('/api/cards/1');

            expect(response.status).toBe(204);
            expect(response.body).toEqual({}); // 204 no devuelve cuerpo
        });

        test('404 fails to delete if not found', async ()=>{
            cardService.deleteCard.mockResolvedValue(Result.Err({ statusCode: 404, message: 'Card not found' }));

            const response = await request(app).delete('/api/cards/999');

            expect(response.status).toBe(404);
        });
    });
});