import { isValidMove } from "../../Helpers/cardRules.js";

describe('isValidMove', ()=>{
    test('is always valid to play a wild card', () =>{
        const played = {type: 'wild', color: null, value: 'wild'};
        const top = {type: 'number', color: 'red', value: '5'};
        expect(isValidMove(played, top, 'red')).toBe(true);
    });

    test('if the topcard is a wild card is has to match the actual color selected', ()=>{
        const played = {type: 'number', color: 'blue', value:'2'};
        const top = {type:'wild', color:null, value: 'wild'};

        expect(isValidMove(played, top, 'blue')).toBe(true);
        expect(isValidMove(played, top, 'red')).toBe(false);
    });

    test('is valid if it matches the normal color',()=>{
        const played = { type: 'number', color: 'green', value: '7' };
        const top = { type: 'action', color: 'green', value: 'skip' };
        expect(isValidMove(played, top, 'green')).toBe(true);
    });

    test('is valid if the value matches but the color doesnt', () => {
        const played = { type: 'number', color: 'yellow', value: '5' };
        const top = { type: 'number', color: 'red', value: '5' };
        expect(isValidMove(played, top, 'red')).toBe(true);
    });

    test('It is not valid if neither the color nor the value matches.', () => {
        const played = { type: 'number', color: 'yellow', value: '8' };
        const top = { type: 'number', color: 'red', value: '5' };
        expect(isValidMove(played, top, 'red')).toBe(false);
    });
})