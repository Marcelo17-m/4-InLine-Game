import { getCardPoints, calculateHandScore } from '../../Helpers/scoreHelper.js';

describe('scoreHelper', () => {
    describe('getCardPoints', () => {
        test('returns a numeric value for the numbers of the cards', () => {
            expect(getCardPoints({ type: 'number', value: '7' })).toBe(7);
            expect(getCardPoints({ type: 'number', value: '0' })).toBe(0);
        });

        test('returns 20 for the action cards', () => {
            expect(getCardPoints({ type: 'action', value: 'skip' })).toBe(20);
            expect(getCardPoints({ type: 'action', value: 'draw_two' })).toBe(20);
        });

        test('returns 50 for wild cards', () => {
            expect(getCardPoints({ type: 'wild', value: 'wild_draw_four' })).toBe(50);
        });
    });

    describe('calculateHandScore', ()=>{
        test('correctly calculates the score of one hand', ()=>{
            const hand = [
                { type: 'number', value: '5' }, // 5
                { type: 'action', value: 'reverse' }, // 20
                { type: 'wild', value: 'wild' } // 50
            ];
            
            expect(calculateHandScore(hand)).toBe(75);
        });

        test('devuelve 0 si la mano está vacía', () => {
            expect(calculateHandScore([])).toBe(0);
        });
    });
});