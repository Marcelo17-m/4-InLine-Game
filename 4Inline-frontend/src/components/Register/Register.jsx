import { useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import styles from './Register.module.css';

function Register({ onNavigate, onSubmit }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim() || !email.trim() || !password) {
      setError('Completa todos los campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit?.({ username: username.trim(), email: email.trim(), password });
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

      <h2 className={styles.title}>Registrarse</h2>

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
          <span>Correo</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className={styles.field}>
          <span>Confirmar contraseña</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <button type="button" className={styles.link} onClick={() => onNavigate?.('login')}>
        ¿Ya tienes cuenta? Inicia sesión
      </button>
    </TableLayout>
  );
}

export default Register;