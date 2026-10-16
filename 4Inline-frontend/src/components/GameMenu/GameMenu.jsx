import { useEffect, useRef, useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import GameLogo from '../GameLogo/GameLogo.jsx';
import styles from './GameMenu.module.css';
import { initSocket } from '../../api/socket.js';

function GameMenu({ onCreateGame, onJoinGame }) {
  const [gameId, setGameId] = useState('');
  const [pending, setPending] = useState(null);
  const [notification, setNotification] = useState(null);
  const busy = useRef(false);

  useEffect(() => {
    const socket = initSocket();
    const onInvitation = (invitation) => {
      if (busy.current) return;
      setGameId(String(invitation.gameId));
      setNotification({
        type: 'success',
        message: `${invitation.creator.username} te invitó a jugar. Pulsa «Unirse a partida» para aceptar.`,
        detail: 'ID de la partida: ' + invitation.gameId,
      });
    };
    socket.on('game:invitation', onInvitation);
    return () => socket.off('game:invitation', onInvitation);
  }, []);

  const runAction = async (action, callback) => {
    if (busy.current) return;
    busy.current = true;
    setPending(action);
    setNotification(null);
    try {
      await callback();
    } catch (error) {
      setNotification({ type: 'error', message: error.message || 'No se pudo completar la acción. Inténtalo de nuevo.' });
    } finally {
      busy.current = false;
      setPending(null);
    }
  };

  const handleCreate = () => runAction('create', async () => {
    const result = await onCreateGame();
    setGameId(String(result.game_id));
    setNotification({
      type: 'success',
      message: 'Partida creada correctamente.',
      detail: 'ID de la partida: ' + result.game_id,
    });
  });

  const handleJoin = (event) => {
    event.preventDefault();
    if (busy.current) return;
    const id = Number(gameId.trim());
    if (!/^\d+$/.test(gameId.trim()) || !Number.isSafeInteger(id) || id <= 0) {
      setNotification({ type: 'error', message: 'Introduce un ID de partida válido, mayor que cero.' });
      return;
    }
    runAction('join', async () => {
      await onJoinGame(id);
      setNotification({
        type: 'success',
        message: 'Te uniste a la partida correctamente.',
        detail: 'ID de la partida: ' + id,
      });
    });
  };

  return (
    <TableLayout>
      {notification && (
        <div className={styles.toast} role={notification.type === 'error' ? 'alert' : 'status'}
          aria-atomic="true" data-type={notification.type}>
          <span className={styles.toastIcon} aria-hidden="true">{notification.type === 'error' ? '!' : '✓'}</span>
          <div className={styles.toastText}>
            <p>{notification.message}</p>
            {notification.detail && <strong>{notification.detail}</strong>}
          </div>
          <button type="button" className={styles.dismiss} aria-label="Cerrar notificación"
            onClick={() => setNotification(null)}>×</button>
        </div>
      )}
      <GameLogo compact />
      <h1 className={styles.title}>¿Listo para jugar?</h1>
      <p className={styles.description}>Crea una partida o entra con su ID.</p>

      <button type="button" className={styles.create} onClick={handleCreate} disabled={Boolean(pending)}>
        <span aria-hidden="true">+</span>
        {pending === 'create' ? 'Creando partida…' : 'Crear partida'}
      </button>

      <div className={styles.divider}><span>O ÚNETE A UNA PARTIDA</span></div>

      <form className={styles.joinForm} onSubmit={handleJoin} noValidate aria-busy={Boolean(pending)}>
        <label htmlFor="game-id" className={styles.label}>ID de la partida</label>
        <input id="game-id" name="gameId" type="text" inputMode="numeric" pattern="[0-9]+"
          className={styles.input} placeholder="Ej. 123" autoComplete="off"
          value={gameId} onChange={(event) => setGameId(event.target.value)} disabled={Boolean(pending)} />
        <button type="submit" className={styles.join} disabled={Boolean(pending)}>
          {pending === 'join' ? 'Entrando…' : 'Unirse a partida'}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </TableLayout>
  );
}

export default GameMenu;
