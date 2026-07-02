# Goal

Build `core-app` as the main client portal and portfolio app, with reliable frontend E2E test coverage.

## Current State

- Branch: `setup/playwright-e2e`
- Pull request: https://github.com/developmentopstarget/core-app/pull/4
- Playwright E2E setup has been added on this branch.
- Playwright workflow passed.
- Frontend CI initially failed because Vitest collected the Playwright `.spec.ts` file.
- Fix is to keep Playwright tests under `frontend/e2e/` with `.e2e.ts` naming.

Verified commands after fix:
- `cd frontend`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Files in Flight

- `.github/workflows/playwright.yml`
- `frontend/.gitignore`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/playwright.config.ts`
- `frontend/e2e/smoke.e2e.ts`
- `handoff.md`

## Changed This Session

- Created branch `setup/playwright-e2e`.
- Added Playwright dependency and frontend scripts.
- Added Vite-compatible Playwright config.
- Added root GitHub Actions workflow for Playwright.
- Added Chromium smoke test.
- Opened PR #4 from `setup/playwright-e2e` into `main`.
- Fixed Vitest conflict by moving Playwright smoke test from `frontend/tests/smoke.spec.ts` to `frontend/e2e/smoke.e2e.ts`.

## Failed Attempts

- Initial handoff paste was malformed because the pasted markdown included an unclosed fenced code block inside heredoc content.
- CI frontend failed because Vitest collected the Playwright test file named `smoke.spec.ts`.

## Important Context

- GitHub Actions workflows must live at repo root: `.github/workflows/`.
- Playwright config starts Vite dev server on `127.0.0.1:5173`.
- Playwright tests should use `.e2e.ts` naming to avoid Vitest collection.
- Current E2E scope is minimal smoke coverage only.
- The PR already exists. New commits pushed to this branch will update PR #4 automatically.
- Do not use `git add .`; stage files explicitly.

## Next Step

Push the Vitest/Playwright test separation fix, then re-check PR #4 CI.

## Commands to Run First

- `pwd`
- `git branch --show-current`
- `git status`
- `git log --oneline -3`
