# Implementation Plan: Crypt Keeper

## Overview

Plain JavaScript (ES modules, JSDoc types) with React and Vite, tested with Vitest and fast-check. Tasks follow the build order in the design: the pure `logic/` layer first, then side-effect edges, then hooks and screens. Each task is small and can be built on its own. Property tests sit next to the code they check. Time, randomness, storage and fetch are injected so tests are deterministic.

## Tasks

- [x] 1. Project setup
  - [x] 1.1 Scaffold the Vite and React project
    - Create `package.json` with scripts `dev`, `build`, `preview` and `test` (`vitest run`, no watch)
    - Add React, Vite, Vitest, jsdom, React Testing Library and `fast-check` with pinned versions
    - Create `src/main.jsx`, `src/App.jsx` (minimal), `index.html`, `vite.config.js` with Vitest config, and the folders `src/logic`, `src/services`, `src/hooks`, `src/components`, `src/screens`, `tests/unit`, `tests/property`
    - Add `.gitignore` listing `.env` and `.env.local`, `.env.example` with `AI_API_KEY`, `AI_API_URL`, `AI_MODEL` (no real key), and a README skeleton
    - Add one trivial passing test so `npm test` exits 0
    - _Requirements: 10.3, 10.4, 16.1, 16.2, 16.4, 16.5_

- [x] 2. Storage
  - [x] 2.1 Implement `logic/storageCodec.js` and data shape validators
    - `encode(data, version = 1)` and `decode(text, validate, supportedVersions)` returning result objects, never throwing
    - Shape validators and defaults for Settings, Stats and Decks
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ]* 2.2 Write property test for storage round trip
    - **Property 25: Storage round trip and format**
    - **Validates: Requirements 13.1, 13.2, 13.3**
    - File: `tests/property/storage.property.test.js`

  - [x] 2.3 Implement `services/storageService.js` and `hooks/useStorage.js`
    - `load`, `save`, `isAvailable` that never throw; keys prefixed `cryptkeeper:`
    - Invalid data returns defaults without overwriting the stored value
    - `useStorage` returns `[value, setValue, status]` and keeps data in memory on save failure
    - _Requirements: 13.1, 13.4, 13.5_

  - [ ]* 2.4 Write property test for invalid stored data
    - **Property 26: Invalid stored data yields defaults**
    - **Validates: Requirements 13.4**
    - Uses a fake `localStorage`; checks the stored value is left unmodified

- [x] 3. Validation
  - [x] 3.1 Implement `logic/validation.js`
    - `validateName` (1 to 100 trimmed), `validateCardText` (1 to 500 trimmed), `validateNotes` (200 to 12000, message with count and limit)
    - _Requirements: 6.1, 6.4, 6.7, 9.2, 9.3, 9.4_

  - [ ]* 3.2 Write property test for text validation
    - **Property 9: Text validation by trimmed length**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5, 6.7**
    - File: `tests/property/decks.property.test.js`

  - [ ]* 3.3 Write property test for the notes length gate
    - **Property 15: Notes length gate**
    - **Validates: Requirements 9.2, 9.3, 9.4**
    - File: `tests/property/quiz.property.test.js`

- [x] 4. Timer and candle height
  - [x] 4.1 Implement `parseMinutes`, `defaultSettings` and `formatMMSS` in `logic/timer.js`
    - Study 1..120 and break 1..60, whole numbers only, rejection with a range message
    - `formatMMSS` rounds up to the next whole second
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.2 Write property tests for minutes parsing and formatting
    - **Property 1: Minutes input validation**
    - **Property 4: MM:SS formatting**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
    - File: `tests/property/timer.property.test.js`

  - [x] 4.3 Implement timer state transitions in `logic/timer.js`
    - `start`, `pause`, `reset`, `tick`, `isFinished`, `completeSession`, `applyLengthChange` using `endTimestamp`
    - _Requirements: 2.5, 2.6, 2.7, 2.11, 2.12, 2.13_

  - [ ]* 4.4 Write property tests for timer transitions
    - **Property 2: Timer remaining time depends only on the end timestamp**
    - **Property 3: Resets and switches restore full length**
    - **Validates: Requirements 2.5, 2.6, 2.7, 2.11, 2.12, 2.13**
    - File: `tests/property/timer.property.test.js`

  - [x] 4.5 Implement `logic/candleHeight.js`
    - `candleHeightPercent(remainingMs, totalMs)` clamped to 0..100, returns 100 for invalid totals
    - _Requirements: 3.1, 3.3, 3.4, 3.8_

  - [ ]* 4.6 Write property test for candle height
    - **Property 5: Candle height**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.8**
    - File: `tests/property/candleHeight.property.test.js`

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Stats
  - [x] 6.1 Implement `logic/stats.js`
    - `dayKey`, `daysBetween` (UTC based), `normalizeStats`, `recordStudySession` with the streak table from the design
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7, 4.8, 5.4_

  - [ ]* 6.2 Write property test for session recording
    - **Property 6: Finishing a study session updates stats**
    - **Validates: Requirements 4.1, 4.4**
    - File: `tests/property/stats.property.test.js`

  - [ ]* 6.3 Write property test for streak rules
    - **Property 7: Streak rules**
    - **Validates: Requirements 4.5, 4.6, 4.7, 4.8**
    - File: `tests/property/stats.property.test.js`

  - [ ]* 6.4 Write property test for day rollover
    - **Property 8: Day rollover normalization**
    - **Validates: Requirements 4.7, 5.4, 5.7**
    - File: `tests/property/stats.property.test.js`

- [x] 7. Decks
  - [x] 7.1 Implement `logic/decks.js`
    - Immutable `createDeck`, `renameDeck`, `deleteDeck`, `addCard`, `editCard`, `deleteCard`, `incrementMiss` returning `{ ok, decks }` or `{ ok: false, error }`
    - IDs and timestamps passed in
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.8_

  - [ ]* 7.2 Write property test for deck operations
    - **Property 10: Deck operations**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.11**
    - File: `tests/property/decks.property.test.js`

  - [ ]* 7.3 Write property test for miss count increment
    - **Property 14: Miss count increment**
    - **Validates: Requirements 8.8**
    - File: `tests/property/decks.property.test.js`

- [x] 8. Review scheduler
  - [x] 8.1 Implement `buildQueue` in `logic/scheduler.js`
    - Higher `missCount` first, random order among equals using injected `rng`
    - _Requirements: 7.1, 8.7, 8.9_

  - [ ]* 8.2 Write property test for initial queue ordering
    - **Property 11: Initial queue ordering**
    - **Validates: Requirements 7.1, 8.7, 8.9**
    - File: `tests/property/scheduler.property.test.js`

  - [x] 8.3 Implement `applyResult` in `logic/scheduler.js`
    - Missed reinserts 1 to 3 after current; got after miss reinserts 5 after, confirmed; got on a clean or confirmed card removes it
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.11_

  - [ ]* 8.4 Write property test for scheduler transitions
    - **Property 12: Review scheduler transitions**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
    - File: `tests/property/scheduler.property.test.js`

  - [ ]* 8.5 Write property test for session completeness
    - **Property 13: Scheduler session completeness**
    - **Validates: Requirements 7.6, 8.6, 8.11**
    - File: `tests/property/scheduler.property.test.js`

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Quiz model
  - [x] 10.1 Implement `logic/quiz.js`
    - `isValidQuestion`, `isValidQuiz`, `printQuestions`, `parseQuestions` (tolerates a Markdown code fence, never throws)
    - _Requirements: 9.6, 9.7, 10.10, 10.11_

  - [ ]* 10.2 Write property test for question validity
    - **Property 16: Question validity**
    - **Validates: Requirements 9.6, 9.7**
    - File: `tests/property/quiz.property.test.js`

  - [ ]* 10.3 Write property test for print and parse round trip
    - **Property 20: Quiz print and parse round trip**
    - **Validates: Requirements 10.10, 10.11**
    - File: `tests/property/quiz.property.test.js`

  - [ ]* 10.4 Write property test for invalid response parsing
    - **Property 21: Parsing invalid text fails safely**
    - **Validates: Requirements 9.8, 10.6**
    - File: `tests/property/quiz.property.test.js`

- [x] 11. Fallback generator
  - [x] 11.1 Implement `logic/fallbackGenerator.js`
    - `splitSentences`, `extractKeyTerms`, `generateFallbackQuiz(notes, rng)` returning questions or `not-enough-detail`
    - Output must pass `isValidQuiz`
    - _Requirements: 10.7, 10.8, 9.6, 9.7_

  - [ ]* 11.2 Write property test for fallback output validity
    - **Property 18: Fallback generator output validity**
    - **Validates: Requirements 10.7, 9.6, 9.7**
    - File: `tests/property/fallback.property.test.js`

  - [ ]* 11.3 Write property test for thin notes
    - **Property 19: Fallback rejects thin notes**
    - **Validates: Requirements 10.8**
    - File: `tests/property/fallback.property.test.js`

- [x] 12. Mistakes and quiz play
  - [x] 12.1 Implement `logic/mistakes.js`
    - `MISTAKES_DECK_NAME` and `addMistakes(decks, questions, makeId)` returning `{ decks, added, skipped }`, skipping duplicates by front text, creating the deck if missing
    - _Requirements: 12.2, 12.3, 12.6, 12.7_

  - [ ]* 12.2 Write property test for saving mistakes
    - **Property 24: Saving mistakes to the Grimoire**
    - **Validates: Requirements 12.2, 12.3, 12.6, 12.7**
    - File: `tests/property/mistakes.property.test.js`

  - [x] 12.3 Implement `logic/quizPlay.js`
    - `initPlay`, `selectOption` (first answer only), `next` (only after answered), `score`, `retry`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7_

  - [ ]* 12.4 Write property test for answering and score
    - **Property 22: Answering and score**
    - **Validates: Requirements 11.2, 11.3, 11.4**
    - File: `tests/property/quizPlay.property.test.js`

  - [ ]* 12.5 Write property test for retry
    - **Property 23: Retry resets play state**
    - **Validates: Requirements 11.7**
    - File: `tests/property/quizPlay.property.test.js`

- [x] 13. AI client and generation flow
  - [x] 13.1 Implement `services/aiClient.js`
    - `requestQuestions(notes, { timeoutMs = 20000, fetchImpl })` posts `{ notes }` to `/api/quiz` with `AbortController`; rejects on network error, non-2xx or timeout
    - The server route owns the provider prompt, model, endpoint and authorization; the browser receives only the raw model response text
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 13.2 Implement the generation flow in `logic/generateQuiz.js`
    - Call the server-backed AI route, parse a complete response, and on any route or parsing failure use the fallback and flag the "simple questions were used" notice
    - Return source label ("AI questions" or "Simple questions"), a `not-enough-detail` result, or a failure; 30 second outer guard; never return partial questions
    - _Requirements: 9.8, 10.5, 10.6, 10.8, 10.9_

  - [ ]* 13.3 Write property test for server proxy failure fallback
    - **Property 17: Server proxy failure uses local fallback**
    - **Validates: Requirements 10.5, 10.6**
    - File: `tests/property/generation.property.test.js`

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Theme and app shell
  - [x] 15.1 Create the theme CSS
    - `styles/theme.css` with custom properties: background hue 260 to 290 and lightness at or below 20%, green accent hue 90 to 150, 16 px minimum body text, heading font with fallback stack and `font-display: swap`, `:focus-visible` outline of 3 px, 44 px minimum touch targets
    - `styles/layout.css` with responsive rules: bottom nav under 768 px, no horizontal overflow from 320 px
    - `styles/fog.css` and `styles/candle.css` with `prefers-reduced-motion` rules
    - _Requirements: 3.7, 14.1, 14.2, 14.3, 14.5, 14.7, 14.8, 15.1, 15.2, 15.3, 15.4_

  - [x] 15.2 Implement `App`, `Nav` and the error boundary
    - `screen` state defaulting to `'crypt'`, four labeled nav items, `aria-current="page"` on the active one
    - Error boundary keeps the previous screen and shows "This screen could not be loaded"
    - Create placeholder files for `CryptScreen`, `CandleScreen`, `GrimoireScreen` and `SeanceScreen` so later tasks replace screen files without editing `App.jsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 15.3 Implement `FogLayer` and `StorageBanner`
    - Fixed, `pointer-events: none`, `aria-hidden="true"` fog behind content
    - Banner "Progress may not be saved" in an `aria-live="polite"` region, shown within 1 second of a storage failure; mount both in `App`
    - _Requirements: 13.5, 14.4, 14.5_

  - [ ]* 15.4 Write unit tests for the shell
    - Four links on each screen, active marking, error boundary behavior, banner on a failing fake `localStorage`
    - _Requirements: 1.1, 1.4, 1.5, 13.5_

- [x] 16. Candle screen
  - [x] 16.1 Implement `CandleVisual`
    - SVG candle with height from `candleHeightPercent`, flame only while running and time remains, `role="img"` with an `aria-label` that states percent remaining
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 15.5_

  - [x] 16.2 Implement `hooks/useCandle.js`
    - 250 ms interval while running plus a `visibilitychange` tick, settings persisted through `useStorage`
    - On a finished study session: `recordStudySession`, save, keep the completion message with the new total until dismissed or next start, `aria-live="assertive"` announcement "Session ended"
    - Reset never touches stats; save failure shows "progress was not saved" and keeps values in memory
    - _Requirements: 2.5, 2.8, 2.9, 2.10, 2.11, 2.12, 4.1, 4.2, 4.3, 4.9, 4.10, 15.6_

  - [x] 16.3 Implement `CandleScreen`
    - Timer display, start, pause, reset, study and break length inputs with validation messages, `CandleVisual`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.13, 3.3_

  - [ ]* 16.4 Write unit tests for the Candle
    - Defaults, restore, validation message, flame visibility, break leaves points unchanged, reset leaves stats unchanged, completion message and live region, storage failure messages
    - _Requirements: 2.1, 2.8, 2.9, 2.10, 3.4, 3.5, 3.6, 4.2, 4.3, 4.9, 4.10, 15.6_

- [x] 17. Crypt screen
  - [x] 17.1 Implement `hooks/useStats.js` and `CryptScreen`
    - Normalize stats on open, refresh Today_Progress at local midnight and on `visibilitychange`
    - Show soul points, streak in days, today sessions and minutes; exactly three links (Candle, Grimoire, Seance) that navigate through `App`
    - On load failure show zeros, an error message and keep the links
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 17.2 Write unit tests for the Crypt
    - Stored values, zeros with empty storage, three links, error state, midnight rollover with fake timers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8_

- [x] 18. Grimoire screen
  - [x] 18.1 Implement deck and card management UI in `GrimoireScreen`
    - Create, rename and delete (with confirm) decks; add, edit and delete cards; card counts in the list
    - Field-specific validation messages, save after each successful operation, error message on save or load failure, empty list on load failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_

  - [x] 18.2 Implement `hooks/useStudySession.js`
    - Start with `buildQueue` or the empty-deck state; hold `{ queue, flipped, gotCount, missedCount }`
    - `flip()` and `answer(result)`; on missed call `incrementMiss` and save; on save failure keep the queue and flag an error indication
    - _Requirements: 7.1, 7.4, 7.5, 7.6, 8.8, 8.10, 8.11_

  - [x] 18.3 Implement the study mode UI in `GrimoireScreen`
    - One card at a time, flip by click, button or space, CSS page turn within 600 ms (instant under reduced motion)
    - "Got it" and "Missed it" as real buttons in tab order, empty-deck message with an add-card control, session summary with counts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 18.4 Write unit tests for the Grimoire
    - Create, rename, delete with confirm, empty deck message, keyboard study flow, summary counts, save failure messages
    - _Requirements: 6.1, 6.3, 6.10, 7.5, 7.6, 7.7, 7.8, 8.10_

- [x] 19. Seance screen
  - [x] 19.1 Implement `hooks/useSeance.js`
    - Validate notes before generating, call the generation flow, expose `loading`, `source`, `notice`, `error`, `questions`
    - Keep notes on any failure; connect quiz play state and per-question and bulk save of mistakes through `useStorage` on the decks key
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.8, 10.6, 10.8, 10.9, 12.2, 12.4, 12.5, 12.7_

  - [x] 19.2 Implement notes input and quiz play UI in `SeanceScreen`
    - Notes text area, submit disabled while loading with a loading indicator, privacy notice when a key exists, source label, count and limit messages
    - Ghost with fixed correct and incorrect message lists that do not overlap, option buttons, next control, "N out of 5" score, retry and new-notes controls
    - _Requirements: 9.1, 9.5, 10.9, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 13.7, 15.5_

  - [x] 19.3 Implement the save-to-Grimoire UI in `SeanceScreen`
    - Per-question "Save to Grimoire" after a wrong answer, kept until the quiz ends; confirmation, "Card already exists" and failure messages
    - "Save all mistakes" at quiz end only when there were wrong answers, with "N added, M skipped"
    - _Requirements: 12.1, 12.2, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [ ]* 19.4 Write unit tests for the Seance
    - Loading state, AI success label, AI failure fallback notice, thin notes message, privacy notice, ghost messages differ, score text, retry, single save, duplicate, failure, save all counts, no network call other than the AI call
    - _Requirements: 9.5, 10.6, 10.8, 10.9, 11.4, 11.5, 11.7, 12.1, 12.4, 12.5, 12.6, 12.7, 12.8, 13.6, 13.7_

- [x] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Accessibility, responsive pass and README
  - [x] 21.1 Apply the accessibility and responsive pass
    - Verify accessible names for the candle, the Ghost and icon-only controls; focus outlines; 44 px targets; no keyboard traps; wrapping at 320 px; fog opacity keeps text contrast at 4.5:1 or better
    - Fix any gaps found in the CSS and components
    - _Requirements: 14.6, 14.8, 15.1, 15.4, 15.5, 15.7, 15.8_

  - [x] 21.2 Finish the README
    - Document the Node.js version, install command, each npm script, every server-side env variable (name, purpose, required or optional), fallback behavior when missing, and the note that the AI key never reaches browser code
    - _Requirements: 16.3_

  - [ ]* 21.3 Write smoke tests
    - `.env.example` names all variables and has no key; `.gitignore` lists `.env`; theme tokens in range; `prefers-reduced-motion` rules exist; headings have fallback fonts; README mentions each script and variable
    - _Requirements: 3.7, 10.3, 10.4, 14.1, 14.2, 14.5, 16.3_

- [x] 22. Server-side AI security migration
  - [x] 22.1 Move AI provider access behind the Vercel quiz API
    - Create `api/quiz.js` using only server-side `AI_API_KEY`, `AI_API_URL` and `AI_MODEL` environment variables.
    - Update the browser AI client to POST notes only to `/api/quiz`, remove browser key/configuration plumbing, and preserve local fallback behavior for missing provider configuration or API failures.
    - Update the environment example, README and unit coverage without real secrets, and remove obsolete browser-exposed AI configuration references.
    - _Requirements: 10.1, 10.5, 10.6, 13.7, 16.3_

- [ ] 23. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the universal correctness properties from the design; each runs at least 100 times and carries the tag `Feature: crypt-keeper, Property N: <text>`
- Unit tests validate specific examples, UI flows and edge cases
- Layout, contrast and screen reader behavior still need manual checks as listed in the design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "4.5", "6.1", "7.1", "8.1", "10.1", "12.3", "13.1", "15.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "4.3", "4.6", "6.2", "8.2", "8.3", "11.1", "12.1", "12.4"] },
    { "id": 3, "tasks": ["2.4", "4.4", "6.3", "7.2", "8.4", "10.2", "11.2", "12.2", "12.5", "13.2", "15.2", "16.1", "16.2", "18.2"] },
    { "id": 4, "tasks": ["6.4", "7.3", "8.5", "10.3", "11.3", "13.3", "15.3", "16.3", "17.1", "18.1", "19.1"] },
    { "id": 5, "tasks": ["10.4", "15.4", "16.4", "17.2", "18.3", "19.2"] },
    { "id": 6, "tasks": ["18.4", "19.3"] },
    { "id": 7, "tasks": ["19.4"] },
    { "id": 8, "tasks": ["21.1", "21.2"] },
    { "id": 9, "tasks": ["22.1"] },
    { "id": 10, "tasks": ["21.3"] }
  ]
}
```
