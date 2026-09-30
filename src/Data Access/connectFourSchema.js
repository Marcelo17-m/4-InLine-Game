// Persistence representation: row 0 is the top; 0 = empty, 1/2 = playerNumber.
export const BOARD_ROWS = 6;
export const BOARD_COLUMNS = 7;
export const createEmptyBoard = () => Array.from(
    { length: BOARD_ROWS }, () => Array(BOARD_COLUMNS).fill(0)
);

export const validateBoard = (board) => {
    if (!Array.isArray(board) || board.length !== BOARD_ROWS ||
        Array.from(board).some((row) => !Array.isArray(row) || row.length !== BOARD_COLUMNS ||
            Array.from(row).some((cell) => ![0, 1, 2].includes(cell)))) {
        throw new Error('board must be a 6 by 7 matrix containing only 0, 1 and 2');
    }
};
