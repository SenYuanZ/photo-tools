# Repository Guidelines

## Frontend Structure

Each route screen belongs in `src/views/<feature>/index.vue`; page-only UI goes in local `components/`, and page workflows go in `hooks/`. Shared UI belongs in `src/components/`. API domains live in `src/api/<domain>/index.ts` with adjacent `types.ts`; `src/api/core/` owns fetch, errors, query serialization, auth, and uploads. Shared Pinia domains live in `src/stores/`, cross-page composables in `src/hooks/`, and pure helpers in `src/utils/`. Use `src/assets/` for imports and `public/` for unchanged files.

Routes are declared in `src/router/index.ts` and loaded lazily. Use kebab-case names and set route metadata consistently.

## Setup and Commands

Use the committed lockfile and run commands from this directory:

- `npm ci`: install dependencies.
- `npm run dev`: start Vite on `0.0.0.0:5173` and open the app.
- `npm run build`: run `vue-tsc -b`, then create the production bundle.
- `npm run preview`: serve the built bundle for final verification.
- `npm run lint` / `npm run lint:fix`: check or fix ESLint rules for Vue and TypeScript.
- `npm run format:check` / `npm run format`: check or apply Prettier formatting.
- `npm run test:run` / `npm run test:coverage`: run Vitest once or with V8 coverage.

Run commands from `app/`; commit the updated `package-lock.json` when dependencies change.

## Coding Style and Naming

Use two-space indentation, single quotes, no semicolons, and trailing commas on multiline structures. Write components with `<script setup lang="ts">` and the Composition API. Component filenames use PascalCase, such as `ScheduleCard.vue`; variables, composables, and store actions use camelCase. Use the `@/` alias for all `src` imports and prefer `import type` for type-only dependencies.

Keep `index.vue` as a composition layer. Extract visual sections to local components and page behavior to named hooks such as `hooks/useModelBooking.ts`; avoid empty folders and one-line wrappers.

TypeScript is strict and enables `erasableSyntaxOnly`; avoid enums, parameter properties, and decorators. Keep API payload and response types explicit rather than casting around mismatches.

## State, API, and Styling

Use `src/api/core/client.ts` for JSON requests and `src/api/core/upload.ts` for progress uploads instead of duplicating authentication or error handling. API methods belong to the matching domain directory and must keep explicit request/response types. The JWT is stored as `photo_order_token`; 401 handling is registered once in `main.ts`. Keep shared server state in domain Pinia stores and local-only UI state in components or page hooks.

Vite proxies `/api` and `/uploads` to the main backend and `/aiapi` to the AI service. Override targets with `VITE_DEV_API_PROXY_TARGET` and `VITE_DEV_AI_PROXY_TARGET`. Frontend `VITE_*` values are public; never place secrets in them.

Build mobile-first interfaces with Vant and existing Tailwind/CSS utilities. Reuse theme variables from `src/style.css`, preserve the 760px content width and safe-area spacing, and check all supported themes.

## Verification and Contributions

For every change, run `npm run format:check`, `npm run lint`, `npm run test:run`, and `npm run build`; manually verify the affected flow at mobile and desktop widths. Check loading, empty, error, authentication, upload, and navigation states; include screenshots for visual changes.

Use Conventional Commits, for example `feat(calendar): 新增日历功能` or `fix(ai-qa): 修正图片预览`. Pull requests should summarize behavior, identify API-contract or environment changes, link the issue, and list verification performed.
