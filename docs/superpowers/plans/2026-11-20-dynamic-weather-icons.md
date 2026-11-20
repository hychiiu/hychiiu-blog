# Dynamic Weather Dock Icons Implementation Plan

> Artwork and asset hashes below are historical for the first implementation. The owner subsequently approved the UI-designer v2 half-sun/full-moon set. Its sole current source, replacement plan and evidence are in `2026-11-20-ui-designer-v2-artwork.md`; behavior/controller work below remains current.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Show the approved v2 weather glyph for the latest successfully acquired city without expanding location or network behavior.
**Architecture:** A Dock-only vector renderer consumes the existing weather condition category. A small in-memory presentation object synchronizes icon plus both localized labels; controller hooks run only after guarded success/failure and after navigation. Existing fetch/cache, location and theme code are unchanged.
**Tech Stack:** Astro, TypeScript, native DOM, existing Node test runner and LinkeDOM.

## Global Constraints

No push/deploy/comments. No geolocation, permissions, theme, navigation or article-return changes. Use exact approved SVG paths, 24 viewBox / 1.5 round / currentColor / 20px display. No API or dependency additions, polling, fake Issues or production demo route. Keep 4388 untouched; preview this worktree at 4389.

---

### Task 1: Exact approved vector renderer

Files: create src/scripts/weather/dock-icons.ts, tests/fixtures/weather-dock-v2.json, tests/weather-dock-icons.test.mjs.
Interface: `dockWeatherIcon(icon: WeatherIcon = 'unknown'): string`; existing WeatherIcon categories map sun→clear-day, moon→clear-night, cloud→overcast, unknown→unavailable.

- [x] Extract first nine unique 1.5px glyph bodies from approved overview-v2, excluding alternate. Assert clear-day/night occur identically in context-v2. Copy portable fixture with provenance/hash.
- [x] Add failing tests comparing rendered inner SVG to canonical fixture; 24 viewBox, 1.5 round, currentColor and no theme path equality. Cover every existing condition code category and unknown.
- [x] Run `node --test tests/weather-dock-icons.test.mjs`, expect missing renderer failure; implement renderer containing the exact extracted bodies; rerun to green.

### Task 2: Presentation state integrated with real controller

Files: create src/scripts/weather/dock-state.ts, tests/weather-dock-state.test.mjs; modify src/scripts/weather/controller.ts, src/components/Dock.astro, tests/weather-controller.test.mjs, tests/weather-integration.test.mjs.
Interfaces: `createWeatherDock(document): {success(place: Place, weather: Weather): void; failed(): void; sync(): void}`. Snapshot stays only in this object; no request/storage/timer API.

- [x] Add failing DOM tests for neutral init, latest successful city/code/day, bilingual aria and tooltip, pending retains old pair, failure neutral, retry, navigation/locale persistence, canceled/out-of-order success ignored, cache reopen and expiry using existing real service with controlled clock.
- [x] Run `node --test tests/weather-dock-state.test.mjs`, observe feature missing.
- [x] Implement presentation object using `condition`, Dock renderer, both data-label-* values, active aria-label and per-item tooltip; refresh existing outer floating tooltip. Controller: instantiate once, call success after ticket/open checks; failed after same guard; sync after swap. Leave locate() and existing request/cache code untouched.
- [x] Initial Astro icon becomes neutral via `dockWeatherIcon()`; no theme or navigation edits. Replace only superseded fixed-icon assertions, retaining theme distinction and exact v2 constraints.
- [x] Run new/updated and Router-first tests to green; inspect diff for scope.

### Task 3: Documentation, full verification, local review

Files: modify docs/DESIGN.md and prior spec to explicitly mark fixed-icon decision superseded; this spec/plan describe the conservative behavior.

- [x] Self-review against approved spec: all paths, states, non-goals and lifecycle requirements have tests; no placeholders or signature contradictions.
- [x] Run `npm test && npm run format:check && npm run lint && npm run check && npm run build && git diff --check`; confirm success before local commit.
- [x] Compare theme component, locate() function, service/cache, navigation and article-return files to origin/main byte-for-byte or scoped diff; they must remain unchanged.
- [x] Commit locally only, start preview at http://localhost:4389/ and leave running. Supply real city search URL, served asset hash and exact browser matrix. Await independent review/browser acceptance; do not publish.

## Plan self-review

Artwork source/version ambiguity resolved by authoritative v2 SVG extraction, not the older render.py. Neutral SSR and reload, guarded controller success/failure, paired city labels, no timer, original cache TTL and locale synchronization are assigned to Tasks 1–2; privacy and theme/location non-goals are checked in Task 3. No API signature mismatches or unassigned requirements identified. Execution proceeds inline as explicitly requested; no repeated user approval required.

## Execution evidence / review handoff

- Isolated worktree `/workspace/hychiiu-blog-weather-icons`, branch `feat/dynamic-weather-icons`, baseline live `origin/main` = `023e03909df09af4de3dad4e3259906cdf9a514c`. Other worktrees and port 4388 are unchanged.
- Exact renderer tests initially failed because the new module did not exist, then all 12 passed. Real controller/state tests initially had seven missing-dynamic-behavior assertion failures, then all eight passed. Three historical fixed-icon assertions were updated to the approved v2 decision while retaining distinctness and unchanged panel checks.
- Full suite: 106/106; format:check, lint, check, build, diff check passed. Check retains only the original ESLint configuration deprecation hint; build retains existing empty notes / large chunk notices. Dependency audit remains 13 pre-existing items; no dependency changes.
- Controller change is six added integration lines only (including import/instantiation); `locate()` is byte-identical (SHA256 `c5e52f1961f66ba825d80b348a263ccdd3db0c6d9dea01b4b6195896137f35a1`). Theme Icon.astro and theme calls, weather API/cache/entrypoint, Dock navigation/motion/styles, article return/layout and content data are unchanged. The new presentation snapshot contains only name, code and isDay, no coordinates.
- HTTP previews: `http://localhost:4389/`, `/en/`, `/posts/`, `/en/posts/`, `/posts/claude-vm-vps/` all 200. Use weather → manual city search → 北京 / London for real network data. This is an independent Astro preview, not a substitute fixture.
- Optional all-state visual gallery: `http://localhost:4390/`, generated from the real renderer and original theme paths. Its heading explicitly marks simulated/non-real weather; file `.local/icon-review/index.html` is gitignored, served separately and absent from production build. It is not an Issue or production route.
- Served bundle `/_astro/Dock.astro_astro_type_script_index_0_lang.BnIe1Ea1.js` matches local build bytes, SHA256 `06b2e56ea73082fdc03051008291a06b74cadda0d9334c07867e3572f4435182`.
- Evidence: `.local/review-evidence.json`; full validation log `/home/box/.cursor/projects/workspace/terminals/982158.txt`. Final branch is kept locally for parent review. No push, deployment, PR or comments.
- Independent review and browser acceptance are still pending: desktop and 320/360/390 mobile, Chinese/English and light/dark, actual 20px geometry, theme distinction, real searches by button/Enter, success/pending/failure/retry, cache reopen/expiry, persisted Dock locale text, external floating tooltip and keyboard/ESC, no eager requests, article language/back navigation. No browser pass is claimed here.
