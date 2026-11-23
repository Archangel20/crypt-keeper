# Crypt Keeper

Crypt Keeper is a React and Vite study app that runs in the browser. It stores study data in `localStorage` and uses an optional Vercel serverless route for AI-generated questions.

## Prerequisites

Use Node.js **20.19.0 or newer on the 20.x line, or 22.12.0 or newer**. This matches the Node.js engine range required by the project's Vite 8 tooling (`^20.19.0 || >=22.12.0`).

## Install

From the repository root, install dependencies with:

```bash
npm install
```

## Environment variables

Environment variables are optional. Copy `.env.example` to `.env` for local development, or configure the same variables in the Vercel project settings. The variables are read only by `api/quiz.js` on the server.

| Variable | Purpose | Required? | If missing or empty |
| --- | --- | --- | --- |
| `AI_API_KEY` | Authenticates requests to the configured AI-compatible question provider. | Optional for the app; required for the AI provider path. | The server route returns an unavailable response and the app generates simple questions locally. |
| `AI_API_URL` | The AI-compatible chat-completions endpoint used for question generation. | Optional for the app; required for the AI provider path. | The server route returns an unavailable response and the app generates simple questions locally. |
| `AI_MODEL` | Selects the model sent to the configured AI provider. | Optional for the app; required for the AI provider path. | The server route returns an unavailable response and the app generates simple questions locally. |

The browser sends study notes to `/api/quiz`. The server route adds the provider configuration and authorization header, then returns the provider response. The browser never receives or sends the API key. When the provider is unavailable, times out, returns an error, or returns invalid questions, Crypt Keeper discards that response and uses the built-in simple question generator instead.

**Security note:** Keep `AI_API_KEY` in server-side environment configuration only. Never commit a real key, place a real key in `.env.example`, or expose the key in browser code.

## Scripts

- `npm run dev` — start the Vite development server.
- `npm run build` — create the production build in `dist/`.
- `npm run preview` — serve the production build locally for preview.
- `npm test` — run the Vitest test suite once and exit; it does not watch for changes.

## Structure

- `api/quiz.js` — server-side AI proxy
- `src/logic`, `src/services`, `src/hooks`, `src/components`, `src/screens`
- `tests/unit`, `tests/property`
