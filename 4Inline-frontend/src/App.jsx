import { useCallback, useState } from 'react';
import MainMenu from './components/MainMenu/MainMenu.jsx';
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import GameMenu from './components/GameMenu/GameMenu.jsx';
import GameLobby from './components/GameLobby/GameLobby.jsx';
import GameBoard from './components/GameBoard/GameBoard.jsx';
import { login, register } from './api/authApi.js';
import { saveToken } from './api/session.js';
import { createGame, joinGame } from './api/gameApi.js';
import { disconnectSocket } from './api/socket.js';
import { forgetGame, getRememberedGame, rememberGame } from './api/activeGame.js';

function App() {
  const [lobby, setLobby] = useState(() => {
    const gameId = getRememberedGame();
    return gameId ? { gameId } : null;
  });
  const [screen, setScreen] = useState(lobby ? 'lobby' : 'menu');

  const handleGameStarted = useCallback((state) => {
    rememberGame(state.gameId);
    setLobby({ gameId: state.gameId, initialGameState: state });
    setScreen('board');
  }, []);

  const handleBackToMenu = () => {
    forgetGame();
    setLobby(null);
    setScreen('game');
  };

  const handleCreateGame = async () => {
    const result = await createGame();
    rememberGame(result.game_id);
    setLobby({ gameId: result.game_id, created: true });
    setScreen('lobby');
    return result;
  };

  const handleJoinGame = async (gameId) => {
    const state = await joinGame(gameId);
    rememberGame(gameId);
    setLobby({ gameId, initialGameState: state, created: false });
    setScreen(state.state === 'in_progress' ? 'board' : 'lobby');
    return state;
  };

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    disconnectSocket();
    saveToken(result.accessToken);
    const gameId = getRememberedGame();
    setLobby(gameId ? { gameId } : null);
    setScreen(gameId ? 'lobby' : 'game');
  };

  const handleRegister = async (data) => {
    await register(data);
    setScreen('login');
  };

  if (screen === 'login') {
    return <Login onNavigate={setScreen} onSubmit={handleLogin} />;
  }

  if (screen === 'register') {
    return <Register onNavigate={setScreen} onSubmit={handleRegister} />;
  }

  if (screen === 'game') {
    return <GameMenu onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} />;
  }

  if (screen === 'lobby') {
    return <GameLobby key={lobby.gameId} {...lobby} onBack={handleBackToMenu} onGameStarted={handleGameStarted} />;
  }

  if (screen === 'board') {
    return <GameBoard key={lobby.gameId} {...lobby} onBack={handleBackToMenu} />;
  }

  return <MainMenu onNavigate={setScreen} />;
}

export default App;
