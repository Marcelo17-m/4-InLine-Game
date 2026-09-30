import { useEffect, useRef, useState } from 'react';
import { getProfile } from '../../api/authApi.js';
import styles from './Profile.module.css';

function Profile({ onClose }) {
  const dialogRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getProfile()
      .then((data) => {
        if (!data) throw new Error('No se pudo cargar el perfil.');
        if (active) setProfile(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'No se pudo cargar el perfil.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [attempt]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="profile-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <h2 id="profile-title" className={styles.title}>Profile</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} autoFocus>
          Cerrar
        </button>
      </header>

      {loading ? (
        <p role="status">Cargando perfil…</p>
      ) : error ? (
        <div>
          <p className={styles.error} role="alert">{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => setAttempt((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      ) : (
        <dl className={styles.details}>
          <div><dt>ID de usuario</dt><dd>{profile.id}</dd></div>
          <div><dt>Nombre de usuario</dt><dd>{profile.username}</dd></div>
          <div><dt>Correo electrónico</dt><dd>{profile.email}</dd></div>
        </dl>
      )}
    </dialog>
  );
}

export default Profile;
