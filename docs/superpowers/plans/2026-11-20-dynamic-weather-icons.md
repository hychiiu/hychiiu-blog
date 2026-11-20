# Dynamic Weather Dock Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the approved v2 weather glyph for the latest successfully acquired city without expanding location or network behavior.
**Architecture:** A Dock-only vector renderer consumes the existing weather condition category. A small in-memory presentation object synchronizes icon plus both localized labels; controller hooks run only after guarded success/failure and after navigation. Existing fetch/cache, location and theme code are unchanged.
**Tech Stack:** Astro, TypeScript, native DOM, existing Node test runner and LinkeDOM.

## Global Constraints

No push/deploy/comments. No geolocation, permissions, theme, navigation or article-return changes. Use exact approved SVG paths, 24 viewBox / 1.5 round / currentColor / 20px display. No API or dependency additions, polling, fake Issues or production demo route. Keep 4388 untouched; preview this worktree at 4389.

---

### Task 1: Exact approved vector renderer

Files: create src/scripts/weather/dock-icons.ts, tests/fixtures/weather-dock-v2.json, tests/weather-dock-icons.test.mjs.
Interface: `dockWeatherIcon(icon: WeatherIcon = 'unknown'): string`; existing WeatherIcon categories map sun→clear-day, moon→clear-night, cloud→overcast, unknown→unavailable.

- [ ] Extract first nine unique 1.5px glyph bodies from approved overview-v2, excluding alternate. Assert clear-day/night occur identically in context-v2. Copy portable fixture with provenance/hash.
- [ ] Add failing tests comparing rendered inner SVG to canonical fixture; 24 viewBox, 1.5 round, currentColor and no theme path equality. Cover every existing condition code category and unknown.
- [ ] Run `node --test tests/weather-dock-icons.test.mjs`, expect missing renderer failure; implement renderer containing the exact extracted bodies; rerun to green.

### Task 2: Presentation state integrated with real controller

Files: create src/scripts/weather/dock-state.ts, tests/weather-dock-state.test.mjs; modify src/scripts/weather/controller.ts, src/components/Dock.astro, tests/weather-controller.test.mjs, tests/weather-integration.test.mjs.
Interfaces: `createWeatherDock(document): {success(place: Place, weather: Weather): void; failed(): void; sync(): void}`. Snapshot stays only in this object; no request/storage/timer API.

- [ ] Add failing DOM tests for neutral init, latest successful city/code/day, bilingual aria and tooltip, pending retains old pair, failure neutral, retry, navigation/locale persistence, canceled/out-of-order success ignored, cache reopen and expiry using existing real service with controlled clock.
- [ ] Run `node --test tests/weather-dock-state.test.mjs`, observe feature missing.
- [ ] Implement presentation object using `condition`, Dock renderer, both data-label-* values, active aria-label and per-item tooltip; refresh existing outer floating tooltip. Controller: instantiate once, call success after ticket/open checks; failed after same guard; sync after swap. Leave locate() and existing request/cache code untouched.
- [ ] Initial Astro icon becomes neutral via `dockWeatherIcon()`; no theme or navigation edits. Replace only superseded fixed-icon assertions, retaining theme distinction and exact v2 constraints.
- [ ] Run new/updated and Router-first tests to green; inspect diff for scope.

### Task 3: Documentation, full verification, local review

Files: modify docs/DESIGN.md and prior spec to explicitly mark fixed-icon decision superseded; this spec/plan describe the conservative behavior.

- [ ] Self-review against approved spec: all paths, states, non-goals and lifecycle requirements have tests; no placeholders or signature contradictions.
- [ ] Run `npm test && npm run format:check && npm run lint && npm run check && npm run build && git diff --check`; confirm success before local commit.
- [ ] Compare theme component, locate() function, service/cache, navigation and article-return files to origin/main byte-for-byte or scoped diff; they must remain unchanged.
- [ ] Commit locally only, start preview at http://localhost:4389/ and leave running. Supply real city search URL, served asset hash and exact browser matrix. Await independent review/browser acceptance; do not publish.

## Plan self-review

Artwork source/version ambiguity resolved by authoritative v2 SVG extraction, not the older render.py. Neutral SSR and reload, guarded controller success/failure, paired city labels, no timer, original cache TTL and locale synchronization are assigned to Tasks 1–2; privacy and theme/location non-goals are checked in Task 3. No API signature mismatches or unassigned requirements identified. Execution proceeds inline as explicitly requested; no repeated user approval required.
