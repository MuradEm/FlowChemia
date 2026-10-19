# FlowChemia frontend

React + TypeScript + Vite frontend. The first screen is an employee home with
pending colleague check-ins, participation history and a working demo survey
flow. Design and application behavior are developed together with the product
owner. Login and backend integration are not implemented yet.

## Requirements

- Node.js 24 (with nvm: `nvm install && nvm use`)
- npm, included with Node.js

## Start developing

```sh
npm ci
npm run dev
```

The development server uses port 5173. It supports React Fast Refresh when you
edit files. Start with `src/App.tsx`; global styles are in `src/styles.css`.

On Windows PowerShell, use `npm.cmd ci` and `npm.cmd run dev` if the system
blocks the `npm.ps1` script; no execution-policy change is required.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` checks TypeScript and writes production assets to `dist/`. `preview`
serves that build on port 4173. It is a local build check, not a deployment.
Both servers bind to loopback and fail if their port is already occupied.
`npm test` runs three state tests covering progress restoration, final outcomes,
colleague replacement and exhausted alternatives. GitHub Actions runs these
tests and the production build. Desktop/mobile flows were also checked in
Chromium, with an automated accessibility scan of the overview and survey.

## Employee home demo

The page uses your design kit's logo, light theme and teal/cyan/amber palette.
It shows a sample employee, fictional company and two pending colleague
surveys. The sidebar links jump to the overview, check-ins and participation.

- Start a check-in to answer five rating questions: three skills, enjoyment
  and collaboration effectiveness. Each accepts 1–5 or explicit Not observed.
- All five questions must be answered before completion. There is no countdown
  or deadline; the two-minute label is a design target.
- Skip has a confirmation step and shows the agreed 60% participation credit;
  completion shows 100%. These are sample participation percentages, not
  employee performance scores or real company reward points.
- Try another colleague keeps the original assignment slot, excludes previously
  used sample colleagues and supplies no credit until an outcome. When no
  colleague remains, it closes the sample slot without awarding credit.
- Completing/skipping the two assignments reveals an all-caught-up state.
  Reset demo restores the original examples.

The page is explicitly labeled Demo data. **No API requests are made.**
Only assignment statuses and replacement history persist in this browser's
local storage under `flowchemia.employee-home.demo.v1`. Actual selected ratings
are not stored or sent anywhere; closing a survey discards them. Reset clears
the sample progress. If browser storage is unavailable, progress is kept only
until reload, with an on-screen notice.

`src/demo.ts` is an isolated sample-data/state module. Its fixed sample
questions are not the production allocator. When wiring authentication and
the real API, use the exact questions returned by assignment detail and the
server's authoritative outcomes, permissions and participation credit.

## API development

The placeholder works without the backend. When developing API-backed screens,
start the sibling FlowChemia-API repository separately, following its README.
During `npm run dev`, requests to `/api/...` proxy to the backend on port 3001,
with `/api` removed. For example, `/api/health` forwards to `/health`.

To change the development backend target, copy `.env.example` to `.env.local`,
edit `FLOWCHEMIA_API_TARGET`, and restart the dev server. This setting is used
only by the development proxy. Production API routing is not configured yet.
Never put secrets in variables prefixed with `VITE_`: Vite exposes them to the
browser. Local environment files are ignored by Git.

## Design references

`design-kit/` preserves the uploaded logos, screen references, JSON tokens,
CSS tokens and design guide. The CSS tokens are imported by `src/main.tsx`.
Inter is the preferred font; no font files or external font service have been
added, so the supplied fallback stack applies when Inter is unavailable.

The kit guides appearance. Product decisions from our discussion take
precedence over its earlier examples: raw skill/chemistry scores stay internal;
the frontend will use qualitative indicators, directional experiences and
clear limited-feedback/no-history states. Layouts and features will be designed
together rather than copied wholesale from the reference images.

## GitHub workflow

Repository: https://github.com/MuradEm/FlowChemia

Commit source files, the lockfile and design references. Do not commit
`node_modules/`, `dist/` or local environment files. After a clone or pull,
use `npm ci` to install exactly the locked dependencies. GitHub Actions runs
type checking and the build for pushes and pull requests.

## Codex cloud workspace

Use the existing `/workspace/FlowChemia` checkout. Cloud tasks are isolated;
do not create a worktree unless requested. In this cloud environment, use
`npm ci --cache /workspace/.npm-cache` because the home-directory npm cache
is not writable. Start `npm run dev` in a persistent terminal session when
needed; running processes must be restarted after the environment is restored.
