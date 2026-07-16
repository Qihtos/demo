# Fit Coach

A single-page fitness app that acts as a personal trainer: it tells you exactly what to lift, how many reps, and when, while a progressive-overload engine tracks your history in the background and computes each next prescription.

## Stack

- Vite + React + TypeScript
- Vitest + Testing Library for unit/integration tests
- localStorage-backed persistence (no backend required)

## Project layout

- `src/engine/` — pure TypeScript progression engine (no React dependency)
  - `types.ts` — typed data model (`Exercise`, `SetLog`, `WorkoutSession`, `ProgressionResult`, ...)
  - `math.ts` — Epley 1RM estimation and the adaptive weight/rep prescription algorithm (progression, deload, hold, PR detection)
  - `exercises.ts` — default push/pull/legs exercise catalog
  - `session.ts` — daily session ordering and prescription assembly
  - `index.ts` — public API surface consumed by the UI
- `src/lib/storage.ts` — versioned, corruption-safe localStorage persistence for history, active session, and program cycle position

## Progression algorithm

1. **First-time exercise**: prescribes the exercise's defined starting weight/reps.
2. **Successful session** (all sets hit or exceeded target reps): increases weight by ~2.5% (rounded to the exercise's plate increment), or adds a rep for bodyweight movements.
3. **Missed session** (no sets hit target reps): deloads weight by ~10%.
4. **Partial session**: holds the same weight/reps for another attempt.
5. **Personal records**: every session's best estimated 1RM (Epley formula) is compared against prior history; a new high is flagged as a PR.

## Getting started

```bash
npm install
npm run dev
```

## Verification

The canonical verification command runs the full committed test suite non-interactively and exits non-zero on failure:

```bash
npm test
```
