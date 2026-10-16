import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToGame } from '../api/gameConnection.js';

export function useGameConnection(gameId, initialGameState) {
  const [game, setGame] = useState(initialGameState);
  const [connection, setConnection] = useState('syncing');
  const [error, setError] = useState('');
  const subscription = useRef(null);

  useEffect(() => {
    const current = subscribeToGame({ gameId, onState: setGame, onConnection: setConnection, onError: setError });
    subscription.current = current;
    return () => { current.close(); subscription.current = null; };
  }, [gameId]);

  const refresh = useCallback(() => subscription.current?.refresh(), []);
  return { game, setGame, connected: connection === 'ready', connection, error, setError, refresh };
}
