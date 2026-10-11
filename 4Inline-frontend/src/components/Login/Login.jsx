import { useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import GameLogo from '../GameLogo/GameLogo.jsx';
import styles from './Login.module.css';

function Login({ onNavigate, onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      setError('Completa usuario y contraseña.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ username: username.trim(), password });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TableLayout>
      <button type="button" className={styles.back} onClick={() => onNavigate('menu')}>
        ← Volver
      </button>
      <GameLogo compact />
      <h1 className={styles.title}>Iniciar sesión</h1>
      <p className={styles.subtitle}>Qué bueno verte de nuevo.</p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <label className={styles.field}>
          <span>Usuario</span>
          <input name="username" type="text" value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username" placeholder="Tu nombre de usuario" required />
        </label>
        <label className={styles.field}>
          <span>Contraseña</span>
          <input name="password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password" placeholder="Tu contraseña" required />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <button type="button" className={styles.link} onClick={() => onNavigate('register')}>
        ¿No tienes cuenta? Regístrate
      </button>
    </TableLayout>
  );
}

export default Login;