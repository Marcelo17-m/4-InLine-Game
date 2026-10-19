# 4inline-frontend

Interfaz en React (Vite + CSS Modules) para el juego Cuatro en línea.

La instalación del backend, los modelos, las rutas HTTP y los eventos están
documentados en el [README principal](../README.md).

## Uso

```bash
npm install
npm run dev
```

Abre la URL que muestre la terminal (por defecto http://localhost:5173).

El proxy actual espera el backend en http://localhost:3000. Vite redirige las
peticiones `/api` y la conexión `/socket.io` a ese servidor. Como `.env.example`
del backend propone `PORT=3100`, debes usar `PORT=3000` en tu `.env` o ajustar
los dos destinos de `vite.config.js` al puerto elegido.

Para probar con dos usuarios, utiliza sesiones independientes, como una ventana
normal y otra privada. Las pestañas del mismo perfil comparten el JWT en
`localStorage`.

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
- `src/api/gameConnection.js` — suscripción a eventos y recuperación del estado.
- `src/api/activeGame.js` — ID de partida recordado por usuario en la pestaña.
- `src/hooks/useGameConnection.js` — estado compartido de conexión y recuperación de partidas.
- `src/Tests/` — pruebas de conexión, envío de movimientos y restauración de partidas.
- `src/index.css` — colores y tipografías globales.
- `src/App.jsx` — navegación entre pantallas.

## Flujo actual

El creador entra en la sala al crear una partida e invita a un rival por su ID
de usuario. El rival acepta usando «Unirse a partida» con el ID de la partida.
Cuando ambos están aceptados, el creador puede iniciarla. La sala recibe las
actualizaciones mediante Socket.IO.

Enviar una invitación no habilita Start: el rival debe aceptarla. La notificación
aparece si el destinatario está conectado y en el menú; si no, puede introducir
manualmente el ID de la partida. No hay una bandeja de invitaciones offline.

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

El cliente deshabilita jugadas fuera de turno, durante el envío y mientras se
sincroniza la conexión. El backend vuelve a validar cada acción y determina la
posición de la ficha, el siguiente turno y el resultado. Los movimientos no se
guardan en cola para enviarlos automáticamente después de reconectar.

## Pruebas

Desde la raíz del repositorio, con las dependencias del backend y frontend instaladas:

```bash
npm test -- --watchAll=false --runInBand --runTestsByPath 4Inline-frontend/src/Tests/gameConnection.test.js 4Inline-frontend/src/Tests/activeGame.test.js 4Inline-frontend/src/Tests/moveSocket.test.js
```

Estas pruebas verifican comportamiento de los módulos de conexión y sesión;
no ejecutan una prueba visual del navegador. La compilación se comprueba con
`npm run build` dentro de `4Inline-frontend`.

## Despliegue

El build genera la carpeta `dist`. El servidor que publique esos archivos debe
redirigir `/api` y `/socket.io` al backend, incluyendo soporte WebSocket. Los
proxies de desarrollo de Vite no se incorporan a los archivos estáticos.
