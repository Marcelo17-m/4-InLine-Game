import { distributeCardsRecursively } from '../../Helpers/distributionHelper.js';

describe('distributeCardsRecursively', () => {
    test('distributes the cards correctly between the players', () => {
        const mockDeck = Array.from({ length: 20 }, (_, i) => ({ id: i, location: 'deck', ownerId: null }));
        const players = [{ userId: 'player1' }, { userId: 'player2' }];
        const cardsPerRound = 3;

        //shuffles 3 cards to two players six in total
        const newDeckIndex = distributeCardsRecursively(mockDeck, players, cardsPerRound);

        expect(newDeckIndex).toBe(6);

        //verify the first player
        expect(mockDeck[0].ownerId).toBe('player1');
        expect(mockDeck[2].ownerId).toBe('player1');
        expect(mockDeck[4].ownerId).toBe('player1');

        expect(mockDeck[1].ownerId).toBe('player2');
        expect(mockDeck[3].ownerId).toBe('player2');
        expect(mockDeck[5].ownerId).toBe('player2');

        expect(mockDeck.slice(0, 6).every(c=> c.location === 'hand')).toBe(true);

        expect(mockDeck[6].location).toBe('deck');
        expect(mockDeck[6].ownerId).toBe(null);
    });

});