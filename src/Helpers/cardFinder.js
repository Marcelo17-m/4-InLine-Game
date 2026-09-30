export function* findCardInHand(hand, cardStringToFind){
    for (const card of hand){
        const color = card.color ? card.color.toLowerCase() : '';
        const value = card.value.replaceAll('_', '').toLowerCase();
        const cardInHand = color + value
        const cardToFind = cardStringToFind.replaceAll(/[\s_]+/g, '').toLowerCase();

        if (cardInHand === cardToFind){
            yield card;
        }
    }
}