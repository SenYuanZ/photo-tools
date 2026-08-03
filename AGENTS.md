# AGENTS.md

Practical guidance for coding agents working in this repository.
Only repo-specific facts that are not obvious from filenames.

## Project Layout

- Two independent Node projects in one repo: `app/` (Vue 3 + Vite + TypeScript frontend) and `server/` (NestJS + TypeScript + TypeORM backend).
- Root is **not** a workspace – run `npm` commands inside each subproject.
- `proto/` contains standalone HTML prototypes, not production code. Ignore it.
- `.qoder/`, `.trae/`, `.opencode/` at root are third-party tool config dirs. Not needed for development.

## Frontend (`app/`)

### Commands
- Dev: `npm run dev` – vite dev server on `0.0.0.0:5173`, opens browser.
- Build: `npm run build` – runs `vue-tsc -b && vite build` (typecheck + build).
- No frontend lint or test scripts exist.

### API Layer
- Uses bare `fetch`, **not** axios. The `request<T>()` wrapper is in `src/api/http.ts`.
- Image uploads use `XMLHttpRequest` (for progress tracking), not `fetch`. See `uploadReferenceImage` in `src/api/app.ts`.
- Auth token is stored in `localStorage` under key `photo_order_token`.
- API base is `VITE_API_BASE_URL` from `app/.env` (defaults to `/api`).
- Vite dev server proxies `/api` and `/uploads` to `http://127.0.0.1:3000`. Override with `VITE_DEV_API_PROXY_TARGET`.

### Key Dependencies
- UI: Vant 4 (mobile components), Font Awesome Free (icons), Tailwind CSS.
- State: Pinia 3.
- Date: dayjs.

### Style Conventions
- `<script setup lang="ts">` with Composition API. Single quotes, no semicolons, trailing commas on multiline.
- Component files: PascalCase. Store/util/type files: lower-case.
- Route names: kebab-case strings.
- `import type` for type-only imports. No path aliases – use relative imports.
- Frontend TS has `erasableSyntaxOnly: true` – no enums, no parameter properties, no decorators.
- Theming uses CSS custom properties (`--theme-accent`, etc.) driven by `<html data-theme>` attribute.

## Backend (`server/`)

### Commands
- Dev with DB init: `npm run start:dev:init` (runs `db:init` then `nest start --watch`).
- Dev without init: `npm run start:dev`.
- Lint (auto-fix): `npm run lint`.
- Lint check-only: `npx eslint "{src,apps,libs,test}/**/*.ts"` (the script includes `--fix` by default).
- Format: `npm run format` (Prettier).
- Single unit test: `npm run test -- --runTestsByPath src/app.controller.spec.ts`.
- Single e2e test: `npm run test:e2e -- --runTestsByPath test/app.e2e-spec.ts`.

### Database
- MySQL via TypeORM with `synchronize: true` – schema auto-syncs on every start. No migrations.
- Init script: `server/scripts/init-db.mjs`. Set `DB_RESET=true` to drop all tables first.
- `.env.local` overrides `.env` (checked in `ConfigModule.forRoot`).
- Seed data auto-applies on bootstrap via `SeedService` (implements `OnApplicationBootstrap`).
- Default seed accounts: `lina_photo / 123456` (photographer, nickname 林娜摄影), `momo_makeup / 123456` (makeup artist, nickname 默默妆造).
- Invite codes for registration: `PHOTO2026`, `STUDIO888`.

### Architecture
- NestJS module pattern: `module` + `controller` + `service` + `dto` per domain.
- All routes are prefixed with `/api` (set in `main.ts` via `setGlobalPrefix('api')`).
- Static files served from `uploads/` at `/uploads/`. Directory is gitignored.
- Public (no-auth) endpoints under `/api/public/*`: provider listing, availability, booking, order query.
- Protected routes use `@UseGuards(JwtAuthGuard)`; access user via `@CurrentUser('sub')`.
- Global `ValidationPipe`: `whitelist: true`, `transform: true`, `enableImplicitConversion: true`.
- CORS trusts private network origins by regex; extend with `CORS_ORIGINS` env var (comma-separated).
- ESLint: `sourceType: 'commonjs'`, `@typescript-eslint/no-explicit-any: 'off'` (avoid `any` anyway).
- Prettier config: single quotes, trailing commas. Semicolons use Prettier default (enabled).
- ESLint enforces Prettier with `endOfLine: 'auto'` (avoids CRLF/LF issues on Windows).
- TypeScript: `noImplicitAny: false`, `strictNullChecks: true`.
- Image processing: `sharp` for thumbnails on upload.

### Testing
- Unit: `src/**/*.spec.ts` (Jest, ts-jest). E2E: `test/**/*.e2e-spec.ts` (jest config at `test/jest-e2e.json`).
- For behavior changes, update the nearest module test file.

## Checklist Before Finishing

- Run `app` build when frontend changes (`npm run build` in `app/`).
- Run `server` lint + tests when backend changes (`npm run lint && npm run test` in `server/`).
- Do not commit `.env` secrets or `uploads/` files.
