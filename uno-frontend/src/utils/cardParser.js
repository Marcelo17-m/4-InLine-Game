import { cardIdFromColorValue } from '../data/cardSprite.js';

export function parseBackendCardString(cardString) {
  if (!cardString) return null;
  
  const lower = cardString.toLowerCase();
  
  // Wilds: "wild", "wild_draw_four", "red wild", "red wild_draw_four"
  if (lower.includes('wild')) {
    const isDraw4 = lower.includes('wild_draw_four');
    const parts = lower.split(/[\s_]+/);
    
    // Default color is black for cards in hand
    let wildColor = 'black';
    // If it has a color prefix (e.g. from topCard), use it
    if (parts.length > 1 && ['red', 'blue', 'green', 'yellow'].includes(parts[0])) {
      wildColor = parts[0];
    }
    
    return isDraw4 ? `wild4-${wildColor}` : `wild-${wildColor}`;
  }

  // Regular cards format: "red 7", "blue skip", "green draw_two"
  const parts = lower.split(/[\s_]+/);
  const color = parts[0];
  let value = parts.slice(1).join('_'); // Rejoin in case of "draw_two"

  // Map backend values to sprite values
  if (value === 'draw_two') value = 'draw2';

  return cardIdFromColorValue(color, value);
}
