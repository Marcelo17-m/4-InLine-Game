import { apiFetch } from './httpClient.js';
import { getToken } from './session.js';

// POST /api/games -> { message, game_id }
export function createGame({ name, rules }) {
  const token = getToken();
  return apiFetch('/games', {
    method: 'POST',
    body: { name, rules },
    token,
  });
}
