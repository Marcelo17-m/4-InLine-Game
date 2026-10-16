import { useState } from 'react';
import MainMenu from './components/MainMenu/MainMenu.jsx';
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import GameMenu from './components/GameMenu/GameMenu.jsx';
import GameLobby from './components/GameLobby/GameLobby.jsx';
import { login, register } from './api/authApi.js';
import { saveToken } from './api/session.js';
import { createGame, joinGame } from './api/gameApi.js';
import { disconnectSocket } from './api/socket.js';

function App() {
  const [screen, setScreen] = useState('menu');
  const [lobby, setLobby] = useState(null);

  const handleCreateGame = async () => {
    const result = await createGame();
    setLobby({ gameId: result.game_id, created: true });
    setScreen('lobby');
    return result;
  };

  const handleJoinGame = async (gameId) => {
    const state = await joinGame(gameId);
    setLobby({ gameId, initialGameState: state, created: false });
    setScreen('lobby');
    return state;
  };

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    disconnectSocket();
    saveToken(result.accessToken);
    setScreen('game');
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
    return <GameLobby key={lobby.gameId} {...lobby} onBack={() => setScreen('game')} />;
  }

  return <MainMenu onNavigate={setScreen} />;
}

export default App;
