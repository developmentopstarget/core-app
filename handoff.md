# Goal

Build `core-app` as the main client portal and portfolio app, with reliable frontend E2E test coverage.

## Current State

- Branch: `main`
- Project handoff workflow is committed and pushed.
- Playwright E2E setup was merged through PR #4.
- Frontend CI, backend CI, and Playwright checks passed before merge.
- Frontend has a Chromium Playwright smoke test.
- GitHub Actions runs Playwright E2E checks for frontend changes.

Verified before merge:
- `cd frontend`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Files in Flight

No active files are currently in flight.

Recently changed files:
- `.github/workflows/playwright.yml`
- `frontend/.gitignore`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/playwright.config.ts`
- `frontend/e2e/smoke.e2e.ts`
- `handoff.md`

## Changed This Session

- Added Project Handoff Rule to `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`.
- Created root-level `handoff.md`.
- Added README mention for AI handoff.
- Added Playwright E2E setup.
- Added GitHub Actions workflow for Playwright.
- Fixed Vitest conflict by moving Playwright test from `frontend/tests/smoke.spec.ts` to `frontend/e2e/smoke.e2e.ts`.
- PR #4 checks passed and was merged.

## Failed Attempts

- Initial handoff paste was malformed because the pasted markdown included an unclosed fenced code block inside heredoc content.
- Frontend CI initially failed because Vitest collected the Playwright `.spec.ts` file.
- Fixed by using `frontend/e2e/` and `.e2e.ts` naming for Playwright tests.

## Important Context

- GitHub Actions workflows must live at repo root: `.github/workflows/`.
- Playwright config starts Vite dev server on `127.0.0.1:5173`.
- Playwright tests should use `.e2e.ts` naming to avoid Vitest collection.
- Current E2E scope is minimal smoke coverage only.
- Future AI sessions must update `handoff.md` before stopping, switching tools, clearing context, opening or merging PRs, debugging major issues, or changing deployment/config behavior.
- Do not use `git add .`; stage files explicitly.

## Next Step

Continue core-app feature work from a clean `main` branch.

## Commands to Run First

- `pwd`
- `git branch --show-current`
- `git status`
- `git log --oneline -5`
