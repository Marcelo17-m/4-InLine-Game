# Connect Four Migration Handoff

## Purpose

This repository is being converted from UNO to a two-player online Connect Four game for the networking capstone. This checkpoint removes the UNO card and score domains and establishes the persisted data model required by the replacement game service.

The server must remain authoritative. A client may request a column, accept or reject an invitation, or leave a game. It must never supply a board, row, turn, player piece, winner, or final result.

## Scope Completed In This PR

| Area | Change | Why |
| --- | --- | --- |
| Card domain | Removed Card service, controller, route, and stale repository reference. | A Connect Four match has no deck, hand, discard pile, colors, or UNO actions. |
| Score domain | Removed Score model, repository, service, controller, route, and associations. | Match outcome belongs in `Game`; a public ranking is optional and should not block the base game. |
| Authentication | `User` now persists only `username` and `passwordHash`. | The assignment requires username/password and bcrypt hashes must not be returned by the API. |
| Game state | `Game` now has `pending`, `in_progress`, `finished`, and `rejected` states. | These states model invitation, accepted game, completed game, and rejected invitation. |
| Board | `Game.board` remains a persisted 6 by 7 JSON matrix. | The existing schema already provides a compact server-side board representation. |
| Participants | `GamePlayer` now has `piece`, `turnOrder`, and `invitationStatus`. | Exactly two players can be assigned stable roles and invitation outcomes. |
| Player repository | Uses `turnOrder` and `invitationStatus` instead of removed UNO fields. | Repository queries now match the new model. |

`Invitation`, `History`, and `ApiStats` remain unchanged. The existing Invitation table can persist the invitation sent to a player, and History can record accepted moves and final events in the next step.

## Data Model Contract

### User

```text
id
username       unique, required
passwordHash   required bcrypt hash, excluded from normal responses
createdAt
```

Authentication now receives `username` and `password`, saves the bcrypt output in `passwordHash`, and compares the plain password with that field during login.

### Game

```text
id
creatorId
state           pending | in_progress | finished | rejected
board           6 by 7 JSON matrix
currentPlayerId
winnerId
finishReason    four_in_line | draw | abandoned | rejected
createdAt
finishedAt
```

The board uses the existing persistence format:

```text
0 = empty cell
1 = red player (R)
2 = yellow player (Y)
```

The model validates finished and rejected results. A finished game must have a finish reason, finish time, no current player, and a winner except for a draw. A rejected game must have reason `rejected`, a finish time, no current player, and no winner.

### GamePlayer

```text
id
gameId
userId
piece               R | Y
turnOrder           0 | 1
invitationStatus    accepted | invited | rejected | abandoned
```

The database enforces uniqueness for `(gameId, userId)` and `(gameId, turnOrder)`. The service must enforce the business rule that a game has exactly two players and that a user has at most one pending or active game.

## Database Decision

Use a new MySQL database for this migration. `.env.example` now uses `DB_NAME=connect4_db`.

Do not run this migration against an UNO database or attempt to convert cards into board positions. Existing UNO matches, cards, scores, and account emails have no valid Connect Four representation. The current `sequelize.sync({ alter: true })` startup behavior must be replaced with a controlled schema setup before deployment.

## Current Limitation

Only the data and domain cleanup checkpoint is complete. `GameService`, game validators, game routes, socket handlers, frontend components, and most tests still contain UNO behavior. They must not be used as Connect Four behavior.

`container.js` keeps the legacy game service loadable by injecting `null` for removed card and score repositories. This is transitional only. The next step must remove those UNO dependencies entirely when it replaces the service.

The legacy Card and Score tests still reference removed modules and will fail until the test suite is replaced. Full `npm test` is therefore not a valid completion signal for this checkpoint.

## Next Step: Replace GameService

Replace the UNO methods in `src/Logic/Services/GameService.js` with exactly these operations:

```js
createInvitation({ creatorId, opponentId })
respondInvitation({ gameId, userId, accept })
makeMove({ gameId, userId, column })
leaveGame({ gameId, userId })
getGameState({ gameId, userId })
```

Create a pure Connect Four rules module before writing database code. It should create an empty board, find the lowest empty row in a column, place a disk, detect four connected disks in the horizontal, vertical, and both diagonal directions, and detect a full board.

### Required Dependency Changes

1. Remove card helpers, card validators, deck helpers, score helpers, and all `null` card/score dependencies from `src/container.js`.
2. Inject `invitationRepository`, `historyRepository`, and `sequelize` into the new game service.
3. Add a repository method that fetches a game row with a transaction lock. Use `transaction.LOCK.UPDATE` or the Sequelize equivalent.
4. Add repository queries to find a user with a pending or active game, and to fetch the two participants ordered by `turnOrder`.
5. Add presence helpers to `connectionRegistry.js` so the socket layer can determine whether a user has at least one active socket and can emit to that user.
6. Replace UNO validators with validations for membership, invitation ownership, availability, game state, turn, and integer columns from `0` through `6`.

### `createInvitation({ creatorId, opponentId })`

1. Reject an invitation to oneself.
2. Verify that the opponent exists and has at least one active socket.
3. Verify that neither user has a `pending` or `in_progress` game.
4. Start a transaction.
5. Create `Game` with state `pending`, an empty board, and no current player.
6. Create creator `GamePlayer` with `piece: 'R'`, `turnOrder: 0`, and `invitationStatus: 'accepted'`.
7. Create invited `GamePlayer` with `piece: 'Y'`, `turnOrder: 1`, and `invitationStatus: 'invited'`.
8. Create the existing `Invitation` record with status `pending` so invitation history remains available.
9. Commit the transaction.
10. Emit `game:invitation` only to the invited user room, including the game ID and the creator public identity.

### `respondInvitation({ gameId, userId, accept })`

1. Lock the game and load its pending invitation inside one transaction.
2. Verify that the caller is the invitation recipient and their `GamePlayer` record has status `invited`.
3. If `accept` is false, set the game state to `rejected`, set `finishReason` to `rejected`, set `finishedAt`, set the invited player status to `rejected`, and resolve the Invitation as `rejected`.
4. If `accept` is true, set the invited player status to `accepted`, resolve the Invitation as `accepted`, set the game state to `in_progress`, and set `currentPlayerId` to `creatorId`.
5. Commit before emitting any socket event.
6. Put both sockets in `game:<gameId>` and emit the complete initial game state to both players when accepted.

### `makeMove({ gameId, userId, column })`

1. Treat `userId` as the authenticated identity supplied by the socket middleware or JWT middleware, never as a client payload field.
2. Reject a non-integer column or a value outside `0` through `6`.
3. Start a transaction and lock the game row.
4. Verify the game is `in_progress`, the caller is an accepted participant, and `currentPlayerId` equals `userId`.
5. Load the caller piece and map `R` to board value `1`, or `Y` to board value `2`.
6. Find the lowest empty row in the requested column. Reject a full column.
7. Write the disk to a copied board, then check horizontal, vertical, descending diagonal, and ascending diagonal connections.
8. If there is a winner, set state `finished`, `winnerId`, `finishReason: 'four_in_line'`, `finishedAt`, and `currentPlayerId: null`.
9. If the board is full without a winner, set state `finished`, `finishReason: 'draw'`, `finishedAt`, `winnerId: null`, and `currentPlayerId: null`.
10. Otherwise, switch `currentPlayerId` to the other accepted participant.
11. Persist the board and create a `History` row with event type `move`, row, column, and move number.
12. Commit the transaction, then emit one complete `game:state` to the game room. Emit `game:ended` instead when the move completes the match.

### `leaveGame({ gameId, userId })`

1. Lock the game and verify that the caller is an accepted participant.
2. Reject leaving a game that is already finished or rejected.
3. Find the other accepted participant.
4. Set the leaving player status to `abandoned`.
5. Set game state to `finished`, winner to the opponent, `finishReason: 'abandoned'`, `finishedAt` to now, and `currentPlayerId` to null.
6. Create a History row with event type `abandoned`.
7. Commit, then emit `game:ended` to the room.

### `getGameState({ gameId, userId })`

1. Verify the caller belongs to the game.
2. Load the game and both players ordered by `turnOrder`.
3. Return only public user data: player ID, username, piece, invitation status, board, state, current player, winner, finish reason, and timestamps.
4. Never return password hashes, JWT values, server connection data, or another user private data.

## Socket Contract To Implement

Replace UNO socket actions with these events:

| Direction | Event | Payload |
| --- | --- | --- |
| Client to server | `game:invite` | `{ opponentId }` |
| Client to server | `game:invitation:respond` | `{ gameId, accept }` |
| Client to server | `game:move` | `{ gameId, column }` |
| Client to server | `game:leave` | `{ gameId }` |
| Server to client | `game:invitation` | invitation details |
| Server to room | `game:state` | complete public game snapshot |
| Server to room | `game:ended` | final public game snapshot |
| Server to client | `game:error` | `{ code, message }` |

Use rooms named `user:<userId>` for private invitations and `game:<gameId>` for game state. Emit only after the transaction commits. Socket.IO handlers should call the service and translate results to events; game rules and database writes belong in the service.

## Required Tests For The Next PR

1. User registration stores `passwordHash` and no serialized user exposes it.
2. Invitation rejects offline, nonexistent, self, busy, and duplicate opponents.
3. Only the invited user can accept or reject a pending invitation.
4. Accepted invitations start with an empty 6 by 7 board and creator turn.
5. Moves reject unauthenticated users, outsiders, wrong turns, invalid columns, and full columns.
6. Horizontal, vertical, descending diagonal, and ascending diagonal wins finish the game for both players.
7. A full board without four connected disks finishes as a draw.
8. Leaving an active game gives victory to the opponent with `abandoned` reason.
9. Two concurrent move attempts do not overwrite a board state.
10. Both clients receive identical `game:state` and `game:ended` payloads after committed changes.
