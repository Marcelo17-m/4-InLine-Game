# UNO Game - Full-Stack Capstone

**Author:** Marcelo Medrano Fonseca

A multiplayer UNO application with a Node.js API, a React interface, and real time gameplay through Socket.IO. The backend manages all game rules and database changes and the frontend renders the state that the server sends to each player.

## Main features

- User registration, login, logout, profile, and authenticated account deletion.
- Game creation through REST.
- Real-time join, start, leave, play, draw, say UNO, and catch UNO actions.
- Private state updates: each player receives their own hand, but only the card count and user ID of opponents.
- Complete UNO turn logic for number, skip, reverse, draw two, wild, and wild draw four cards.
- Wild-card color selection, with the selected color displayed on the discard pile.
- Automatic discard-pile recycling when the draw deck runs out.
- Winner notification and a final score table when a player reaches zero cards.
- A REST endpoint that suggests a playable card for the authenticated player.
- Request statistics, short-lived response caching, history, and score persistence.
- Backend tests for helpers, monads, validators, services, repositories, controllers, and socket handlers.

## Recent improvements

- Gameplay actions in the React app were moved from repeated HTTP requests to Socket.IO events.
- Drawing a card now updates the database and broadcasts a fresh personalized `game-state`, so the new card appears immediately.
- Joining and leaving a game now use sockets in the UI.
- A `game-ended` event opens a winner modal with every player's final score.
- Wild cards preserve and display the chosen active color.
- The card parser and sprite mapping support regular cards, black wild cards, and colored wild-card states.
- The missing green UI color tokens were added.
- `DELETE /api/auth/users/:id` was added for authenticated self-deletion.
- `POST /api/games/suggest-card` was added to return a legal card or `null`.

## Technology

| Area | Technology |
| --- | --- |
| Backend | Node.js, Express 5 |
| Real-time communication | Socket.IO |
| Database | MySQL, Sequelize |
| Authentication | JWT, bcrypt |
| Frontend | React 18, Vite, CSS Modules |
| Backend tests | Jest, Supertest, SQLite in memory |
| Logging | Winston |

## Architecture

The backend follows a layered architecture. Dependencies are assembled in `src/container.js`, which lets the business logic receive repositories and helper functions instead of creating them directly.

```text
React component
    | REST request                  | Socket event
    v                               v
Express route -> Controller      Socket handler
                    \              /
                     v            v
                       Service
                          |
                    Validator rules
                          |
                      Repository
                          |
                  Sequelize model -> MySQL
```

After a socket action changes the game, the server asks `GameService` for a separate view for every connected user and emits `game-state`. This prevents one player from receiving another player's cards.

### Project structure

```text
.
|-- src/
|   |-- Data Access/
|   |   |-- Models/          # Sequelize tables and associations
|   |   `-- Repositories/    # Database queries
|   |-- Logic/
|   |   |-- Monads/          # Result.Ok / Result.Err
|   |   |-- Services/        # Application and UNO business logic
|   |   `-- Validators/      # Small rules and composed validation flows
|   |-- Presentation/
|   |   |-- Controllers/     # HTTP adapters
|   |   |-- Routes/          # Express endpoints
|   |   `-- Sockets/         # Socket.IO event handlers and connections
|   |-- Middleware/          # JWT, errors, metrics, caching, socket auth
|   |-- Helpers/             # Card rules, deck, recursion, scoring, composition
|   |-- Tests/               # Backend automated tests
|   |-- app.js               # Express application
|   |-- container.js         # Dependency composition root
|   `-- server.js            # HTTP + Socket.IO server
`-- uno-frontend/
    |-- src/
    |   |-- api/             # fetch client, JWT session, Socket.IO client
    |   |-- components/      # React screens and reusable UI
    |   |-- data/            # Card sprite coordinates
    |   |-- utils/           # Backend-card to sprite-ID parser
    |   `-- App.jsx          # Screen and active-game coordinator
    `-- vite.config.js       # /api and /socket.io development proxies
```

## REST and Socket.IO responsibilities

The React frontend intentionally uses both protocols:

| Action | Frontend transport | Reason |
| --- | --- | --- |
| Register and login | REST | One request produces one response |
| Create game | REST | Creation is a one-time command |
| Join and start | Socket.IO | Every lobby member must update immediately |
| Play, draw, say/catch UNO | Socket.IO | Every player needs the new state immediately |
| Leave game | Socket.IO | The room and game state must update together |
| Receive winner and scores | Socket.IO | The server pushes the result to the whole room |

The backend keeps REST versions of several game actions for API/Postman use. The React gameplay screens use the socket versions.

## Installation

### Requirements

- Node.js 18 or newer
- npm
- A running MySQL server

### 1. Configure the backend

Install dependencies from the project root:

```bash
npm install
```

Copy `.env.example` to `.env` and enter your database values:

```env
DB_PORT=3306
DB_NAME=game_db
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_DIALECT=mysql
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h
PORT=3000
```

Start the API and Socket.IO server:

```bash
npm run dev
```

The backend listens on `http://localhost:3000` by default. On startup, Sequelize authenticates and synchronizes the models.

### 2. Configure the frontend

In a second terminal:

```bash
cd uno-frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. During development, Vite proxies `/api` and `/socket.io` to port `3000`.

## Authentication

For authenticated REST requests with a JSON body, pass the JWT in the `access_token` field. This also works for `DELETE /api/auth/users/:id` and `DELETE /api/games/:id`; the middleware reads the token from the request body.

```json
{
  "access_token": "YOUR_JWT"
}
```

Socket.IO sends the same JWT once during its handshake.

The server verifies the token before accepting the socket and stores the decoded user as `socket.user`.

## REST API

All routes start with `/api`.

### Authentication: `/api/auth`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/register` | Create a user |
| POST | `/login` | Return a JWT |
| POST | `/logout` | Revoke the current JWT |
| POST | `/profile` | Return the authenticated profile |
| DELETE | `/users/:id` | Delete your own account and revoke the JWT |

Example account deletion:

```http
DELETE /api/auth/users/5
Content-Type: application/json

{
  "access_token": "YOUR_JWT"
}
```

The user ID inside the token must match `:id`; otherwise the API returns `403`. A successful deletion returns `204 No Content`: the request contains the token, and the response has no body.

### Games: `/api/games`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/` | Create a game |
| GET | `/` | List games |
| GET | `/:id` | Get one game |
| PUT | `/:id` | Update a game |
| DELETE | `/:id` | Delete a game |
| POST | `/join` | Join a waiting game |
| POST | `/start` | Start a game |
| POST | `/leave` | Leave a game |
| POST | `/end` | End a game manually |
| POST | `/state` | Get the basic state |
| POST | `/players` | Get players |
| POST | `/current-player` | Get the current player |
| POST | `/top-card` | Get the discard card |
| POST | `/scores` | Get scores |
| POST | `/play-card` | Play a card |
| POST | `/draw-card` | Draw a card |
| POST | `/say-uno` | Declare UNO |
| POST | `/catch-uno` | Penalize a player who did not say UNO |
| POST | `/hand` | Get the authenticated player's hand |
| POST | `/history` | Get turn history |
| POST | `/state-detail` | Get a player-specific full state |
| POST | `/suggest-card` | Suggest a legal card for the current player |

Suggestion request and response:

```json
{
  "game_id": 5,
  "access_token": "YOUR_JWT"
}
```

```json
{
  "game_id": 5,
  "suggested_card": "green reverse",
  "message": "Playable card found"
}
```

When no card can be played, `suggested_card` is `null`. The game must be in progress, the user must belong to it, and it must be that user's turn.

### Cards, scores, and statistics

- `/api/cards`: standard `POST`, `GET`, `GET /:id`, `PUT /:id`, and `DELETE /:id` operations.
- `/api/scores`: standard `POST`, `GET`, `GET /:id`, `PUT /:id`, and `DELETE /:id` operations.
- `/api/stats/requests`
- `/api/stats/response-times`
- `/api/stats/status-codes`
- `/api/stats/popular-endpoints`

## Socket.IO events

### Client to server

| Event | Important payload fields |
| --- | --- |
| `join` | `game_id` |
| `start-game` | `game_id` |
| `play-card` | `game_id`, `card`, `chosen_color` for wild cards |
| `draw-card` | `game_id` |
| `say-uno` | `game_id` |
| `catch-uno` | `game_id`, `target_user_id` |
| `leave-game` | `game_id` |

### Server to client

| Event | Purpose |
| --- | --- |
| `join` | Refresh lobby players |
| `start-game` | Confirm that start succeeded to the requester |
| `play-card`, `draw-card`, `say-uno`, `catch-uno`, `leave-game` | Confirm an action to the requester |
| `game-state` | Push a fresh personalized board after a successful change |
| `game-ended` | Send the winner message and final scores to the room |
| `error` | Return `{ event, message }` for a failed action |
| `connect_error` | Report JWT handshake failures on the client |

## Card display and wild colors

The backend sends simple strings such as `red 7`, `green draw_two`, `wild`, or `blue wild_draw_four`. `cardParser.js` converts them into sprite IDs such as `red-7`, `green-draw2`, `wild-black`, or `wild4-blue`. `Card.jsx` then uses `cardSprite.js` to select the correct row and column from `uno-cards.png`.

Cards in a player's hand display a wild card with its black face. After it is played, `GameService` stores `currentColor`, includes that color in the next `topCard`, and the frontend renders the colored wild sprite.

## Tests

Run all backend tests once:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

The test setup replaces MySQL with an in-memory SQLite database. Service and controller tests mock dependencies where isolation is useful, repository tests exercise real Sequelize operations, and socket tests verify room events such as `game-ended`.

The React frontend currently has no automated test command; `npm run build` is its main compile-time verification.

```bash
cd uno-frontend
npm run build
```

## Design concepts

The code demonstrates:

- SOLID through layered responsibilities, small interfaces, factories, and dependency injection.
- A monad-like `Result` type for explicit success and failure paths.
- Higher-order functions in validators, middleware factories, callbacks, and array operations.
- Recursion when dealing the initial cards.
- Generator functions for lazy card and socket iteration.
- `map`, `find`, `filter`, `some`, `reduce`, and function composition.

## Postman collection

The original collection is available at <https://drive.google.com/file/d/1IBsu9ZvQL6RZ4Wt3hlK2ficQOGxGXZAi/view?usp=sharing>
