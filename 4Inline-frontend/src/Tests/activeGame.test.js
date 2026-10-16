import { getCurrentUser } from '../api/session.js';
import { rememberGame, getRememberedGame, forgetGame } from '../api/activeGame.js';

jest.mock('../api/session.js', () => ({ getCurrentUser: jest.fn() }));
const user = (sub) => ({ sub, exp: Math.floor(Date.now() / 1000) + 3600 });

beforeEach(() => {
  const values = new Map();
  global.sessionStorage = {
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
  };
  getCurrentUser.mockReturnValue(user(1));
});
afterAll(() => { delete global.sessionStorage; });

test('remembers a game across reads and clears it on return to the menu', () => {
  rememberGame(42);
  expect(getRememberedGame()).toBe(42);
  forgetGame();
  expect(getRememberedGame()).toBeNull();
});

test('never restores another user’s game', () => {
  rememberGame(42);
  getCurrentUser.mockReturnValue(user(2));
  expect(getRememberedGame()).toBeNull();
  getCurrentUser.mockReturnValue(user(1));
  expect(getRememberedGame()).toBe(42);
});

test('does not auto-resume with an expired or missing JWT', () => {
  rememberGame(42);
  getCurrentUser.mockReturnValue({ sub: 1, exp: 1 });
  expect(getRememberedGame()).toBeNull();
  getCurrentUser.mockReturnValue(null);
  expect(getRememberedGame()).toBeNull();
});

test('unavailable browser storage does not break the app', () => {
  global.sessionStorage = undefined;
  expect(() => rememberGame(42)).not.toThrow();
  expect(getRememberedGame()).toBeNull();
  expect(() => forgetGame()).not.toThrow();
});
