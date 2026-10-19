# FlowChemia frontend

React + TypeScript + Vite frontend with login, company selection, employee
home, server-issued colleague surveys and participation history. Design and
application behavior are developed together with the product owner. A separate,
explicit demo remains available for design review without the backend.

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
`npm test` runs eleven API-client and demo-state tests covering authenticated
requests, exact question IDs/null answers, failures, cancellation, no automatic
mutation retry, progress restoration and replacement. GitHub Actions runs these
tests and the production build. Real browser flows were also checked against a
disposable PostgreSQL/API instance, including desktop/mobile accessibility.

## Login and real check-ins

The initial screen is login. Start the sibling
[FlowChemia-API](https://github.com/MuradEm/FlowChemia-API) backend and its
database before signing in. Follow its
[Windows/local setup guide](https://github.com/MuradEm/FlowChemia-API/blob/main/docs/local-frontend.md)
to provision the first account and company on a fresh database. There is no
default password, public signup, or account creation in this frontend.

- Sign in with your company account. One active company opens automatically;
  multiple companies show a selector. No membership shows an invitation-required
  state. Switch company refreshes membership and clears the previous company's
  screen before loading another.
- The home page reads your own open assignments and latest participation entries.
  It does not fetch coworker responses, scores, company member lists or reports.
  Participation counts describe recent credit entries (the API returns up to
  200), while open check-ins reflect the current actionable list.
- Opening a survey fetches its exact assigned question IDs, wording, order,
  question count and deadline. Older shorter surveys remain supported; the
  browser never replaces the server's questions with demo questions.
- Submit, skip and colleague replacement call their authenticated endpoints.
  Participation credit is displayed from the API, not minted by the browser.
  Inactive-colleague assignments provide replacement rather than invalid rating
  or skip actions. Milestones show their actual deadline; periodic surveys have
  no expiry.
- Loading, failed connections and empty results are different states. Real mode
  never falls back to sample data. Refresh updates the list and history.
- Pending actions disable repeated clicks. A lost/failed mutation response is
  not automatically retried; refresh the list to confirm the result first.
  Closing a survey discards unsent choices. Submitted answers are stored by the
  backend and cannot be edited through this screen.
- Session tokens and real company/feedback data stay in memory. Reloading the
  page requires signing in again. Session expiry returns to login; Sign out
  revokes the current server session and immediately clears the local screen.
  If server logout fails, local sign-out still completes with an accurate notice.

`src/api.ts` is the typed same-origin API client. `AccountWorkspace.tsx` handles
profile/company selection, `LiveWorkspace.tsx` handles current server state,
`EmployeeHome.tsx` renders the shared view, and `SurveyDialog.tsx` renders the
assigned survey. The API enforces all company/assignment permissions.

## Employee home demo

Choose **Explore the demo** on login. The page uses your design kit's logo,
light theme and teal/cyan/amber palette.
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

The demo page is explicitly labeled Demo data. **No API requests are made in demo mode.**
Only assignment statuses and replacement history persist in this browser's
local storage under `flowchemia.employee-home.demo.v1`. Actual selected ratings
are not stored or sent anywhere; closing a survey discards them. Reset clears
the sample progress. If browser storage is unavailable, progress is kept only
until reload, with an on-screen notice.

`src/demo.ts` and `src/DemoWorkspace.tsx` are isolated sample-data/state modules.
Their fixed sample questions are not the production allocator and are never
used in real mode.

## API development

The demo works without the backend. For real login and surveys,
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
tests, type checking and the build for pushes and pull requests.

## Codex cloud workspace

Use the existing `/workspace/FlowChemia` checkout. Cloud tasks are isolated;
do not create a worktree unless requested. In this cloud environment, use
`npm ci --cache /workspace/.npm-cache` because the home-directory npm cache
is not writable. Start `npm run dev` in a persistent terminal session when
needed; running processes must be restarted after the environment is restored.
