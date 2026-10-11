import { useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import styles from './Login.module.css';

function Login({ onNavigate, onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError('Completa usuario y contraseña.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit?.({ username: username.trim(), password });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TableLayout>
      <button type="button" className={styles.back} onClick={() => onNavigate?.('menu')}>
        ← Volver
      </button>

      <h2 className={styles.title}>Iniciar sesión</h2>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span>Usuario</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <button type="button" className={styles.link} onClick={() => onNavigate?.('register')}>
        ¿No tienes cuenta? Regístrate
      </button>
    </TableLayout>
  );
}

export default Login;