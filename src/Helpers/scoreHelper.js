export const getCardPoints = (card) =>{
    if (card.type === 'number'){
        return parseInt(card.value, 10);
    }
    if (card.type === 'action'){
        return 20;
    }

    return 50;
};

export const calculateHandScore = (hand) =>{
    return hand.reduce((total, card) => total + getCardPoints(card), 0);
}