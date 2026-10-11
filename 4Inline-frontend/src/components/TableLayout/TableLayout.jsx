import styles from './TableLayout.module.css';

function TableLayout({ children }) {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>{children}</section>
    </main>
  );
}

export default TableLayout;