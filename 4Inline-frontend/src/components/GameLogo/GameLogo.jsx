import symbol from '../../assets/connect-four.svg';
import styles from './GameLogo.module.css';

function GameLogo({ compact = false }) {
  return (
    <span className={compact ? styles.compact : styles.logo}>
      <img src={symbol} alt="" aria-hidden="true" width="112" height="96" />
      <span className={styles.name}>4 <span>EN LÍNEA</span></span>
    </span>
  );
}

export default GameLogo;
