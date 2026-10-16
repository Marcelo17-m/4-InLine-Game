import { EventEmitter } from 'node:events';
import { subscribeToGame } from '../api/gameConnection.js';
import { initSocket } from '../api/socket.js';
import { getGameForPlayer } from '../api/gameApi.js';

jest.mock('../api/socket.js', () => ({ initSocket: jest.fn() }));
jest.mock('../api/gameApi.js', () => ({ getGameForPlayer: jest.fn() }));

let socket, callbacks, subscription;
const state = (changes = {}) => ({ gameId: 42, state: 'in_progress', currentPlayerId: 1, ...changes });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => {
  jest.resetAllMocks();
  socket = new EventEmitter();
  socket.connected = true;
  socket.connect = jest.fn();
  initSocket.mockReturnValue(socket);
  getGameForPlayer.mockResolvedValue(state());
  callbacks = { gameId: 42, onState: jest.fn(), onConnection: jest.fn(), onError: jest.fn() };
});
afterEach(() => subscription?.close());

test('loads membership and state before enabling play', async () => {
  subscription = subscribeToGame(callbacks);
  expect(callbacks.onConnection).toHaveBeenLastCalledWith('syncing');
  await flush();
  expect(getGameForPlayer).toHaveBeenCalledWith(42);
  expect(callbacks.onState).toHaveBeenLastCalledWith(state());
  expect(callbacks.onConnection).toHaveBeenLastCalledWith('ready');
});

test('rejoins after a temporary disconnect and recovers moves made while offline', async () => {
  subscription = subscribeToGame(callbacks);
  await flush();
  socket.connected = false;
  socket.emit('disconnect');
  expect(callbacks.onConnection).toHaveBeenLastCalledWith('offline');
  const restored = state({ currentPlayerId: 2, board: [[1]] });
  getGameForPlayer.mockResolvedValueOnce(restored);
  socket.connected = true;
  socket.emit('connect');
  expect(callbacks.onConnection).toHaveBeenLastCalledWith('syncing');
  await flush();
  expect(callbacks.onState).toHaveBeenLastCalledWith(restored);
  expect(callbacks.onConnection).toHaveBeenLastCalledWith('ready');
  expect(getGameForPlayer).toHaveBeenCalledTimes(2);
});

test('recovers the winner when the game finished during disconnection', async () => {
  subscription = subscribeToGame(callbacks);
  await flush();
  socket.emit('disconnect');
  const finished = state({ state: 'finished', currentPlayerId: null, winnerId: 2 });
  getGameForPlayer.mockResolvedValueOnce(finished);
  socket.emit('connect');
  await flush();
  expect(callbacks.onState).toHaveBeenLastCalledWith(finished);
});

test('keeps a newer live state when an earlier refresh response arrives', async () => {
  let resolve;
  getGameForPlayer.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  subscription = subscribeToGame(callbacks);
  const latest = state({ state: 'finished', winnerId: 1 });
  socket.emit('game:ended', latest);
  resolve(state());
  await flush();
  expect(callbacks.onState).toHaveBeenCalledTimes(1);
  expect(callbacks.onState).toHaveBeenLastCalledWith(latest);
});

test('does not enable play from a response arriving after disconnection', async () => {
  let resolve;
  getGameForPlayer.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  subscription = subscribeToGame(callbacks);
  socket.emit('disconnect');
  resolve(state());
  await flush();
  expect(callbacks.onConnection).toHaveBeenLastCalledWith('offline');
  expect(callbacks.onState).not.toHaveBeenCalled();
});

test('ignores other games and removes listeners on screen exit', async () => {
  subscription = subscribeToGame(callbacks);
  await flush();
  callbacks.onState.mockClear();
  socket.emit('game:state', state({ gameId: 99 }));
  expect(callbacks.onState).not.toHaveBeenCalled();
  subscription.close();
  expect(socket.eventNames()).toEqual([]);
});

test('invalid authentication keeps play disabled and exposes the server error', async () => {
  getGameForPlayer.mockRejectedValueOnce(new Error('Token expired'));
  subscription = subscribeToGame(callbacks);
  await flush();
  expect(callbacks.onConnection).toHaveBeenLastCalledWith('offline');
  expect(callbacks.onError).toHaveBeenLastCalledWith('Token expired');
});
