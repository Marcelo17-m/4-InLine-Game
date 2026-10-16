import { EventEmitter } from 'node:events';
import { io } from 'socket.io-client';
import { makeMove } from '../api/gameApi.js';
import { disconnectSocket } from '../api/socket.js';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('../api/session.js', () => ({ getToken: () => 'test-token' }));
jest.mock('../api/httpClient.js', () => ({ apiFetch: jest.fn() }));

let socket;
beforeEach(() => {
  socket = new EventEmitter();
  socket.connected = true;
  socket.volatile = { emit: jest.fn() };
  socket.connect = jest.fn();
  socket.disconnect = jest.fn();
  io.mockReturnValue(socket);
});
afterEach(() => disconnectSocket());

test('sends a move without buffering and returns the saved board', async () => {
  const pending = makeMove(42, 3);
  expect(socket.volatile.emit).toHaveBeenCalledWith('game:move', { game_id: 42, column: 3 });
  const saved = { gameId: 42, board: [[1]], currentPlayerId: 2 };
  socket.emit('game:move', saved);
  await expect(pending).resolves.toEqual(saved);
  expect(socket.eventNames()).toEqual([]);
});

test('an offline click is rejected and is never sent on reconnect', async () => {
  socket.connected = false;
  await expect(makeMove(42, 3)).rejects.toThrow('conexión');
  socket.connected = true;
  socket.emit('connect');
  expect(socket.volatile.emit).not.toHaveBeenCalled();
  expect(socket.connect).not.toHaveBeenCalled();
});

test('a disconnect during a move rejects the request without resending it', async () => {
  const pending = makeMove(42, 3);
  socket.emit('disconnect');
  await expect(pending).rejects.toThrow('conexión');
  socket.emit('connect');
  expect(socket.volatile.emit).toHaveBeenCalledTimes(1);
});
