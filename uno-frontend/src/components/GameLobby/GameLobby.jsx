import { useEffect, useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import styles from './GameLobby.module.css';
import { initSocket, getSocket } from '../../api/socket.js';
import { getCurrentUser } from '../../api/session.js';

function GameLobby({ gameId, onLeave, onGameStarted }) {
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  
  // Get current user to check if we are the host
  const currentUser = getCurrentUser();
  // `players` is an array of strings (usernames) from the backend
  const isHost = players.length > 0 && players[0] === currentUser?.username;
  
  useEffect(() => {
    const socket = initSocket();

    const handleJoin = (data) => {
      if (data.players) {
        setPlayers(data.players);
        setError('');
      }
    };

    const handleGameState = (data) => {
      if (data.players) {
        setPlayers(data.players);
      }
      if (data.hands && data.currentPlayer) {
        onGameStarted?.(data);
      }
    };

    const handleError = (err) => {
      if (err?.message) {
        setError(err.message);
      }
    };

    socket.on('join', handleJoin);
    socket.on('game-state', handleGameState);
    socket.on('error', handleError);
    socket.on('connect_error', handleError);

    socket.emit('join', { game_id: gameId });

    return () => {
      socket.off('join', handleJoin);
      socket.off('game-state', handleGameState);
      socket.off('error', handleError);
      socket.off('connect_error', handleError);
    };
  }, [gameId, onGameStarted]);

  const handleStartClick = () => {
    const socket = getSocket();
    if (socket && isHost && players.length >= 2) {
      socket.emit('start-game', { game_id: gameId });
    }
  };

  const handleLeaveClick = () => {
    onLeave?.();
  };

  const canStart = isHost && players.length >= 2;

  return (
    <TableLayout>
      <div className={styles.lobbyContainer}>
        <div className={styles.header}>
          <h2 className={styles.title}>Sala de Espera</h2>
          <p className={styles.gameId}>ID: <strong>{gameId}</strong></p>
        </div>

        <div className={styles.playersBox}>
          <h3 className={styles.subtitle}>Jugadores ({players.length}/4)</h3>
          <ul className={styles.playerList}>
            {players.length === 0 && <li className={styles.loading}>Cargando jugadores...</li>}
            {players.map((username, idx) => (
              <li key={idx} className={styles.playerItem}>
                <span className={styles.playerName}>{username || 'Desconocido'}</span>
                {idx === 0 && <span className={styles.hostBadge}>Host</span>}
                {username === currentUser?.username && <span className={styles.youBadge}>(Tú)</span>}
              </li>
            ))}
          </ul>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          {isHost ? (
            <button 
              className={`${styles.btnStart} ${canStart ? styles.btnStartActive : styles.btnStartDisabled}`}
              disabled={!canStart}
              onClick={handleStartClick}
            >
              {canStart ? '¡Empezar Partida!' : 'Esperando jugadores...'}
            </button>
          ) : (
            <div className={styles.waitingHost}>
              Esperando...
            </div>
          )}
          
          <button className={styles.btnLeave} onClick={handleLeaveClick}>
            Salir de la sala
          </button>
        </div>
      </div>
    </TableLayout>
  );
}

export default GameLobby;
