# Dock Weather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the approved visitor-city weather popover to the persistent Dock.
**Architecture:** Separate validated API/model service, bilingual rendering, and DOM lifecycle controller. A static shell in Dock persists with navigation; requests are lazy and abortable.
**Tech Stack:** Astro, TypeScript, native fetch/geolocation, Node test runner, lightweight DOM test fixture.

## Global Constraints

No push/deploy in this phase. No changes to issues.json, back-navigation or unrelated infrastructure. No secrets, IP lookup, analytics, location persistence or automatic permission prompt. Use tokens and approved 20px alignment. Run npm test, format:check, lint, check and build.

---

### Task 1: Validated weather service

Files: create src/config/weather.ts, src/scripts/weather/service.ts; test tests/weather-service.test.mjs.
Interface: createWeatherService({fetcher, now, timeoutMs}) → {search(query, lang, signal), weather(place, signal)}; place {name, latitude, longitude, detail?, id?}; weather {temperature, code, isDay, high, low, time, timezone}.

- [x] Write failing assertions for all documented WMO codes (including 97), unknown fallback, invalid/null API payloads, Chinese/English city query parameters, empty search, HTTP errors, timeouts, abort and ten-minute cache.
- [x] Run `node --test tests/weather-service.test.mjs` and observe missing implementation failure.
- [x] Implement validation, bilingual descriptions/icons, URLs using Celsius/unix timestamps/timezone auto, fetch without credentials/referrer, bounded memory cache and timeout cleanup.
- [x] Run service tests and verify green.

### Task 2: Accessible lazy controller and renderer

Files: create src/scripts/weather/view.ts, controller.ts, src/scripts/weather.ts; tests/weather-controller.test.mjs.
Interface: bindWeather({document, window, service, geolocation, storage}) binds once per document; renderWeather(state, lang) returns escaped panel markup. Controller owns aborts and monotonically increasing request generation.

- [x] Write failing DOM tests: opening does not fetch/geolocate, explicit permission rejection exposes manual search, candidate selection, stale response exclusion, close/reopen, escape/outside focus, ClientRouter lifecycle, repeat binding and bilingual output.
- [x] Run `node --test tests/weather-controller.test.mjs` and observe failure.
- [x] Implement consent-first UI, form-submit search (no per-keystroke requests), escaped candidate text, retry, focus management, state transitions, manual-only persistence and rounded location coordinates.
- [x] Run service and controller tests until green.

### Task 3: Dock integration and presentation

Files: modify src/components/Dock.astro, src/styles/dock.css, src/styles/tokens.css, docs/DESIGN.md; create src/styles/weather.css; test tests/weather-integration.test.mjs.

- [x] Add failing integration assertions for order, semantics, token-driven 280px/20px panel, mobile clearance/overflow safety and unchanged navigation contracts.
- [x] Run integration tests, observe failure, then add semantic shell and single runtime entry import.
- [x] Implement paper popover, icon/right-temperature alignment, compact high/low/footer, equal-width choice buttons, responsive scrolling Dock with preserved targets, reduced-motion fade.
- [x] Run `npm test && npm run format:check && npm run lint && npm run check && npm run build`; address only scoped issues.
- [x] Start preview at http://localhost:4388, leave running and hand off browser matrix. Do not claim visual approval from unit tests.

## Local execution notes

All implementation steps completed locally; independent browser/code review remains a release gate. Tests were observed red before initial service/controller/integration implementation and before fixes for sparse city data, focus races and visible attribution. LinkeDOM is dev-only. Added mobile Dock scroll-offset geometry helper to keep the active navigation dot correct when the fixed-size targets overflow the narrow viewport. No article return-navigation code or issue data changed.

CORS verified with an explicit Origin header on both public endpoints (`Access-Control-Allow-Origin: *`). Chinese 北京 returned distinguishable localized candidates. Open-Meteo current official mapping includes weather code 97 (heavy thunderstorm), covered alongside all other documented codes and an unknown fallback.
