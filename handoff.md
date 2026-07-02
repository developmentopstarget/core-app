# Goal

Build `core-app` as the main client portal and portfolio app.

The app should include:
- public landing/portfolio pages
- user registration and login
- client dashboard
- project/progress visibility for customers
- admin/project management workflows
- production-ready React + FastAPI structure

## Current State

- Project: `core-app`
- Stack: React + TypeScript frontend, FastAPI backend
- Repo owner/account: `developmentopstarget`
- Active AI instruction files:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `GEMINI.md`
- Handoff workflow is now required in this project.

Current branch and git status must be verified before editing:

```bash
git branch --show-current
git status
```

Known project context:
- `core-app` was created from `fast-webapp-starter`.
- It is the active main app.
- It is intended to become the real client portal and portfolio site.
- Use React + FastAPI as the default stack.
- Keep code production-ready, maintainable, and mobile-first.

## Files in Flight

No active files are confirmed yet.

Likely important files/directories:
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `handoff.md`
- `frontend/`
- `backend/`
- Docker/deployment config files
- test files

## Changed This Session

- Added the Project Handoff Rule to the project AI instruction files:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `GEMINI.md`
- Created this root-level `handoff.md`.
- Added the Project Handoff System note in Obsidian/AI-OS.

## Failed Attempts

None recorded for this handoff setup.

## Important Context

- Every AI coding session must update `handoff.md` before stopping, running `/clear`, switching AI tools, opening/merging PRs, debugging major issues, or changing deployment/config behavior.
- `handoff.md` should capture only the current useful project state.
- Do not rely only on `/compact` for Claude Code session continuity.
- Fresh AI sessions should read the relevant AI instruction file and `handoff.md`, then run `git status` before editing.
- Correct Gemini filename is `GEMINI.md`.
- Avoid typo files such as:
  - `GIMINI.md`
  - `GEMENI.md`
  - `AGENT.md`

## Next Step

Verify filenames and git state, then continue the current `core-app` work from a clean branch.

## Commands to Run First

```bash
pwd
git branch --show-current
git status
ls -la | grep -E 'AGENT|CLAUDE|GEM|handoff'
```
