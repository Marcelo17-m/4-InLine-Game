const TOKEN_KEY = 'uno.accessToken';

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Decodes the JWT payload to get { id, username }
export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    
    // Replace characters that are URL safe to base64 standard
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse token payload', err);
    return null;
  }
}