import { initSocket } from './socket.js';
import { getGameForPlayer } from './gameApi.js';

// Each mounted game screen owns its listeners; the authenticated socket is shared.
export function subscribeToGame({ gameId, onState, onConnection, onError }) {
  const socket = initSocket();
  let active = true;
  let generation = 0;
  let updates = 0;

  const receive = (state) => {
    if (!active || String(state.gameId) !== String(gameId)) return;
    updates++;
    onState(state);
  };
  const refresh = async () => {
    if (!active) return;
    const request = ++generation;
    const previousUpdates = updates;
    onConnection('syncing');
    try {
      const state = await getGameForPlayer(gameId);
      if (!active || request !== generation) return;
      // A live update received during the request is newer than its snapshot.
      if (updates === previousUpdates) receive(state);
      onConnection('ready');
      onError('');
    } catch (error) {
      if (!active || request !== generation) return;
      onConnection('offline');
      onError(error.message);
    }
  };
  const disconnected = () => {
    generation++;
    onConnection('offline');
    onError('Se perdió la conexión. Recuperaremos la partida al reconectar.');
  };
  const connectionError = (error) => {
    generation++;
    onConnection('offline');
    onError(error.message);
  };
  const deleted = (data) => {
    if (String(data.game_id) !== String(gameId)) return;
    generation++;
    onConnection('offline');
    onState({ gameId, state: 'deleted', players: [], board: [] });
    onError('Esta partida fue eliminada. Vuelve al menú.');
  };
  socket.on('game:state', receive);
  socket.on('game:ended', receive);
  socket.on('game:deleted', deleted);
  socket.on('connect', refresh);
  socket.on('disconnect', disconnected);
  socket.on('connect_error', connectionError);
  if (socket.connected) refresh();
  else { onConnection('offline'); socket.connect(); }

  return {
    refresh,
    close() {
      active = false;
      generation++;
      socket.off('game:state', receive);
      socket.off('game:ended', receive);
      socket.off('game:deleted', deleted);
      socket.off('connect', refresh);
      socket.off('disconnect', disconnected);
      socket.off('connect_error', connectionError);
    },
  };
}
