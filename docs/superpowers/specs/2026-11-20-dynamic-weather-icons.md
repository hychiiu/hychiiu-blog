# Dynamic Dock weather icons — approved v2

The owner changed the fixed-icon decision on 2026-11-20 and approved implementation of v2 (t10u), locally only. This supersedes the fixed sun/cloud Dock rule, not the theme/navigation or location behavior.

## Exact artwork

Use the first nine distinct glyph bodies in weather-dock-icons-overview-v2.svg: clear-day, clear-night, partly, overcast, rain, snow, fog, storm, unavailable. The clear-day alternate at the bottom is NOT selected. Each is a 24-unit viewBox, 1.5 round-cap/round-join currentColor stroke; existing Dock CSS renders 20px. Clear-day is sun plus thermometer, clear-night is a smaller crescent plus exactly two star paths. All paths are copied exactly, not regenerated. The supplied render.py contains earlier, different paths: the approved v2 SVG is authoritative. The context-v2 SVG independently matches the selected clear-day/night bodies and preserves the original theme icons. Store a small canonical artwork fixture for portable path-equality tests; do not depend on /workspace files in CI.

## State contract

- Neutral cloud/thermometer on initialization and full reload. Restoring an existing manual city preference does not fetch until the existing open action.
- Follow current weather_code/is_day of the latest successful place, not a daily summary. Reuse existing bilingual condition mapping: code 0 clear-day/night, codes 1/2 partly, 3 overcast, fog/rain/snow/storm groups unchanged, unknown neutral.
- Update icon and bilingual city/condition tooltip/aria-label together only after a valid, current request succeeds. While another city loads, retain the previous successful city/icon pair (never relabel it as the pending city). Failure uses neutral unavailable state, not an invented clear sky. Retry success restores the successful pair.
- Keep the in-memory snapshot through ClientRouter navigation; resync text to the new language. Ignore stale or canceled responses through the existing controller generation checks. No new timers, polling, requests, coordinate storage or geolocation changes. Opening after cache expiry uses the existing service refresh; the snapshot is not a new cache and does not change its TTL.
- Keep popover artwork/layout unchanged: the new set is the Dock entrance only. Theme sun/moon paths and calls remain byte-identical. Dock order, focus, page navigation, article return and source issue data stay untouched.

## Acceptance

Portable exact-path tests; all documented code groups plus unknown; clear day/night differ from theme glyphs; real DOM success/failure/pending/city switch/locale/navigation/race/cache tests; existing Router-first search regressions continue passing. Full npm test, format:check, lint, check, build and git diff --check. Browser review uses real city search at localhost:4389; any all-state gallery must be gitignored, explicitly simulated and outside production pages.
