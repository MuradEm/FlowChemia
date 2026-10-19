# FlowChemia frontend

React + TypeScript + Vite frontend with login, company selection, employee
home, company setup, survey scheduling, server-issued colleague surveys and participation history. Design and
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
`npm test` runs API-client and demo-state tests covering authenticated
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
default password or public signup. New accounts require a company invitation.

- Sign in with your company account. One active company opens automatically;
  multiple companies show a selector. No membership shows an invitation-required
  state. Switch company refreshes membership and clears the previous company's
  screen before loading another.
- The home page reads your own open assignments and latest participation entries.
  It does not fetch coworker responses, scores, company member lists or reports.
  Owners and HR administrators can open Company setup separately.
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

## Company setup and invitations

Owners and HR administrators see **Company setup** in the workspace sidebar.
This screen uses the existing API; no database migration is required.

1. Choose **Invite a colleague**, enter their work email and select Employee.
   Only an owner can select HR administrator. Create the invitation and copy
   its token before leaving the screen. **No email is sent**: share the token
   privately yourself. Tokens expire after 48 hours, are single use, and cannot
   be retrieved after leaving the screen. There is no invitation list/revoke
   screen yet.
2. New users choose **Accept an invitation** on the sign-in screen and enter
   their token, name, and a password of 12–128 characters. Then they sign in with
   the exact email invited. Existing users sign in first, choose **Switch company
   → Join a company**, and accept with their existing identity; this does not
   change their password. The backend requires the invited account's email.
3. Refresh company setup after someone joins. Create a team such as PLC
   Programmers or Robot Programmers. Dates are optional and entered in the
   browser's local time; a blank start means now and a blank end means ongoing.
4. Select the team and add accepted colleagues as participants. A colleague can
   participate in multiple teams. HR administrators cannot participate or hold
   team responsibilities. Ended teams cannot accept new participants.
5. Assign a manager or team leader. A leader must already participate; a manager
   may manage without participating. Each colleague has one responsibility per
   team, so a new assignment replaces their previous responsibility there.
   Removing a participant preserves history and removes a team leader role;
   a separate manager role stays until explicitly revoked. Removal/revocation
   asks for confirmation.

The company selector also offers **Create a company** for signed-in users,
including an initial account without a company. The creator becomes its owner.
Company setup currently exposes company-wide administration to owners/HR;
the manager's own team management screen will be added separately. The API still
checks every request's permissions. Lists currently have an API limit of 200
colleagues/teams, with a notice when that limit is reached.

Invitation tokens, credentials, and company data remain in memory, never browser
storage or URL parameters. Lost mutation responses are not automatically retried:
refresh and inspect the server state first. For an uncertain invitation acceptance,
try signing in and check memberships, or ask the administrator to check the
colleague list. Creating a team does not generate check-ins or enable a schedule;
open Survey settings to configure or generate a batch.

Browser verification for this feature used a disposable PostgreSQL database and
the real API/Vite proxy: new and existing invitation acceptance, HR restrictions,
overlapping teams, leadership removal and history preservation, role revocation,
company switching, uncertain-response recovery and sign-out. Company setup passed
axe WCAG AA checks and overflow checks at widths 320, 390, 768, 1024 and 1440.

## Survey settings and company-wide generation

Owners and HR administrators can open **Survey settings** from the workspace
sidebar or the Company setup header. This feature uses existing API endpoints;
no backend update or database migration is required.

1. An HR administrator opens the standard question library, reviews the wording,
   and chooses **Approve and add standard questions**. This adds missing standard
   questions/skills with recorded HR approval. Only HR can approve the import;
   the owner cannot bypass this rule. Existing standard questions are preserved.
2. Choose weekly, every two weeks, or monthly; one or two colleague surveys per
   employee; the company timezone; weekday (or monthly day); and local generation
   time. Month days missing in a shorter month use its last day. Adaptive
   selection uses approved active questions and considers existing answers and
   pending assignments. Existing configured fixed question sets are preserved
   unless the administrator explicitly switches to adaptive selection.
3. Save the settings. Automatic generation is optional and starts at the next
   configured boundary. The backend must remain running; its scheduler checks
   due companies every minute. The screen shows the next automatic generation.
4. Choose **Generate surveys for everyone** for the current period, even while
   automation is paused. This is one company-wide batch per period, shared with
   automatic generation. Active participants in active teams are eligible; HR
   is excluded. Overlapping teams do not increase the per-employee limit or
   duplicate a colleague. Employees with too few eligible peers get fewer
   surveys. Anyone with an unanswered survey is blocked across teams.
5. Inspect **Last generation** for surveys created, employees blocked, limited
   peer counts, and the processing time. A processed period disables the manual
   button; repeated or concurrent API requests cannot create another batch.
   Even if employees finish, or new employees join, the next batch waits until
   the next period. An employee who still had an old survey open at the period
   boundary also waits until the next period after finishing it.

Periodic surveys do not expire. The displayed period end controls the next
batch, not the deadline of an existing survey. Five-question surveys keep the
agreed two-minute target and allow Not observed without written answers.

Edits after a batch has been issued normally become pending settings for the
next period; the screen distinguishes current and pending policies. A dedicated
**Pause automatic generation now** action sends only the pause flag, so it can
pause even if the question library has become unusable. Pausing cancels pending
changes and leaves outstanding surveys available. Save or refresh to discard
unsaved edits before manual generation. Failed/uncertain mutation responses
require refresh and inspection, with no automatic retry.

Verification includes API scheduling/adaptive-survey tests, frontend tests for
question readiness and safe pause requests, and real browser/API flows using a
disposable database. Browser checks cover HR import, scheduling, manual generation
across overlapping teams, unanswered-survey blocking, period replay, pending edits,
pause with an invalid library, company switching, employee permissions, uncertain
responses, accessibility and mobile overflow.

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
