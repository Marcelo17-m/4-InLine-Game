import styles from './TableLayout.module.css';

// El marco de mesa (madera + fieltro) que comparten todas las pantallas,
// para que se sientan parte de la misma app aunque el contenido cambie.
function TableLayout({ children }) {
  return (
    <main className={styles.table}>
      <div className={styles.felt}>{children}</div>
    </main>
  );
}

export default TableLayout;
