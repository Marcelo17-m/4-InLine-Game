import { apiFetch } from './httpClient.js';

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
