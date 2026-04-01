# AGENTS.md

Practical guidance for coding agents working in this repository.
This repo contains two separate Node projects:
- `app/`: Vue 3 + Vite + TypeScript frontend
- `server/`: NestJS + TypeScript + TypeORM backend

## 1) Instruction Sources (Cursor/Copilot)

- Checked for `.cursorrules`: not found.
- Checked for `.cursor/rules/`: not found.
- Checked for `.github/copilot-instructions.md`: not found.
- There is no additional Cursor/Copilot policy file currently committed.
- If those files are added later, treat them as higher-priority repo rules and update this document.

## 2) Repository Layout

- Root is a container, not a single package.
- Run frontend commands in `app/`.
- Run backend commands in `server/`.
- Both subprojects use `npm` and have their own `package-lock.json`.

## 3) Setup and Common Commands

### Install dependencies

- Frontend: `cd app && npm install`
- Backend: `cd server && npm install`

### Frontend (`app/`)

- Dev server: `npm run dev`
- Build: `npm run build`
- Preview built app: `npm run preview`
- Type checking is part of build via `vue-tsc -b`.
- There is currently no dedicated frontend lint script.
- There is currently no frontend test script.

### Backend (`server/`)

- Dev server: `npm run start:dev`
- Dev server with DB init first: `npm run start:dev:init`
- Build: `npm run build`
- Start production build: `npm run start:prod`
- Lint (auto-fix enabled): `npm run lint`
- Format: `npm run format`
- Unit tests: `npm run test`
- Unit tests watch: `npm run test:watch`
- Unit coverage: `npm run test:cov`
- E2E tests: `npm run test:e2e`

### Run a single test (important)

- Single unit test file:
  - `cd server && npm run test -- --runTestsByPath src/app.controller.spec.ts`
- Single unit test by name pattern:
  - `cd server && npm run test -- -t "should return status ok"`
- Single e2e file:
  - `cd server && npm run test:e2e -- --runTestsByPath test/app.e2e-spec.ts`
- Watch one test file:
  - `cd server && npm run test -- --watch src/app.controller.spec.ts`

### Lint without auto-fix (backend)

- Script uses `--fix` by default.
- For check-only lint runs use:
  - `cd server && npx eslint "{src,apps,libs,test}/**/*.ts"`

## 4) Environment Notes

- Frontend API base URL comes from `app/.env`:
  - `VITE_API_BASE_URL=http://127.0.0.1:3000/api`
- Backend env template is `server/.env.example`.
- Backend DB bootstrap script: `server/scripts/init-db.mjs`.
- `DB_RESET=true` during DB init will drop existing tables.

## 5) Code Style - Global

- Language: TypeScript across frontend and backend.
- Indentation: 2 spaces.
- Prefer small, composable functions and explicit names.
- Keep module boundaries clear (`api`, `stores`, `views`, `dto`, `service`, `entity`).
- Avoid unrelated refactors in the same change.
- Preserve existing file-level style; frontend and backend differ slightly.

## 6) Frontend Style (`app/src`)

- Framework style:
  - Vue SFCs with `<script setup lang="ts">`.
  - Composition API (`ref`, `reactive`, `computed`, `watch`) over Options API.
- Imports:
  - Group external packages first, then local modules.
  - Use `import type` for type-only imports.
  - Current code uses relative imports (no path alias configured).
- Formatting conventions in existing frontend code:
  - Single quotes.
  - No semicolons.
  - Trailing commas on multiline literals/args.
- Types:
  - Keep domain models in `src/types/models.ts`.
  - Use narrow unions for domain states (example: `'pink' | 'blue' | 'yellow'`).
  - Prefer typed API wrappers (`request<T>()`) over `any`.
- Naming:
  - Components/views: PascalCase filenames (`LoginPage.vue`, `BottomNav.vue`).
  - Store modules/utils/constants: lower-case file names (`stores/app.ts`, `utils/time.ts`).
  - Variables/functions: camelCase.
  - Route names: kebab-case strings (`schedule-detail`, `customer-new`).
- State and data flow:
  - Use Pinia store (`useAppStore`) as source of truth.
  - Keep network calls in `src/api/*`, not directly in many views.
  - Keep view logic focused on UI state, validation, and routing.
- Error handling:
  - Catch async API failures at store/view boundary.
  - Convert backend error payloads into user-friendly messages.
  - Re-throw when caller should handle (do not silently swallow).
- Styling:
  - Tailwind utility classes plus shared theme variables in `src/style.css`.
  - Existing UI intentionally uses themed gradients and playful visual language; preserve this direction.

## 7) Backend Style (`server/src`)

- Architecture:
  - Follow Nest module structure: `controller` + `service` + `dto` (+ `module`).
  - Controllers should stay thin and delegate business rules to services.
  - Validation belongs in DTOs with `class-validator` and `class-transformer`.
- Imports:
  - Nest/core libs first, third-party libs second, local modules last.
  - Use `import type` where a symbol is type-only.
- Formatting and lint:
  - Prettier config: single quotes + trailing commas.
  - Semicolons are used consistently in backend files.
  - ESLint is type-aware (`recommendedTypeChecked`).
  - `@typescript-eslint/no-explicit-any` is currently disabled, but avoid introducing `any` unless justified.
- Types and DTOs:
  - Prefer enums for domain values (`CustomerType`, `DepositStatus`, `ReminderType`, `ThemeName`).
  - DTO names: `CreateXDto`, `UpdateXDto`, `QueryXDto`.
  - `UpdateXDto` typically extends `PartialType(CreateXDto)`.
- Entity conventions:
  - Entity class names are singular PascalCase (`Customer`, `Schedule`).
  - DB table/column mapping uses snake_case via explicit `name` options.
  - Keep model property names camelCase in TypeScript.
- Error handling:
  - Throw specific Nest HTTP exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`).
  - Use clear, user-facing error messages.
  - Validate resource ownership (`userId`) before mutating records.
- Auth/security patterns:
  - Protected routes use `@UseGuards(JwtAuthGuard)`.
  - Access current user via `@CurrentUser('sub')`.
  - Passwords are hashed/compared with `bcryptjs`.

## 8) Testing Conventions

- Unit test location: `server/src/**/*.spec.ts`.
- E2E test location: `server/test/**/*.e2e-spec.ts`.
- Use Jest `describe`/`it` structure.
- Keep tests deterministic and independent.
- For behavior changes, update or add the nearest module test file.

## 9) Agent Checklist Before Finishing

- Run relevant build/type-check commands for touched project(s).
- Run backend lint/tests when backend code changes.
- For frontend-only changes, at minimum run `app` build.
- Do not commit `.env` secrets.
- Keep changes minimal and consistent with local conventions.
