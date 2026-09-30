import { createCardService } from '../../Logic/Services/CardService.js';
import Result from '../../Logic/Monads/result.js';

describe('CardService Unit Tests', () => {
    let cardRepository, cardRules, cardService;

    beforeEach(() => {
        cardRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findByGameId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };
        
        cardRules = {
            validateCreateCard: jest.fn(),
            validateGetCard: jest.fn(),
            validateUpdateCard: jest.fn(),
            validateDeleteCard: jest.fn(),
        };

        cardService = createCardService({cardRepository, cardRules});
    });

    describe('createCard', () => {
        const payload = {color:'red', value: '5', gameId: 1, location: 'deck', playedAt: null};

        test('should return Err if the validation fails', async()=> {
            // validateCreateCard es síncrona en el servicio
            cardRules.validateCreateCard.mockReturnValue(Result.Err({statusCode: 400, message: 'Error'}));

            const result = await cardService.createCard(payload);

            expect(result.isErr()).toBe(true);
            expect(cardRepository.create).not.toHaveBeenCalled();
        });

        test('should create the cards if the validation is Ok', async () => {
            cardRules.validateCreateCard.mockReturnValue(Result.Ok(true));
            cardRepository.create.mockResolvedValue({id: 1, ...payload});

            const result = await cardService.createCard(payload);

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({id: 1, ...payload});
            expect(cardRepository.create).toHaveBeenCalledWith(payload);
        });
    });

    describe('getAllCards', () => {
        test('returns all the cards', async () => {
            cardRepository.findAll.mockResolvedValue([{id: 1}, {id: 2}]);
            const result = await cardService.getAllCards();
            expect(result).toHaveLength(2);
        });
    });

    describe('getCardById', () => {
        test('should return Err if the validation fails', async () => {
            // validateGetCard es síncrona
            cardRules.validateGetCard.mockReturnValue(Result.Err({ statusCode: 404, message: 'Not found'}));

            const result = await cardService.getCardById(999);
            expect(result.isErr()).toBe(true);
        });

        test('should return the card if it exists', async () => {
            cardRules.validateGetCard.mockReturnValue(Result.Ok({ card: { id: 1, color: 'blue' }}));

            const result = await cardService.getCardById(1);
            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({ id: 1, color: 'blue' });
        });
    });

    describe('getCardsByGame', () => {
        test('should return de cards by the id of the game', async () => {
            cardRepository.findByGameId.mockResolvedValue([{ id: 1, gameId: 5}]);
            const result = await cardService.getCardsByGame(5);
            expect(result).toEqual([{ id: 1, gameId: 5 }]);
        });
    });

    describe('updateCard', () => {
        test('should return Err if the validation fails', async () => {
            cardRules.validateUpdateCard.mockResolvedValue(Result.Err({statusCode: 400, message: 'Error'}));
            
            const result = await cardService.updateCard(1, { location: 'hand'});
            
            expect(result.isErr()).toBe(true);
            expect(cardRepository.update).not.toHaveBeenCalled();
        });

        test('should update if the validation is Ok', async () => {
            cardRules.validateUpdateCard.mockResolvedValue(Result.Ok(true));
            cardRepository.update.mockResolvedValue({ id: 1, location: 'hand'});

            const result = await cardService.updateCard(1, { location: 'hand'});
            
            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({ id: 1, location: 'hand' });
            expect(cardRepository.update).toHaveBeenCalledWith(1, { location: 'hand'});
        });
    });

    describe('deleteCard', () => {
        test('Returns Err if something fails', async () => {
            cardRules.validateDeleteCard.mockResolvedValue(Result.Err({ statusCode: 404, message: 'Not found'}));
            const result = await cardService.deleteCard(999);
            expect(result.isErr()).toBe(true);
        });

        test('should delete if its Ok', async () => {
            cardRules.validateDeleteCard.mockResolvedValue(Result.Ok(true));
            cardRepository.delete.mockResolvedValue(true);

            const result = await cardService.deleteCard(1);
            
            expect(result.isOk()).toBe(true);
            expect(result.value).toBe(true);
            expect(cardRepository.delete).toHaveBeenCalledWith(1);
        });
    });
});