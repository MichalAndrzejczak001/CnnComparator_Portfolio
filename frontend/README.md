# CnnComparator — frontend

React + TypeScript SPA for CnnComparator. See the [repository root README](../README.md) for
the full project overview, architecture, and instructions to run the whole stack.

## Local development

```bash
npm install
npm run dev
```

This starts the Vite dev server, which proxies `/auth` and `/experiments` requests to
`logic-backend` (see `vite.config.ts` — target defaults to `http://localhost:8080`, override
with the `BACKEND_URL` env var).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Lint with Oxlint |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Cypress) — requires the dev server running |
