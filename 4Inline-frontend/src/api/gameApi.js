import { apiFetch } from './httpClient.js';
import { getCurrentUser, getToken } from './session.js';
import { sendSocketEvent } from './socket.js';

// POST /api/games -> { message, game_id }
export function createGame() {
  return apiFetch('/games', {
    method: 'POST',
    body: { access_token: getToken() },
  });
}

export function getGameForPlayer(gameId) {
  return sendSocketEvent('game:join', { game_id: gameId });
}

export function invitePlayer(gameId, opponentId) {
  return sendSocketEvent('game:invite', { game_id: gameId, opponent_id: opponentId });
}

export function startGame(gameId) {
  return sendSocketEvent('game:start', { game_id: gameId });
}

// Room membership is checked by the backend before an invitation is accepted.
export async function joinGame(gameId) {
  const data = { game_id: gameId };
  const state = await getGameForPlayer(gameId);
  if (!['pending', 'in_progress'].includes(state.state)) {
    throw new Error('Esta partida ya terminó.');
  }

  const userId = getCurrentUser()?.sub;
  const participant = state.players.find((player) => String(player.userId) === String(userId));
  if (participant?.invitationStatus === 'invited') {
    await sendSocketEvent('game:invitation:respond', { ...data, accept: true });
    return getGameForPlayer(gameId);
  }
  if (participant?.invitationStatus !== 'accepted') {
    throw new Error('Necesitas una invitación para unirte a esta partida.');
  }
  return state;
}
