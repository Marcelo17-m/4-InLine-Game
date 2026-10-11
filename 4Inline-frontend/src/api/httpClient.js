const API_BASE = '/api';

// Cliente fetch compartido: arma la URL, manda JSON, adjunta el token si
// hay uno, y estandariza los errores (tu backend siempre responde
// { error: "mensaje" } vía errorHandler/handleResult).
export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // respuestas sin body
  }

  if (!response.ok) {
    throw new Error(data?.error || `Error ${response.status}`);
  }

  return data;
}