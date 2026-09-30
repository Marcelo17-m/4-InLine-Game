import { findCardInHand } from "../../Helpers/cardFinder.js";

describe('findCardInHand', ()=>{
    const mockHand = [
        { color: 'red', value: '5' },
        { color: 'Blue', value: 'skip' },
        { color: null, value: 'wild_draw_four' },
        { color: 'red', value: '5' } // Carta duplicada
    ];

    test('founds a card ignoring the capital letters and the spaces', () =>{
        const result = [...findCardInHand(mockHand, 'Red 5')];
        expect(result.length).toBe(2);
        expect(result[0]).toEqual({ color: 'red', value: '5' });
    });

    test('founds and action card with underscore and spaces', ()=>{
        const result = [...findCardInHand(mockHand, 'blue_skip')];
        expect(result.length).toBe(1);
        expect(result[0].color).toBe('Blue');
    });

    test('founds wilds without the color', ()=>{
        const result = [...findCardInHand(mockHand, 'wild draw four')];
        expect(result.length).toBe(1);
        expect(result[0].value).toBe('wild_draw_four');
    });

    test('no devuelve nada si la carta no está en la mano', () => {
        const result = [...findCardInHand(mockHand, 'green 9')];
        expect(result.length).toBe(0);
    });
})