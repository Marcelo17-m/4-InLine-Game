export const generateAndShuffleDeck = (gameId) => {
    const colors = ['red', 'yellow', 'green', 'blue'];
    const actionValues = ['skip', 'reverse', 'draw_two'];
    let deck = [];

    colors.forEach(color => {
        //Numeros del 0 al 9 por cada color son 2 cartas de cada una por eso se hace 2
        deck.push({gameId, color, type: 'number', value: '0', location: 'deck', ownerId: null});
        for (let i = 1; i <= 9; i++){
            const value = i.toString();
            deck.push({gameId, color, type: 'number', value, location: 'deck', ownerId: null});
            deck.push({gameId, color, type: 'number', value, location: 'deck', ownerId: null});
        }
        //Cartas de accion 2 por cada color
        actionValues.forEach(value => {
            deck.push({gameId, color, type: 'action', value, location: 'deck', ownerId: null});
            deck.push({gameId, color, type: 'action', value, location: 'deck', ownerId: null});
        });
    });

    //comodines
    for (let i = 0; i < 4; i++){
        //wild es el cambio de color
        deck.push({gameId, color: null, type: 'wild', value: 'wild', location: 'deck', ownerId: null});
        deck.push({gameId, color: null, type: 'wild', value: 'wild_draw_four', location: 'deck', ownerId: null});
    }

    //Algoritmos para randomizar todo me lo robe se llama Fisher-Yates
    for (let i = deck.length -1; i> 0; i--){
        const j = Math.floor(Math.random() * (i+1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
};