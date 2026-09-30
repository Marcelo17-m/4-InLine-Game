import { apiFetch } from './httpClient.js';
import { getToken } from './session.js';

// POST /api/auth/profile -> { id, username, email }
export function getProfile() {
  return apiFetch('/auth/profile', {
    method: 'POST',
    token: getToken(),
  });
}

// POST /api/auth/register -> { message } (no hace auto-login)
export function register({ username, email, password }) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: { username, email, password },
  });
}

// POST /api/auth/login -> { accessToken }
export function login({ username, password }) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}
