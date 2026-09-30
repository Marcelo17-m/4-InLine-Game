import { useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import Profile from '../Profile/Profile.jsx';
import styles from './GameMenu.module.css';

function GameMenu({ onLogout, onCreateGame, onJoinGame }) {
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [gameId, setGameId] = useState('');
  const [error, setError] = useState('');

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (gameId.trim()) {
      setError('');
      try {
        await onJoinGame?.(gameId.trim());
      } catch (err) {
        setError(err.message || 'Error al unirse a la partida');
      }
    }
  };

  return (
    <TableLayout>
      <div className={styles.titleWrap}>
        <h2 className={styles.title}>Lobby</h2>
      </div>

      <div className={styles.menu}>
        <button
          type="button"
          className={`${styles.cardButton} ${styles.red}`}
          onClick={() => onCreateGame?.()}
        >
          Crear nueva partida
        </button>

        {!showJoinPrompt ? (
          <button
            type="button"
            className={`${styles.cardButton} ${styles.blue}`}
            onClick={() => setShowJoinPrompt(true)}
          >
            Unirse a una partida
          </button>
        ) : (
          <>
            <form className={styles.joinForm} onSubmit={handleJoinSubmit}>
              <input
                type="text"
                className={styles.joinInput}
                placeholder="ID de la partida..."
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                autoFocus
              />
              <button type="submit" className={styles.joinSubmit}>
                Entrar
              </button>
            </form>
            {error && <p className={styles.errorText}>{error}</p>}
          </>
        )}

        <button
          type="button"
          className={`${styles.cardButton} ${styles.yellow}`}
          onClick={() => setShowProfile(true)}
          aria-haspopup="dialog"
        >
          Profile
        </button>

        <button
          type="button"
          className={styles.exitLink}
          onClick={onLogout}
        >
          Cerrar sesión
        </button>
      </div>
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </TableLayout>
  );
}

export default GameMenu;
