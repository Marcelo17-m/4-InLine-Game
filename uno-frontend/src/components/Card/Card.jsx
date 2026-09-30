import cardSheet from '../../assets/cards/uno-cards.png';
import { CARD_SPRITE_MAP, SPRITE_COLS, SPRITE_ROWS } from '../../data/cardSprite.js';
import styles from './Card.module.css';

/**
 * Renderiza una carta a partir del sprite sheet.
 *
 * <Card id="yellow-7" />
 * <Card id="wild4-black" />
 * <Card faceDown />                 // muestra el dorso sin importar `id`
 * <Card id="red-skip" onClick={..} /> // se puede jugar/seleccionar
 */
function Card({ id, faceDown = false, className = '', onClick }) {
  const targetId = faceDown ? 'back' : id;
  const position = CARD_SPRITE_MAP[targetId];

  if (!position) {
    // Falla visible en desarrollo en vez de romper el render va a mostrar vacio
    console.warn(`Card: no existe sprite para el id "${targetId}"`);
    return <div className={`${styles.card} ${styles.missing} ${className}`} />;
  }

  const { row, col } = position;
  const style = {
    backgroundImage: `url(${cardSheet})`,
    backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
    backgroundPosition: `${(col / (SPRITE_COLS - 1)) * 100}% ${(row / (SPRITE_ROWS - 1)) * 100}%`,
  };

  return (
    <div
      className={`${styles.card} ${onClick ? styles.playable : ''} ${className}`}
      style={style}
      role="img"
      aria-label={targetId}
      onClick={onClick}
    />
  );
}

export default Card;
