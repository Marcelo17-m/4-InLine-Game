import * as rules from '../../Helpers/connectFourRules.js';

test.each([
    [[5, 0], [5, 1], [5, 2], [5, 3]],
    [[2, 6], [3, 6], [4, 6], [5, 6]],
    [[2, 0], [3, 1], [4, 2], [5, 3]],
    [[2, 6], [3, 5], [4, 4], [5, 3]],
])('recognizes four through an interior piece and at board edges: %p', (...cells) => {
    for (const piece of [1, 2]) {
        const board = rules.createEmptyBoard();
        cells.forEach(([row, col]) => { board[row][col] = piece; });
        cells.forEach(([row, col]) => expect(rules.hasFourInLine(board, row, col)).toBe(true));
    }
});

test('does not bridge gaps, mix colors, wrap edges, or count empty cells', () => {
    const board = rules.createEmptyBoard();
    expect(rules.hasFourInLine(board, 5, 0)).toBe(false);
    board[5] = [1, 1, 0, 1, 2, 1, 1];
    expect(rules.hasFourInLine(board, 5, 0)).toBe(false);
    expect(rules.hasFourInLine(board, 5, 6)).toBe(false);
    board[5] = [1, 1, 2, 1, 1, 0, 0];
    expect(rules.hasFourInLine(board, 5, 3)).toBe(false);
});

test('counts runs longer than four formed by filling their middle', () => {
    const board = rules.createEmptyBoard();
    board[5] = [1, 1, 1, 1, 1, 0, 0];
    expect(rules.hasFourInLine(board, 5, 2)).toBe(true);
});

test('board creation and placement do not share mutable rows', () => {
    const original = rules.createEmptyBoard();
    const next = rules.placePiece(original, 5, 0, 1);
    expect(original).toEqual(rules.createEmptyBoard());
    expect(next[4][0]).toBe(0);
    expect(rules.findLowestEmptyRow(next, 0)).toBe(4);
    expect(rules.countMoves(next)).toBe(1);
});
