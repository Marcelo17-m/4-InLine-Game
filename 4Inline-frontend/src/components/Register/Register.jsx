import { useState } from 'react';
import TableLayout from '../TableLayout/TableLayout.jsx';
import GameLogo from '../GameLogo/GameLogo.jsx';
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
    if (submitting) return;
    if (!username.trim() || !password || !confirmPassword) {
      setError('Completa el usuario y los campos de contraseña.');
      return;
    }
    if (email.trim() && !event.currentTarget.elements.email.validity.valid) {
      setError('Escribe un correo válido.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        username: username.trim(), password,
        ...(email.trim() ? { email: email.trim() } : {}),
      });
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta. Inténtalo de nuevo.');
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
      <h1 className={styles.title}>Crear cuenta</h1>
      <p className={styles.subtitle}>Tu próxima partida empieza aquí.</p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <label className={styles.field}>
          <span>Usuario</span>
          <input name="username" type="text" value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username" placeholder="Elige tu nombre de usuario" required />
        </label>
        <label className={styles.field}>
          <span>Correo <span>(opcional)</span></span>
          <input name="email" type="email" value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email" placeholder="tu@correo.com" />
        </label>
        <label className={styles.field}>
          <span>Contraseña</span>
          <input name="password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password" placeholder="Crea tu contraseña" required />
        </label>
        <label className={styles.field}>
          <span>Confirmar contraseña</span>
          <input name="confirmPassword" type="password" value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password" placeholder="Repite tu contraseña" required />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <button type="button" className={styles.link} onClick={() => onNavigate('login')}>
        ¿Ya tienes cuenta? Inicia sesión
      </button>
    </TableLayout>
  );
}

export default Register;