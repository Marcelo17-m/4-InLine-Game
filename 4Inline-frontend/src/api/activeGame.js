import { getCurrentUser } from './session.js';

const storageKey = () => {
  const user = getCurrentUser();
  if (!user?.sub || !user.exp || user.exp * 1000 <= Date.now()) return null;
  return '4inline.activeGame.' + user.sub;
};

export function rememberGame(gameId) {
  try {
    const key = storageKey();
    if (key) sessionStorage.setItem(key, String(gameId));
  } catch { /* The live game still works when browser storage is unavailable. */ }
}

export function getRememberedGame() {
  try {
    const key = storageKey();
    const id = key ? Number(sessionStorage.getItem(key)) : null;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch { return null; }
}

export function forgetGame() {
  try {
    const key = storageKey();
    if (key) sessionStorage.removeItem(key);
  } catch { /* Storage is optional. */ }
}
