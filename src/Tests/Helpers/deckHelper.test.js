import { generateAndShuffleDeck } from '../../Helpers/deckHelper.js';

describe('generateAndShuffleDeck', () => {
    const gameId = 'game-123';
    let deck;

    beforeEach(() => {
        deck = generateAndShuffleDeck(gameId);
    });

    test('generates a exact deck of 108 cards', () => {
        expect(deck.length).toBe(108);
    });

    test('all the cards have the correct initial data', ()=>{
        const allCorrect = deck.every(card=>
            card.gameId === gameId &&
            card.location === 'deck' &&
            card.ownerId === null
        );
        expect(allCorrect).toBe(true);
    });

    test('generates the exact amount of wild cards', ()=>{
        const wilds = deck.filter(c=> c.type === 'wild' && c.value === 'wild');
        const wildDrawFours = deck.filter(c=> c.type === 'wild' && c.value == 'wild_draw_four');

        expect(wilds.length).toBe(4);
        expect(wildDrawFours.length).toBe(4);
    });

    test('generates the cards with value 0 and the action cards of each color correctly', ()=>{
        const redZeros = deck.filter(c=> c.color === 'red' && c.value === '0');
        const blueSkips = deck.filter(c=> c.color === 'blue' && c.value === 'skip');

        expect(redZeros.length).toBe(1);
        expect(blueSkips.length).toBe(2);
    });
});