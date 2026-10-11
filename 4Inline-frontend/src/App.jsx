import { useState } from 'react';
import MainMenu from './components/MainMenu/MainMenu.jsx';
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import { login, register } from './api/authApi.js';
import { saveToken } from './api/session.js';

function App() {
  const [screen, setScreen] = useState('menu');

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
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
    return <main className="emptyScreen" aria-label="Área de juego" />;
  }

  return <MainMenu onNavigate={setScreen} />;
}

export default App;