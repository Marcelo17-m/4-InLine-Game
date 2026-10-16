import { useEffect, useRef, useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import GameLogo from '../GameLogo/GameLogo.jsx';
import styles from './GameLobby.module.css';
import { initSocket } from '../../api/socket.js';
import { getCurrentUser } from '../../api/session.js';
import { getGameForPlayer, invitePlayer, startGame } from '../../api/gameApi.js';

function GameLobby({ gameId, initialGameState = null, created = false, onBack }) {
  const [game, setGame] = useState(initialGameState);
  const [opponentId, setOpponentId] = useState('');
  const [pending, setPending] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(created ? 'Partida creada correctamente.' : 'Te uniste a la partida correctamente.');
  const busy = useRef(false);
  const userId = getCurrentUser()?.sub;
  const players = game?.players ?? [];
  const isCreator = String(game?.creatorId) === String(userId);
  const joined = players.filter((player) => player.invitationStatus === 'accepted');
  const waiting = game?.state === 'pending';
  const canStart = waiting && isCreator && joined.length === 2 && connected;
  const canInvite = waiting && isCreator && players.length === 1 && connected;

  useEffect(() => {
    const socket = initSocket();
    let active = true;
    const receiveState = (state) => {
      if (!active || String(state.gameId) !== String(gameId)) return;
      setGame(state);
    };
    const refresh = async () => {
      setConnected(false);
      try {
        const state = await getGameForPlayer(gameId);
        if (!active) return;
        receiveState(state);
        setConnected(true);
        setError('');
      } catch (err) {
        if (active) setError(err.message);
      }
    };
    const disconnected = () => {
      setConnected(false);
      setError('Se perdió la conexión. Reconectando…');
    };
    const connectionError = (err) => { setConnected(false); setError(err.message); };
    const deleted = (data) => {
      if (String(data.game_id) !== String(gameId)) return;
      setGame((current) => current ? { ...current, state: 'deleted' } : null);
      setError('Esta partida fue eliminada. Vuelve al menú.');
    };
    socket.on('game:state', receiveState);
    socket.on('game:deleted', deleted);
    socket.on('connect', refresh);
    socket.on('disconnect', disconnected);
    socket.on('connect_error', connectionError);
    if (socket.connected) refresh();
    else socket.connect();
    return () => {
      active = false;
      socket.off('game:state', receiveState);
      socket.off('game:deleted', deleted);
      socket.off('connect', refresh);
      socket.off('disconnect', disconnected);
      socket.off('connect_error', connectionError);
    };
  }, [gameId]);

  const runAction = async (action, callback) => {
    if (busy.current) return;
    busy.current = true;
    setPending(action);
    setError('');
    setNotice('');
    try { await callback(); }
    catch (err) { setError(err.message || 'No se pudo completar la acción.'); }
    finally { busy.current = false; setPending(null); }
  };

  const handleInvite = (event) => {
    event.preventDefault();
    if (!canInvite || busy.current) return;
    const id = Number(opponentId.trim());
    if (!/^\d+$/.test(opponentId.trim()) || !Number.isSafeInteger(id) || id <= 0) {
      setError('Introduce un ID de usuario válido, mayor que cero.');
      return;
    }
    runAction('invite', async () => {
      await invitePlayer(gameId, id);
      setOpponentId('');
      setNotice('Invitación enviada. Esperando a que el jugador se una.');
    });
  };

  const handleStart = () => {
    if (!canStart) return;
    runAction('start', async () => {
      setGame(await startGame(gameId));
      setNotice('¡Partida iniciada!');
    });
  };

  return (
    <TableLayout>
      {notice && <div className={styles.toast} role="status" aria-atomic="true">
        <div><p>{notice}</p><strong>ID de la partida: {gameId}</strong></div>
        <button type="button" onClick={() => setNotice('')} aria-label="Cerrar notificación">×</button>
      </div>}
      <GameLogo compact />
      <header className={styles.header}>
        <h1>Sala de espera</h1>
        <p className={styles.gameId}>ID de la partida <strong>{gameId}</strong></p>
        <p className={styles.subtitle}>Invita a un rival y prepárense para jugar.</p>
      </header>

      <section className={styles.playersBox} aria-label="Jugadores de la partida">
        <h2>Jugadores <span>{joined.length}/2</span></h2>
        <ul className={styles.playerList}>
          {!game && <li className={styles.empty}>Cargando jugadores…</li>}
          {players.map((player) => <li key={player.userId} className={styles.player}>
            <span className={styles.avatar} aria-hidden="true">{player.username?.slice(0, 1).toUpperCase()}</span>
            <div className={styles.playerInfo}>
              <strong>{player.username}{String(player.userId) === String(userId) ? ' (Tú)' : ''}</strong>
              <small>ID: {player.userId} · {player.invitationStatus === 'invited' ? 'Invitación pendiente' : 'En la sala'}</small>
            </div>
            {String(player.userId) === String(game.creatorId) && <span className={styles.badge}>Creador</span>}
          </li>)}
          {game && players.length < 2 && <li className={styles.empty}>Esperando a un segundo jugador…</li>}
        </ul>
      </section>

      {isCreator && waiting && <form className={styles.inviteForm} onSubmit={handleInvite} noValidate>
        <label htmlFor="opponent-id">Invitar por ID de usuario</label>
        <div className={styles.inviteRow}>
          <input id="opponent-id" type="text" inputMode="numeric" autoComplete="off" placeholder="Ej. 2"
            value={opponentId} onChange={(event) => setOpponentId(event.target.value)} disabled={!canInvite || Boolean(pending)} />
          <button type="submit" disabled={!canInvite || Boolean(pending)}>{pending === 'invite' ? 'Enviando…' : 'Invitar'}</button>
        </div>
        <p>El rival acepta entrando con el ID de esta partida desde el menú.</p>
      </form>}

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        {waiting && (isCreator ? <>
          <button type="button" className={styles.start} disabled={!canStart || Boolean(pending)} onClick={handleStart}>
            {pending === 'start' ? 'Iniciando…' : 'Empezar partida'}
          </button>
          <p className={styles.hint}>{!connected ? 'Conectando con la sala…' : joined.length === 2 ? 'Los dos jugadores están listos.' : 'El botón se activará cuando el rival acepte y se una.'}</p>
        </> : <p className={styles.status} role="status">Esperando a que el creador inicie la partida.</p>)}
        {game?.state === 'in_progress' && <p className={styles.status} role="status">
          ¡Partida iniciada! Turno de {players.find((player) => player.userId === game.currentPlayerId)?.username}.
        </p>}
        {game?.state === 'finished' && <p className={styles.status} role="status">La partida ha terminado.</p>}
        <button type="button" className={styles.back} disabled={Boolean(pending)} onClick={onBack}>Volver al menú</button>
        {waiting && <p className={styles.hint}>Volver al menú no cancela tu partida.</p>}
      </div>
    </TableLayout>
  );
}

export default GameLobby;
