export const distributeCardsRecursively = (deck, players, cardsPerRound, deckIndex = 0, playerIndex = 0) => {
    //basic case for the amount of rounds left.
    if (cardsPerRound === 0){
        return deckIndex;
    }
    //asign the card to the actual player
    deck[deckIndex].location = 'hand';
    deck[deckIndex].ownerId = players[playerIndex].userId;

    //calculate the next player
    const nextPlayerIndex = (playerIndex + 1) % players.length;

    //if we alredy finish the whole round to the players we substract one round
    const nextCardsPerRound = nextPlayerIndex === 0 ? cardsPerRound -1 : cardsPerRound

    return distributeCardsRecursively(deck, players, nextCardsPerRound, deckIndex + 1, nextPlayerIndex);
}