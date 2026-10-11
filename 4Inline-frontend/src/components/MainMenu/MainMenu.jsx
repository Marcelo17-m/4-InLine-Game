import TableLayout from '../TableLayout/TableLayout.jsx';
import GameLogo from '../GameLogo/GameLogo.jsx';
import styles from './MainMenu.module.css';

function MainMenu({ onNavigate }) {
  return (
    <TableLayout>
      <p className={styles.eyebrow}>UN CLÁSICO. UNA NUEVA PARTIDA.</p>
      <h1 className={styles.brand}><GameLogo /></h1>
      <p className={styles.description}>Cuatro fichas. Una línea. Tu próxima victoria.</p>
      <nav className={styles.menu} aria-label="Menú principal">
        <button type="button" className={styles.primary} onClick={() => onNavigate('login')}>
          Iniciar sesión <span aria-hidden="true">→</span>
        </button>
        <button type="button" className={styles.secondary} onClick={() => onNavigate('register')}>
          Crear cuenta
        </button>
      </nav>
      <div className={styles.footer}>
        <span aria-hidden="true" className={styles.discs}>● ● ● ●</span>
        <span>Conecta cuatro. Comparte la diversión.</span>
      </div>
    </TableLayout>
  );
}

export default MainMenu;