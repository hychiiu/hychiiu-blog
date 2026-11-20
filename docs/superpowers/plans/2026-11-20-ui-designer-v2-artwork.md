# UI Designer V2 Artwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace only the nine Dock glyph bodies with the newly approved UI designer v2 set, accepting the half-sun tradeoff.
**Architecture:** Preserve existing dynamic state/controller/network behavior and renderer interface. Extract exact child SVG markup from approved svg-v2 files, verify membership in overview/context, update the portable canonical fixture and renderer constants.
**Tech Stack:** TypeScript renderer, Node tests, existing Astro preview, box-only resvg/Pillow visual checks.

## Global Constraints

Continue current worktree/branch from 866a492. No push/deploy/comments or history rewriting. Theme, location, navigation, popup icons and dynamic behavior unchanged. Only approved source: blog-weather-ui-designer-20261120 v2 files; the older thermometer/crescent-star set is superseded. Keep 4388 untouched. Half sun has no horizon; full moon has one shallow arc; snow uses six-way crystals; unknown is gap cloud/short dash. 24 viewbox, 1.5 round currentColor, actual 20px.

### Task 1: Canonical artwork replacement and verification

Files: modify src/scripts/weather/dock-icons.ts, tests/fixtures/weather-dock-v2.json, tests/weather-dock-icons.test.mjs, docs/DESIGN.md and dynamic weather spec/plan. No other production files.
Interface remains `dockWeatherIcon(icon: WeatherIcon = 'unknown'): string`.

- [x] Extract nine exact SVG bodies; record overview/context and individual source hashes, assert matching approved overview and four context examples. Update canonical fixture and assertions first.
- [x] Run `node --test tests/weather-dock-icons.test.mjs` and observe exact-path failures against previous set. Check half sun/full moon, snow without filled dots, neutral gap cloud, currentColor light/dark paint inheritance, all existing weather-code mappings.
- [x] Replace renderer constants with extracted bodies, preserving the renderer function byte-for-byte. Rerun focused tests to green.
- [x] Update DESIGN and spec to the new sole approved source; mark prior plan/art evidence superseded. Do not describe the half sun as fully free of sunrise/sunset association.
- [x] Run `npm test && npm run format:check && npm run lint && npm run check && npm run build && git diff --check`. Expect 108+ passing tests; original warnings only.
- [x] Rebuild independent .local gallery on 4390 from actual renderer; verify 4389 serves new bundle. Rasterize actual new renderer at 20/48 px in light/dark via resvg and compare source rasters; paints must follow wrapper color, no black-filled artifacts. Gallery/raster fixtures remain gitignored and outside dist.
- [x] Confirm all non-artwork production files unchanged versus 866a492, commit normally locally, and retain both previews for parent review. No browser acceptance claim.

## Self-review

No dynamic or source-control policy expansion. Tests and source hashes identify this UI-designer set rather than the different older set also named v2. Only data constants and documentation change; shape/circle/fill assertions cover the explicit artwork constraints. Existing lifecycle/cache/race/localization tests remain intact. No unassigned requirements or interface changes.

## Execution evidence

- Continued clean worktree `/workspace/hychiiu-blog-weather-icons`, branch `feat/dynamic-weather-icons`, from `866a49226b47d258c21a5a7fc2af272c1a3980ea`. Live remote main remains `023e03909df09af4de3dad4e3259906cdf9a514c`.
- Red: 13 expected exact-path/shape/mapping failures against prior artwork; green: 108/108 complete tests. Full format:check, lint, check, build and diff checks passed; only the original ESLint configuration hint / empty notes / large chunk notices remain. Full log `/home/box/.cursor/projects/workspace/terminals/676401.txt`; red evidence `.local/designer-v2-red.log`.
- Compared actual renderer and approved standalone sources by resvg/Pillow at 20px/48px × light/dark for all nine icons: 36 pixel-identical combinations. Every non-paper pixel lies between the correct currentColor and background RGB; no fixed-black fill/dot artifacts. Snow uses strokes, full moon circle has no fill. Detailed `.local/ui-designer-v2-raster/report.json`; original source delivery check-v2.py also passes.
- The only production file changed relative to 866a492 is `src/scripts/weather/dock-icons.ts`, and its exported function is byte-identical: only nine path constants and provenance comment changed. Existing controller/state/service, theme, popup, navigation and location files are byte-identical. Portable source hashes and exact paths are in the existing test fixture, not production.
- 4389 real preview HTTP200 for Chinese/English home and real article. Its new bundle `/_astro/Dock.astro_astro_type_script_index_0_lang.16Ro9DWR.js` matches built bytes, SHA256 `15c468ceed2bbc3caebdf5417e9ed40817a7c15da35c786c9ea598970ae9f4af`. Homepage contains the new neutral gap-cloud; bundle contains half-sun and no former thermometer paths.
- Independent simulated gallery `http://localhost:4390/` now uses the new actual renderer for all 18 light/dark examples. Its prior Python server had a stale output stream causing a dropped response; only that 4390 service was restarted with persistent local logging, then HTTP200 confirmed. 4388 was untouched. All demo/raster evidence is gitignored under `.local`, absent from dist; no fake Issues or production demo route.
- Machine-readable evidence: `.local/designer-v2-evidence.json`. Keep branch and both previews for parent code review and desktop/mobile/browser acceptance. This work has no push, deployment or comments; raster/HTTP/DOM checks are not a browser acceptance claim.
