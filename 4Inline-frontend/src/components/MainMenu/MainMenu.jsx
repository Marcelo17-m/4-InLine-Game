import TableLayout from '../TableLayout/TableLayout.jsx';
import styles from './MainMenu.module.css';

// Cada opción de "entrar al juego" usa uno de los colores oficiales de UNO.
// El verde queda reservado para el fieltro de fondo (para que no se pierda
// contra él), así que el menú no fuerza un 4to color solo por simetría.
const MENU_ITEMS = [
  { key: 'login', label: 'Iniciar sesión', variant: styles.red },
  { key: 'register', label: 'Registrarse', variant: styles.blue },
];

function MainMenu({ onNavigate }) {
  return (
    <TableLayout>
      <div className={styles.titleWrap}>
        <span className={styles.fanCard} data-card="1" />
        <span className={styles.fanCard} data-card="2" />
        <span className={styles.fanCard} data-card="3" />
        <h1 className={styles.title}>UNO</h1>
      </div>

      <nav className={styles.menu} aria-label="Menú principal">
        {MENU_ITEMS.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.cardButton} ${item.variant}`}
            style={{ '--i': index }}
            onClick={() => onNavigate?.(item.key)}
          >
            {item.label}
          </button>
        ))}

        <button
          type="button"
          className={styles.exitLink}
          style={{ '--i': MENU_ITEMS.length }}
          onClick={() => onNavigate?.('exit')}
        >
          Salir
        </button>
      </nav>
    </TableLayout>
  );
}

export default MainMenu;
