import { io } from 'socket.io-client';
import { getToken } from './session.js';

let socketInstance = null;

// The backend expects the token in socket.handshake.auth.token
// according to common Socket.IO auth practices, but we should make
// sure it's attached where socketAuthMiddleware looks for it.
export function initSocket() {
  if (socketInstance) return socketInstance;

  const token = getToken();
  
  socketInstance = io('/', {
    auth: {
      token: token
    }
  });

  return socketInstance;
}

export function getSocket() {
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
