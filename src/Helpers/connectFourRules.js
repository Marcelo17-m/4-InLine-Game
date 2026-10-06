export const ROWS = 6;
export const COLUMNS = 7;

export const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLUMNS).fill(0));
export const pieceValue = (piece) => ({ R: 1, Y: 2 })[piece];

export const findLowestEmptyRow = (board, column) => {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][column] === 0) return row;
    }
    return -1;
};

export const placePiece = (board, row, column, value) => {
    const next = board.map((cells) => [...cells]);
    next[row][column] = value;
    return next;
};

export const hasFourInLine = (board, row, column) => {
    const value = board[row][column];
    if (!value) return false;
    const count = (rowStep, columnStep) => {
        let total = 0;
        let r = row + rowStep;
        let c = column + columnStep;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r][c] === value) {
            total++;
            r += rowStep;
            c += columnStep;
        }
        return total;
    };
    return [[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dc]) =>
        1 + count(dr, dc) + count(-dr, -dc) >= 4
    );
};

export const isBoardFull = (board) => board.every((row) => row.every((cell) => cell !== 0));
export const countMoves = (board) => board.reduce((total, row) => total + row.filter((cell) => cell !== 0).length, 0);

// Explicit public projection: never serialize ORM instances or authentication data.
export const toGameState = (game, players) => ({
    gameId: game.id,
    creatorId: game.creatorId,
    state: game.state,
    board: game.board.map((row) => [...row]),
    currentPlayerId: game.currentPlayerId ?? null,
    winnerId: game.winnerId ?? null,
    finishReason: game.finishReason ?? null,
    createdAt: game.createdAt,
    finishedAt: game.finishedAt ?? null,
    players: players.map((player) => ({
        userId: player.userId,
        username: player.User?.username ?? null,
        piece: player.piece,
        turnOrder: player.turnOrder,
        invitationStatus: player.invitationStatus,
    })),
});
