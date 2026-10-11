import { useEffect, useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import Card from '../Card/Card.jsx';
import styles from './GameBoard.module.css';
import { getSocket } from '../../api/socket.js';
import { getCurrentUser } from '../../api/session.js';
import { parseBackendCardString } from '../../utils/cardParser.js';

function GameBoard({ gameId, initialGameState, onLeave }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  const currentUser = getCurrentUser();
  const myUsername = currentUser?.username;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleGameState = (data) => {
      setGameState(data);
      setIsDrawing(false);
      setError(''); // Clear errors on state update
    };

    const handleError = (err) => {
      if (err?.event === 'draw-card') {
        setIsDrawing(false);
      }
      if (err?.message) {
        setError(err.message);
        setTimeout(() => setError(''), 4000);
      }
    };

    const handleGameEnded = (data) => {
      setGameResult(data);
      setIsDrawing(false);
    };

    socket.on('game-state', handleGameState);
    socket.on('game-ended', handleGameEnded);
    socket.on('error', handleError);

    return () => {
      socket.off('game-state', handleGameState);
      socket.off('game-ended', handleGameEnded);
      socket.off('error', handleError);
    };
  }, []);

  const handlePlayCard = (cardString) => {
    const lower = cardString.toLowerCase();
    if (lower.includes('wild')) {
      setPendingWildCard(cardString);
      setShowColorPicker(true);
      return;
    }

    emitPlay(cardString, null);
  };

  const handleColorPick = (color) => {
    setShowColorPicker(false);
    emitPlay(pendingWildCard, color);
    setPendingWildCard(null);
  };

  const emitPlay = (cardString, chosenColor) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('play-card', {
        game_id: gameId,
        card: cardString,
        chosen_color: chosenColor,
      });
    }
  };

  const handleDrawCard = () => {
    if (!isMyTurn || isDrawing) return;

    const socket = getSocket();
    if (!socket?.connected) {
      setError('No hay conexión con la partida');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setError('');
    setIsDrawing(true);
    socket.emit('draw-card', { game_id: gameId });
  };

  const handleSayUno = () => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('say-uno', { game_id: gameId });
    }
  };

  const handleCatchUno = (targetUserId) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('catch-uno', {
        game_id: gameId,
        target_user_id: targetUserId,
      });
    }
  };

  if (!gameState || !gameState.hands) {
    return <TableLayout><div className={styles.loading}>Cargando tablero...</div></TableLayout>;
  }

  const { currentPlayer, topCard, hands, turnHistory } = gameState;
  const isMyTurn = currentPlayer === myUsername;
  const myHand = hands[myUsername] || [];
  
  // Opponents
  const opponents = Object.keys(hands).filter(name => name !== myUsername);
  const finalScores = gameResult
    ? Object.entries(gameResult.scores).sort(([, firstScore], [, secondScore]) => secondScore - firstScore)
    : [];

  return (
    <div className={styles.boardWrapper}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.turnIndicator}>
          {isMyTurn ? <span className={styles.myTurn}>¡Es tu turno!</span> : `Turno de: ${currentPlayer}`}
        </div>
        <button className={styles.leaveBtn} onClick={onLeave}>Abandonar Partida</button>
      </div>

      {/* Opponents Area */}
      <div className={styles.opponentsArea}>
        {opponents.map(name => {
          const opponent = hands[name];
          const isAtRisk = opponent.cardCount === 1;
          
          return (
            <div key={name} className={`${styles.opponent} ${currentPlayer === name ? styles.activeOpponent : ''}`}>
              <div className={styles.opponentName}>{name}</div>
              <div className={styles.opponentCards}>{opponent.cardCount} cartas</div>
              {isAtRisk && opponent.userId && (
                <button 
                  className={styles.catchUnoBtn} 
                  onClick={() => handleCatchUno(opponent.userId)}
                  title="¡Atrapar por no decir UNO!"
                >
                  ¡Atrapar UNO!
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Center Table (Draw / Discard Pile) */}
      <div className={styles.centerTable}>
        <button
          type="button"
          className={`${styles.pile} ${styles.drawPileButton} ${!isMyTurn || isDrawing ? styles.disabledPile : ''}`}
          onClick={handleDrawCard}
          title={isDrawing ? 'Robando carta...' : isMyTurn ? 'Robar carta' : 'Espera tu turno'}
          disabled={!isMyTurn || isDrawing}
        >
          <Card id="back" className={styles.drawPileCard} />
        </button>
        
        <div className={styles.pile}>
          {topCard ? (
            <Card id={parseBackendCardString(topCard)} className={styles.discardPileCard} />
          ) : (
            <div className={styles.emptyPile}>Vacío</div>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {error && <div className={styles.errorToast}>{error}</div>}

      {/* Final Result */}
      {gameResult && (
        <div className={styles.gameOverOverlay} role="dialog" aria-modal="true" aria-labelledby="game-over-title">
          <div className={styles.gameOverModal}>
            <h2 id="game-over-title" className={styles.gameOverTitle}>{gameResult.message}</h2>
            <h3 className={styles.scoreTitle}>Puntuación final</h3>
            <ol className={styles.scoreList}>
              {finalScores.map(([username, score], index) => (
                <li key={username} className={styles.scoreRow}>
                  <span>{index + 1}. {username}</span>
                  <strong>{score} puntos</strong>
                </li>
              ))}
            </ol>
            <button type="button" className={styles.backToMenuBtn} onClick={onLeave}>
              Volver al menú
            </button>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className={styles.colorPickerOverlay}>
          <div className={styles.colorPickerModal}>
            <h3>Elige un color</h3>
            <div className={styles.colorButtons}>
              <button className={`${styles.colorBtn} ${styles.red}`} onClick={() => handleColorPick('red')}></button>
              <button className={`${styles.colorBtn} ${styles.blue}`} onClick={() => handleColorPick('blue')}></button>
              <button className={`${styles.colorBtn} ${styles.green}`} onClick={() => handleColorPick('green')}></button>
              <button className={`${styles.colorBtn} ${styles.yellow}`} onClick={() => handleColorPick('yellow')}></button>
            </div>
            <button className={styles.cancelBtn} onClick={() => setShowColorPicker(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Player Actions & Hand */}
      <div className={styles.playerArea}>
        <div className={styles.playerActions}>
          <button className={styles.unoBtn} onClick={handleSayUno}>¡UNO!</button>
        </div>
        
        <div className={styles.handContainer}>
          {myHand.map((cardString, idx) => (
            <div 
              key={`${cardString}-${idx}`} 
              className={styles.cardWrapper}
              onClick={() => isMyTurn && handlePlayCard(cardString)}
            >
              <Card 
                id={parseBackendCardString(cardString)} 
                className={isMyTurn ? styles.playableCard : styles.disabledCard} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GameBoard;
