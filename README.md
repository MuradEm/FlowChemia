# FlowChemia frontend

Minimal React + TypeScript + Vite development environment. Product screens,
authentication and API integration will be built together with the product
owner. The current page is only a placeholder.

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

```sh
npm run typecheck
npm run build
npm run preview
```

`build` checks TypeScript and writes production assets to `dist/`. `preview`
serves that build on port 4173. It is a local build check, not a deployment.
Both servers bind to loopback and fail if their port is already occupied.
There are no application tests yet because no product behavior is implemented.

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
