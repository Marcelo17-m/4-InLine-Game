# 4inline-frontend

Interfaz en React (Vite + CSS Modules) para el juego Cuatro en línea.

## Uso

```bash
npm install
npm run dev
```

Abre la URL que muestre la terminal (por defecto http://localhost:5173).

El backend debe estar disponible en http://localhost:3000. Vite redirige las
peticiones `/api` y la conexión `/socket.io` a ese servidor.

Para comprobar la compilación de producción:

```bash
npm run build
```

## Estructura

- `src/components/MainMenu/` — pantalla de bienvenida.
- `src/components/Login/` y `Register/` — autenticación.
- `src/components/GameMenu/` — crear partidas, unirse por ID y recibir invitaciones.
- `src/components/GameLobby/` — jugadores, invitaciones por ID de usuario e inicio de partida.
- `src/components/GameBoard/` — tablero interactivo, turnos y resultado final.
- `src/components/GameLogo/` y `TableLayout/` — elementos visuales compartidos.
- `src/api/` — llamadas HTTP, conexión Socket.IO y sesión.
- `src/hooks/useGameConnection.js` — estado compartido de conexión y recuperación de partidas.
- `src/index.css` — colores y tipografías globales.
- `src/App.jsx` — navegación entre pantallas.

## Flujo actual

El creador entra en la sala al crear una partida e invita a un rival por su ID
de usuario. El rival acepta usando «Unirse a partida» con el ID de la partida.
Cuando ambos están aceptados, el creador puede iniciarla. La sala recibe las
actualizaciones mediante Socket.IO.

Al iniciar, ambos jugadores pasan al tablero de 6 filas y 7 columnas. En tu turno,
pulsa cualquier círculo vacío de una columna para jugar. La columna se ilumina en
verde al señalarla y el servidor coloca la ficha en el espacio libre más bajo.
El encabezado muestra el turno y el resultado final aparece en una ventana con
un botón para volver al menú de crear/unirse.

Durante una desconexión no se envían jugadas. Al reconectar se vuelve a entrar en
la sala y se recupera el tablero guardado, incluso si la partida terminó mientras
el jugador estaba desconectado. El ID se recuerda por usuario en `sessionStorage`
para recuperar la partida tras recargar la misma pestaña, mientras el JWT sea válido.
Volver al menú borra ese recordatorio; no abandona ni elimina la partida.
