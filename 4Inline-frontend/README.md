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
- `src/components/GameLogo/` y `TableLayout/` — elementos visuales compartidos.
- `src/api/` — llamadas HTTP, conexión Socket.IO y sesión.
- `src/index.css` — colores y tipografías globales.
- `src/App.jsx` — navegación entre pantallas.

## Flujo actual

El creador entra en la sala al crear una partida e invita a un rival por su ID
de usuario. El rival acepta usando «Unirse a partida» con el ID de la partida.
Cuando ambos están aceptados, el creador puede iniciarla. La sala recibe las
actualizaciones mediante Socket.IO.

La pantalla del tablero de Cuatro en línea está pendiente de implementación.
