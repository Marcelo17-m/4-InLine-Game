export const isValidMove = (playedCard, topCard, currentColor) => {
    if (playedCard.type === 'wild') return true;
    
    // Si la carta anterior fue un comodín, el color a igualar es el que se eligió
    if (topCard.type === 'wild') {
        return playedCard.color === currentColor;
    }
    
    // Coincidencia normal de color o de valor
    return playedCard.color === topCard.color || playedCard.value === topCard.value;
};