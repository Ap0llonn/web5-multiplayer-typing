# Human race implementation plan

**Goal:** Deliver a playable human multiplayer race from the existing lobby through results and replay (COURSE-01–11, initial CONF and RES).

**Spec:** `docs/CAHIER_DES_CHARGES.md` sections 4.5, 4.6 and 4.9; user request “make the race” following the proposed complete human race.

**Architecture:** Lobby owns the room/race aggregate, including membership and race state. Pure domain functions receive the clock; the existing repository locks the room and persists race transitions atomically. Identity resolution and transport remain in composition. No cross-module repository access or transaction is needed.

**Contract:** Host configures FR/EN, word count, time limit and correction mode while waiting, starts with two participants; the server freezes the roster/text and sets start time three seconds ahead. Edit batches carry race ID and monotone sequence, never scores or actor IDs. Private draft is returned only to its author. A result is saved for each account; guest state is limited to the current room and overwritten on replay. Bots, bonuses, full corpus/configuration, historic result pages and result charts remain separately tracked requirements.

**Constraints:** Strict TypeScript, translated FR/EN text, both themes, physical-keyboard notice on mobile, session authorization for every command/stream. Text examples are original bilingual practice passages, versioned and inserted by migration, not attributed to an external author. Each input has a server schema.

**Review focus:** simultaneous starts; stale/duplicate batches and multiple tabs; spectators submitting edits; expiry/host departure/kick mid-race; zero-time metrics and ranking of timeout versus abandonment.

- [x] Domain tests first: countdown, correction, metrics, rate bounds, ranking, expiry and replay; prove red then implement.
- [x] Add versioned PostgreSQL migration, aggregate mapping and account-only result persistence; integration tests for concurrency, privacy and authorization.
- [x] Add validated race HTTP commands and adaptive SSE snapshots through composition, with injected supervisor clock.
- [x] Add translated waiting configuration, countdown, typing, live track, results, replay/close and confirmed abandonment using current UI components.
- [x] Browser tests with two real sessions, spectator, reload, replay, keyboard and FR/EN themes; repair the previously observed obsolete visibility tab-order assertion.
- [x] Run lint, types, boundaries, units, disposable PostgreSQL integration, build and browser suite. Update architecture, requirement statuses and dated verification with exact limits.
