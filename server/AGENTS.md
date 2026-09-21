# Repository Guidelines

## Service Structure

This directory is the NestJS backend for the photo-order application. Domain code lives under `src/<domain>/`; keep each feature's `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `dto/` together. Shared guards, decorators, enums, interfaces, and utilities belong in `src/common/`. TypeORM entities and bootstrap seed logic are in `src/database/`. Operational scripts live in `scripts/`, while Supertest suites live in `test/`.

All application routes use the `/api` prefix. Uploaded files are served from `uploads/` at `/uploads/`. Keep public booking behavior in `public-booking/`; authenticated endpoints should use `JwtAuthGuard` and read the current user through `@CurrentUser()`.

## Setup and Commands

Use Node.js with the committed `package-lock.json`:

- `npm ci`: install exact dependencies.
- `npm run start:dev:init`: initialize MySQL, then start Nest in watch mode.
- `npm run start:dev`: start watch mode without database initialization.
- `npm run build`: compile production output to `dist/`.
- `npm run lint`: run ESLint with automatic fixes.
- `npm run format`: format `src/**/*.ts` and `test/**/*.ts` with Prettier.
- `npm test`: run unit tests; add `-- --runTestsByPath <file>` for one suite.
- `npm run test:e2e`: run Supertest e2e tests.
- `npm run test:cov`: generate Jest coverage in `coverage/`.

## Coding Conventions

Use two-space indentation, single quotes, semicolons, and trailing commas. Follow Nest dependency injection rather than constructing services manually. Name classes in PascalCase, variables and methods in camelCase, and files in kebab-case with Nest suffixes. Validate request data with DTO classes and `class-validator`; the global `ValidationPipe` strips unknown fields and performs type conversion. Avoid `any` even though the current ESLint and TypeScript settings permit it.

## Database and Configuration

Copy `.env.example` to `.env`; `.env.local` takes precedence. Never commit secrets or real credentials. TypeORM currently uses `synchronize: true`, so entity changes alter the schema at startup; review them carefully and describe schema impact in the pull request. `SeedService` runs during application bootstrap. Set `DB_RESET=true` only when intentionally rebuilding local tables through `npm run db:init`.

## Testing and Contributions

Place unit tests beside source as `*.spec.ts` and e2e tests in `test/` as `*.e2e-spec.ts`. Cover validation, authorization, ownership boundaries, and service behavior for changed endpoints. Before submitting, run `npm run lint`, `npm test`, and `npm run build`; run e2e tests when API or database behavior changes.

Use Conventional Commits consistent with repository history, such as `feat(schedules): 添加排单暂存` or `fix(auth): 修正令牌校验`. Pull requests must summarize behavior, identify API or schema changes, link the issue, and list verification commands.
