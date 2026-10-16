import { useEffect, useRef, useState } from 'react';
import GameLogo from '../GameLogo/GameLogo.jsx';
import { getCurrentUser } from '../../api/session.js';
import { makeMove } from '../../api/gameApi.js';
import { useGameConnection } from '../../hooks/useGameConnection.js';
import styles from './GameBoard.module.css';

function GameBoard({ gameId, initialGameState, onBack }) {
  const { game, connected, connection, error, setError, refresh } = useGameConnection(gameId, initialGameState);
  const [highlighted, setHighlighted] = useState(null);
  const [pendingColumn, setPendingColumn] = useState(null);
  const busy = useRef(false);
  const resultDialog = useRef(null);
  const userId = getCurrentUser()?.sub;
  const players = game?.players ?? [];
  const currentPlayer = players.find((player) => String(player.userId) === String(game?.currentPlayerId));
  const me = players.find((player) => String(player.userId) === String(userId));
  const winner = players.find((player) => String(player.userId) === String(game?.winnerId));
  const finished = game?.state === 'finished';
  const draw = finished && game.finishReason === 'draw';
  const myTurn = game?.state === 'in_progress' && me?.invitationStatus === 'accepted'
    && String(game.currentPlayerId) === String(userId);
  const canPlay = connected && myTurn && pendingColumn === null;
  const board = game?.board ?? [];
  const boardReady = board.length === 6 && board.every((row) => Array.isArray(row) && row.length === 7);
  const resultTitle = draw ? '¡Empate!' : `¡${winner?.username ?? game?.winner?.username ?? 'El ganador'} ganó!`;

  useEffect(() => {
    if (finished && resultDialog.current && !resultDialog.current.open) resultDialog.current.showModal();
  }, [finished]);

  useEffect(() => {
    if (!myTurn || !connected) setHighlighted(null);
  }, [myTurn, connected]);

  const playColumn = async (column) => {
    if (!canPlay || busy.current || !boardReady || board[0][column] !== 0) return;
    busy.current = true;
    setPendingColumn(column);
    setHighlighted(column);
    setError('');
    try {
      await makeMove(gameId, column);
      // game:state carries the saved board to both players; never place a piece locally.
    } catch (err) {
      // A lost reply may still mean the move was saved. Read the board before allowing another click.
      await refresh();
      setError(err.message);
    } finally {
      busy.current = false;
      setPendingColumn(null);
      setHighlighted(null);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.game}>
        <header className={styles.header}>
          <GameLogo compact />
          <span className={styles.gameId}>Partida <strong>#{gameId}</strong></span>
        </header>
        <section className={styles.turnPanel} aria-live="polite" aria-atomic="true">
          <p className={styles.eyebrow}>CUATRO FICHAS. UNA LÍNEA.</p>
          <h1>{finished ? 'Partida terminada' : <>Turno: <span>{currentPlayer?.username ?? '…'}</span></>}</h1>
          <p>{finished ? (draw ? 'El tablero está lleno. ¡Bien jugado!' : resultTitle)
            : !connected ? (connection === 'syncing' ? 'Recuperando el tablero…' : 'Reconectando con la partida…')
            : pendingColumn !== null ? 'Guardando tu jugada…'
            : myTurn ? 'Es tu turno. Pulsa un círculo vacío para elegir la columna.' : 'Espera la jugada de tu rival.'}</p>
        </section>

        <div className={styles.players} aria-label="Jugadores y fichas">
          {players.map((player) => <div key={player.userId} className={styles.player}
            data-active={String(player.userId) === String(game.currentPlayerId)}>
            <span className={styles.pieceKey} data-piece={player.piece} aria-hidden="true" />
            <div><strong>{player.username}{String(player.userId) === String(userId) ? ' (Tú)' : ''}</strong>
              <small>{player.piece === 'R' ? 'Fichas rojas' : 'Fichas amarillas'}</small></div>
          </div>)}
        </div>

        {error && <div className={styles.error} role="alert">
          <p>{error}</p>
          {!connected && game?.state !== 'deleted' && <button type="button" onClick={refresh}>Reintentar conexión</button>}
          <button type="button" onClick={onBack}>Volver al menú</button>
        </div>}

        {boardReady && <div className={styles.board} aria-label="Tablero de cuatro en línea, 6 filas y 7 columnas"
          aria-busy={pendingColumn !== null} onPointerLeave={() => setHighlighted(null)}>
          {Array.from({ length: 7 }, (_, column) => {
            const available = canPlay && board[0][column] === 0;
            const glowing = pendingColumn === column || (available && highlighted === column);
            return <div key={column} className={styles.column} data-glowing={glowing}
              onPointerEnter={() => setHighlighted(available ? column : null)}>
              <span className={styles.columnNumber} aria-hidden="true">{column + 1}</span>
              {board.map((row, rowIndex) => row[column] === 0
                ? <button type="button" key={rowIndex} className={styles.slot} disabled={!available}
                    aria-label={`Jugar en columna ${column + 1}, círculo vacío de fila ${rowIndex + 1}`}
                    onFocus={() => setHighlighted(column)} onBlur={() => setHighlighted(null)}
                    onClick={() => playColumn(column)} />
                : <span key={rowIndex} className={styles.slot} data-piece={row[column] === 1 ? 'R' : 'Y'}
                    role="img" aria-label={`Fila ${rowIndex + 1}, columna ${column + 1}: ficha ${row[column] === 1 ? 'roja' : 'amarilla'}`} />)}
            </div>;
          })}
        </div>}
        <p className={styles.footer}>Las fichas caen al espacio libre más bajo de la columna.</p>
      </div>

      {finished && <dialog ref={resultDialog} className={styles.result} aria-labelledby="game-result-title"
        aria-describedby="game-result-detail" onCancel={(event) => event.preventDefault()}>
        <span className={styles.resultMark} data-piece={draw ? '' : winner?.piece} aria-hidden="true">{draw ? '=' : '★'}</span>
        <p className={styles.eyebrow}>FIN DE LA PARTIDA</p>
        <h2 id="game-result-title">{resultTitle}</h2>
        <p id="game-result-detail">{draw ? 'Nadie consiguió cuatro en línea.'
          : game.finishReason === 'abandoned' ? 'El rival abandonó la partida.' : 'Cuatro fichas en línea. ¡Bien jugado!'}</p>
        <button type="button" onClick={onBack} autoFocus>Volver a crear o unirse a una partida</button>
      </dialog>}
    </main>
  );
}

export default GameBoard;
