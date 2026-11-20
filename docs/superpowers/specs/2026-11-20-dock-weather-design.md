# Dock weather — approved design

The owner approved the revised desktop/mobile mockups on 2026-11-20 (Asia/Shanghai). Scope: implement locally, then independent browser and code review before any publication.

## Visual contract

- Existing avatar and navigation order stay unchanged; tools are weather → language → theme. Weather is a button, never a selected page or temperature badge.
- Paper panel, hairline border, restrained pop shadow, pine-green open state. Desktop width 280px to the Dock right; mobile above the Dock with viewport margins. No new floating button or top navigation.
- Shared 20px left inset for city, temperature, description, high/low and footer. Weather glyph sits to the right of the temperature group; °C is 0.35em. Compact footer, no empty spacer. First-use title and text share this inset, small glyph top right, equal-width stacked buttons.
- Existing tokens, serif headings, sans UI and mono metadata; both themes and locales. Keep 38px compact mobile slots; allow constrained horizontal Dock scrolling when all items cannot physically fit (including future archive), not smaller targets.

Historical fixed-icon rule (superseded by the owner later on 2026-11-20): the Dock originally used combined sun/cloud permanently. The approved dynamic v2 rule in `2026-11-20-dynamic-weather-icons.md` now follows successful current conditions, with approved UI-designer v2 half-sun and full-moon/shallow-arc artwork distinct from theme icons. Theme icons and location behavior remain unchanged.

## Behavior and privacy

Opening does not request location. First use offers location or manual city search. No IP geolocation. Only the explicit location action calls geolocation; reject, timeout and unavailable states retain manual search. Location coordinates are rounded to two decimals before weather lookup, held in memory only, never logged or persisted. Only a manually selected city may be saved locally. Third-party requests go directly to Open-Meteo; show this disclosure and its privacy link before location use. Open-Meteo may retain request logs (including coordinates) for 90 days per its terms; this must be surfaced in review, not promised away.

Weather: Celsius, current model temperature/condition, today's high/low, model weather timestamp in the city's time zone, switch city, loading, retry and error states. On-demand fetch, ten-minute memory cache, abort/sequence protection, no requests on every navigation. Manual search supports zh/en, distinguish candidates by administrative areas and country. No seven-day forecast, analytics, backend, API keys or accounts.

## Service decision (verified 2026-11-20)

Use https://api.open-meteo.com/v1/forecast and https://geocoding-api.open-meteo.com/v1/search. Official docs: https://open-meteo.com/en/docs and https://open-meteo.com/en/docs/geocoding-api . Free non-commercial personal sites without ads/subscriptions qualify under https://open-meteo.com/en/terms (600/min, 5000/hour, less than 10000/day; 300000/month pricing table). Data CC BY 4.0; next to data link Weather data by Open-Meteo plus license, identify rounding. Geocoding uses GeoNames attribution. No CSP currently exists, so do not invent a broad CSP as unrelated work.

## Accessibility / lifecycle

Semantic button with expanded/controls/label, nonmodal labelled dialog, live status, native keyboard controls, visible focus, Escape/outside close, focus return without scrolling. Pointer leave does not close panel. ClientRouter closes on preparation and invalidates in-flight requests, syncs locale after swap, binds once via runtime.once. Preserve article back-navigation fix 373add2. Independent browser review must cover desktop/mobile geometry at 320/360/390px, both themes/locales, keyboard, navigation, network failures, permission denial and search/live API.
