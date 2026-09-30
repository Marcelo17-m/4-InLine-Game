// Mapa de la hoja de sprites `uno-cards.png`.
// La hoja está recortada exactamente a una grilla de 12 columnas x 6 filas
// (algunas celdas de la última fila estan vacías, por eso hay 64 cartas
// y no 72). row/col son 0-indexed.

export const SPRITE_COLS = 12;
export const SPRITE_ROWS = 6;

export const CARD_SPRITE_MAP = {
  // Fila 0: dorso, comodines
  back: { row: 0, col: 0 },
  'wild-black': { row: 0, col: 1 },
  'wild-yellow': { row: 0, col: 2 },
  'wild-red': { row: 0, col: 3 },
  'wild-blue': { row: 0, col: 4 },
  'wild-green': { row: 0, col: 5 },
  'wild4-black': { row: 0, col: 6 },
  'wild4-yellow': { row: 0, col: 7 },
  'wild4-red': { row: 0, col: 8 },
  'wild4-blue': { row: 0, col: 9 },
  'wild4-green': { row: 0, col: 10 },

  // Fila 1: amarillas 1-9, 0, +2, skip
  'yellow-1': { row: 1, col: 0 },
  'yellow-2': { row: 1, col: 1 },
  'yellow-3': { row: 1, col: 2 },
  'yellow-4': { row: 1, col: 3 },
  'yellow-5': { row: 1, col: 4 },
  'yellow-6': { row: 1, col: 5 },
  'yellow-7': { row: 1, col: 6 },
  'yellow-8': { row: 1, col: 7 },
  'yellow-9': { row: 1, col: 8 },
  'yellow-0': { row: 1, col: 9 },
  'yellow-draw2': { row: 1, col: 10 },
  'yellow-skip': { row: 1, col: 11 },

  // Fila 2: reverse amarilla + rojas 1-9, 0, +2
  'yellow-reverse': { row: 2, col: 0 },
  'red-1': { row: 2, col: 1 },
  'red-2': { row: 2, col: 2 },
  'red-3': { row: 2, col: 3 },
  'red-4': { row: 2, col: 4 },
  'red-5': { row: 2, col: 5 },
  'red-6': { row: 2, col: 6 },
  'red-7': { row: 2, col: 7 },
  'red-8': { row: 2, col: 8 },
  'red-9': { row: 2, col: 9 },
  'red-0': { row: 2, col: 10 },
  'red-draw2': { row: 2, col: 11 },

  // Fila 3: skip + reverse rojas, azules 1-9, 0
  'red-skip': { row: 3, col: 0 },
  'red-reverse': { row: 3, col: 1 },
  'blue-1': { row: 3, col: 2 },
  'blue-2': { row: 3, col: 3 },
  'blue-3': { row: 3, col: 4 },
  'blue-4': { row: 3, col: 5 },
  'blue-5': { row: 3, col: 6 },
  'blue-6': { row: 3, col: 7 },
  'blue-7': { row: 3, col: 8 },
  'blue-8': { row: 3, col: 9 },
  'blue-9': { row: 3, col: 10 },
  'blue-0': { row: 3, col: 11 },

  // Fila 4: +2, skip, reverse azules, verdes 1-9
  'blue-draw2': { row: 4, col: 0 },
  'blue-skip': { row: 4, col: 1 },
  'blue-reverse': { row: 4, col: 2 },
  'green-1': { row: 4, col: 3 },
  'green-2': { row: 4, col: 4 },
  'green-3': { row: 4, col: 5 },
  'green-4': { row: 4, col: 6 },
  'green-5': { row: 4, col: 7 },
  'green-6': { row: 4, col: 8 },
  'green-7': { row: 4, col: 9 },
  'green-8': { row: 4, col: 10 },
  'green-9': { row: 4, col: 11 },

  // Fila 5: 0, +2, skip, reverse verdes
  'green-0': { row: 5, col: 0 },
  'green-draw2': { row: 5, col: 1 },
  'green-skip': { row: 5, col: 2 },
  'green-reverse': { row: 5, col: 3 },
};

// Arma el id a partir de lo que probablemente ya tienes en tu modelo de
// datos del backend (color + value). Ajusta los valores de `value` si tu
// CardValidator usa otros nombres (p. ej. 'DRAW_TWO' en vez de 'draw2').
export function cardIdFromColorValue(color, value) {
  if (color === 'wild' || value === 'wild' || value === 'wild4') {
    return value === 'wild4' ? 'wild4-black' : 'wild-black';
  }
  return `${color}-${value}`;
}
