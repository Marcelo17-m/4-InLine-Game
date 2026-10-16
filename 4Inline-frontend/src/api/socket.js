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

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// The server replies using the command's event name, or emits { event, message } on error.
export function sendSocketEvent(event, payload = {}) {
  const socket = initSocket();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, onSuccess);
      socket.off('error', onError);
      socket.off('connect_error', onConnectionError);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', send);
    };
    const fail = (message) => { cleanup(); reject(new Error(message)); };
    const onSuccess = (response) => { cleanup(); resolve(response); };
    const onError = (error) => {
      if (error.event === event) fail(error.message);
    };
    const onConnectionError = (error) => fail(error.message || 'No se pudo conectar con el servidor.');
    const onDisconnect = () => fail('Se perdió la conexión. Inténtalo de nuevo.');
    const send = () => socket.emit(event, payload);
    const timer = setTimeout(() => fail('El servidor no respondió. Inténtalo de nuevo.'), 10000);

    socket.on(event, onSuccess);
    socket.on('error', onError);
    socket.on('connect_error', onConnectionError);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) send();
    else {
      socket.once('connect', send);
      socket.connect();
    }
  });
}
