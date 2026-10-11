import { useState } from 'react';
import MainMenu from './components/MainMenu/MainMenu.jsx';
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import GameMenu from './components/GameMenu/GameMenu.jsx';
import GameLobby from './components/GameLobby/GameLobby.jsx';
import GameBoard from './components/GameBoard/GameBoard.jsx';
import { login, register } from './api/authApi.js';
import { saveToken, clearToken } from './api/session.js';
import { createGame } from './api/gameApi.js';
import { disconnectSocket, getSocket } from './api/socket.js';

function App() {
  const [screen, setScreen] = useState('menu');
  const [activeGameId, setActiveGameId] = useState(null);
  const [initialGameState, setInitialGameState] = useState(null);

  const handleNavigate = (destination) => {
    if (destination === 'menu' || destination === 'login' || destination === 'register' || destination === 'gameMenu') {
      setScreen(destination);
      return;
    }
    console.log('Navegar a:', destination);
  };

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    saveToken(result.accessToken);
    setScreen('gameMenu');
  };

  const handleRegister = async (data) => {
    await register(data);
    setScreen('login');
  };

  const handleLogout = () => {
    disconnectSocket();
    clearToken();
    setScreen('menu');
  };

  const handleCreateGame = async () => {
    try {
      const result = await createGame({ name: 'Mi Partida UNO', rules: 'Standard UNO rules' });
      alert(`¡Partida creada exitosamente!\nID de la partida: ${result.game_id}\nCompártelo con tus amigos para que se unan.`);
      setActiveGameId(result.game_id);
      setScreen('lobby');
    } catch (err) {
      console.error('Error al crear partida:', err);
      alert(err.message || 'Error al crear partida');
    }
  };

  const handleJoinGame = (gameId) => {
    setActiveGameId(gameId);
    setScreen('lobby');
  };

  const handleLeaveGame = () => {
    const socket = getSocket();
    if (socket && activeGameId) {
      socket.emit('leave-game', { game_id: activeGameId });
    }

    setActiveGameId(null);
    setInitialGameState(null);
    setScreen('gameMenu');
  };

  if (screen === 'login') {
    return <Login onNavigate={handleNavigate} onSubmit={handleLogin} />;
  }

  if (screen === 'register') {
    return <Register onNavigate={handleNavigate} onSubmit={handleRegister} />;
  }

  if (screen === 'gameMenu') {
    return (
      <GameMenu
        onLogout={handleLogout}
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
      />
    );
  }

  if (screen === 'lobby') {
    return (
      <GameLobby
        gameId={activeGameId}
        onLeave={handleLeaveGame}
        onGameStarted={(data) => {
          setInitialGameState(data);
          setScreen('gameBoard');
        }}
      />
    );
  }

  if (screen === 'gameBoard') {
    return (
      <GameBoard
        gameId={activeGameId}
        initialGameState={initialGameState}
        onLeave={handleLeaveGame}
      />
    );
  }

  return <MainMenu onNavigate={handleNavigate} />;
}

export default App;
