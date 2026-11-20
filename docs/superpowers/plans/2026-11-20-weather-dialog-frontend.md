# Weather Dialog Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 2026-11-20 UI designer final spec for the weather dialog, language glyph, and two-channel tooltip suppression, close the proven Dock navigation-lifecycle hole, and accept both close-dismiss and hover-mirror cleanup. Do not enable AMap.

**Architecture:** Keep the existing weather controller/service, Dock persist, and uncommitted `dock-navigation` WIP. Share approved v2 icon paths; put new and panel copy in `src/i18n`. Tooltip pointer/focus flags are independent, written onto the item and Dock root in the same update, and `refreshDockTooltip` reads the _current_ button’s item so a weather flag cannot blank EN. Close also clears a stale `.is-hover` when the pointer is not actually on the item (`elementFromPoint`). No blur, no timers, no `weather.close` mutation of global navigation. Location stays on explicit native `getCurrentPosition`.

**Tech Stack:** Astro 7, TypeScript, Node test runner, LinkeDOM, CSS tokens.

## Global Constraints

- Local edits and tests only; do not commit, push, or deploy this round.
- Do not modify `functions/`, `src/config/deploy.ts`, backend tests, README release-gate text, DESIGN §12, or untracked weather-location-server files.
- DESIGN.md may only update §11 popup-unification wording.
- Follow `/workspace/blog-weather-dialog-ui-20261120/DESIGN-SPEC.md`. Do not invent visuals. Example cities/temps are not real weather.
- New user-facing copy lives in `src/i18n/zh.ts` and `src/i18n/en.ts`.
- Privacy copy describes current wired behavior (same-origin WeatherAPI.com + optional native geolocation after an informed click, no IP). Do not promise AMap, load a live SDK, enable undeployed routes, production-mock config, or silently fall back to IP.
- Keep the three uncommitted lifecycle files and refine them.
- Parent production GUI (Asia/Shanghai, this session): residual inline `.dock-tip` at opacity 1 after same-button close on a hard-reloaded home and after successful in-site navigation; also after Esc, Tab to EN, and mouse outside the Dock. Floating tip is `display: none` at ≥1024px. Opening DevTools made the residue disappear. Natural `:hover`/`:focus-within`/`__yhDock` were not captured, so this is not a confirmed root cause. The no-swap lifecycle fix is not the only cause; the close-dismiss state machine and hover-mirror cleanup must both be tested. Parent will arrange later browser checks.
- No Shell Playwright/CDP.

### Location tradeoff

Keep explicit-click `geolocation.getCurrentPosition`. Disabling it would make “使用我的位置” dishonest or require removing it, contradicting privacy copy that must describe actual behavior.

---

### Task 1: Search row, first-screen IA, shared v2 icons, i18n

### Task 2: Focus, clear-cancels, IME, failure keeps query

### Task 3: Language SVG; syncDock must not write “中”/“EN” into the glyph

### Task 4: Two-channel tooltip suppression, both mounts, mirror cleanup, navigation WIP close-out

### Task 5: DESIGN §11 only, verify, same-toolchain JS/CSS size comparison. No commit.
