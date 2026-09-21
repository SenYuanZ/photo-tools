# Repository Guidelines

## Project Structure & Module Organization

The root is not an npm workspace; run commands from the relevant project directory.

- `app/`: Vue 3/Vite mobile frontend. Pages are in `src/views/`, shared UI in `src/components/`, domain API clients in `src/api/<domain>/`, shared stores/hooks in `src/stores/` and `src/hooks/`, and assets in `src/assets/` or `public/`.
- `server/`: NestJS and TypeORM/MySQL API. Domains under `src/` group modules, controllers, services, and `dto/`; e2e tests are in `test/`.
- `photo-agent/`: NestJS photography Q&A service with a static client in `public/`. Follow its nested `AGENTS.md` for service-specific details.
- `proto/`: standalone HTML design prototypes, not production application code.

## Build, Test, and Development Commands

Run `npm ci` in each project before development.

- `cd app; npm run dev`: start Vite on port 5173.
- `cd app; npm run build`: type-check and create the production bundle.
- `cd app; npm run lint`: check Vue/TypeScript lint rules.
- `cd app; npm run format:check`: verify Prettier formatting.
- `cd app; npm run test:run`: run frontend unit tests.
- `cd server; npm run start:dev:init`: initialize the database, then start Nest in watch mode.
- `cd server; npm run build`: compile the API to `dist/`.
- `cd server; npm run lint` / `npm run format`: run ESLint and Prettier.
- `cd server; npm test` / `npm run test:e2e`: run unit or e2e suites; use `npm run test:cov` for coverage.
- `cd photo-agent; npm run start:dev` / `npm run build`: develop or compile the AI service.

## Coding Style & Naming Conventions

Use two-space indentation and TypeScript. Vue files use `<script setup lang="ts">`, Composition API, single quotes, no semicolons, and PascalCase names such as `ScheduleCard.vue`. Use camelCase identifiers and `import type` for types. Backend files follow Nest patterns (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts`) and Prettier: single quotes, semicolons, and trailing commas.

## Testing Guidelines

Name backend unit tests `*.spec.ts` and e2e tests `*.e2e-spec.ts`. Frontend unit tests use Vitest and live beside shared API/core, hook, utility, or store modules. Add tests near the changed module; no coverage threshold is enforced.

## Commit & Pull Request Guidelines

History follows Conventional Commits with concise Chinese summaries, for example `feat(calendar): 新增日历页面`. Use `feat`, `fix`, `refactor`, or `style` with an optional scope. Pull requests should describe behavior changes, list verification, link the issue, and include mobile screenshots for UI changes. Highlight database, environment, or API-contract changes.

## Security & Configuration

Never commit `.env` files, credentials, generated `dist/`, uploads, or runtime storage. Start from the provided `.env.example` files and document any new variables there with safe placeholder values.
