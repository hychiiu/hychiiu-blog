# Dynamic Dock weather icons — approved v2

The owner changed the fixed-icon decision on 2026-11-20 and approved implementation of v2 (t10u), locally only. This supersedes the fixed sun/cloud Dock rule, not the theme/navigation or location behavior.

## Exact artwork — UI-designer v2 replaces the earlier thermometer set

The owner explicitly accepted the half-sun tradeoff and approved the full UI designer v2 set on 2026-11-20. The ONLY current source is `/workspace/blog-weather-ui-designer-20261120/weather-dock-icons-overview-v2.svg`, `weather-dock-context-v2.svg` and `svg-v2/*.svg`. The similarly named earlier set in `blog-weather-icon-design-20261120` is superseded and is not an implementation source.

Extract exact nine child SVG bodies: clear-day (half solar arc plus five rays, no horizon), clear-night (full moon outer circle plus one shallow arc), partly (half-sun and cloud), overcast, rain, snow (two six-way stroke crystals), fog, storm, unknown (gap cloud and short inner dash). The half-sun can still suggest sunrise/sunset; the owner accepted this compromise to distinguish it from the existing theme sun. Keep 24-unit viewBox, 1.5 round-cap/round-join currentColor stroke and 20px display. No new dots, black fill, thermometer or crescent/stars. The source full-moon circle is an unfilled outline, not a filled dot. Store canonical bodies and overview/context/individual SVG hashes in the portable test fixture. Preserve the renderer interface, all dynamic behavior, location, theme and popup artwork.

## State contract

- Neutral gap-cloud/short-dash on initialization and full reload. Restoring an existing manual city preference does not fetch until the existing open action.
- Follow current weather_code/is_day of the latest successful place, not a daily summary. Reuse existing bilingual condition mapping: code 0 clear-day/night, codes 1/2 partly, 3 overcast, fog/rain/snow/storm groups unchanged, unknown neutral.
- Update icon and bilingual city/condition tooltip/aria-label together only after a valid, current request succeeds. While another city loads, retain the previous successful city/icon pair (never relabel it as the pending city). Failure uses neutral unavailable state, not an invented clear sky. Retry success restores the successful pair.
- Keep the in-memory snapshot through ClientRouter navigation; resync text to the new language. Ignore stale or canceled responses through the existing controller generation checks. No new timers, polling, requests, coordinate storage or geolocation changes. Opening after cache expiry uses the existing service refresh; the snapshot is not a new cache and does not change its TTL.
- Keep popover artwork/layout unchanged: the new set is the Dock entrance only. Theme sun/moon paths and calls remain byte-identical. Dock order, focus, page navigation, article return and source issue data stay untouched.

## Acceptance

Portable exact-path tests; all documented code groups plus unknown; clear day/night differ from theme glyphs; real DOM success/failure/pending/city switch/locale/navigation/race/cache tests; existing Router-first search regressions continue passing. Full npm test, format:check, lint, check, build and git diff --check. Browser review uses real city search at localhost:4389; any all-state gallery must be gitignored, explicitly simulated and outside production pages.
