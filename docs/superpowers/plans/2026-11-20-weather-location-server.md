# Weather Location Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the approved production-origin runtime configuration API with a default-off gate, and replace generic AMap blockers with exact SDK/Cloudflare evidence.

**Architecture:** Keep static Astro plus existing Pages Functions. A small server module validates requests and returns public configuration; its file-route wrapper uses runtime env. No AMap transport endpoint is activated because the audited SDK conversion behavior violates the required WGS84 contract.

**Tech Stack:** TypeScript server module, Pages file routing, Node Request/Response and node:test; existing Astro checks.

## Global Constraints

Frontend files belong to the frontend engineer and must not be touched or committed. No push/deploy, online secret/rule writes, paid upgrade or new product. No raw credential/URL/coordinate logs. Public SDK source is read-only evidence. Follow `docs/superpowers/specs/2026-11-20-weather-location-server.md`; WAF readiness is real enforcement to verify, not an in-memory counter or pretend binding.

---

### Task 1: Default-off configuration endpoint

**Files:** Create `src/config/location.ts`, `src/server/location-config.ts`, `functions/api/weather/location-config.js`, `tests/location-config.test.mjs`; modify `src/config/deploy.ts`, `tests/pages-middleware.test.mjs`, `tests/amap-boundary.test.mjs` only if route assertions need alignment.

**Interfaces:** `locationConfigResponse(request: Request, env: LocationConfigEnv): Response`, with optional runtime strings `BLOG_AMAP_JS_API_KEY` and `BLOG_AMAP_LOCATION_ENABLED`. GET success has `{jsApiKey, serviceHost}`; errors have `{code}`. `BLOG_AMAP_SECURITY_JS_CODE` is never accessed. Config exports fixed path/prefix and exactly two approved HTTPS origins. All responses use private,no-store and nosniff.

- [x] Write tests against the real Pages route: valid production origins with enabled fake binding return only the approved fields; default absent/false flag returns 503; preview/www/unknown hosts, ports, HTTP and cross-origin/malformed Origin/Referer/fetch metadata return 403; query input returns 400; unsupported method returns 405 with Allow:GET; missing/invalid key returns 503. A throwing security-code getter proves it is never read. A proxy env object verifies rejected/disabled requests do not inspect the public key. Every response must have no-store/nosniff and no CORS leakage.
- [x] Run `node --test tests/location-config.test.mjs` and observe the expected missing-handler red state before production code. No real env is read in tests.
- [x] Implement request validation and fixed-error response helpers, then the default-off/runtime-key branch:

```ts
if (env.BLOG_AMAP_LOCATION_ENABLED !== 'true') return error('LOCATION_UNAVAILABLE', 503);
const key = env.BLOG_AMAP_JS_API_KEY;
if (typeof key !== 'string' || !key || key !== key.trim() || key.length > 256 || /\s/.test(key))
  return error('LOCATION_UNAVAILABLE', 503);
return json({ jsApiKey: key, serviceHost: `${url.origin}${locationConfig.servicePrefix}` });
```

- [x] Route wrapper delegates `{request, env}` to this module. Add only the exact configuration path to `pages.functionRoutes`; preserve `versionedPrefixes` and never add `/_AMapService/*`.
- [x] Run focused tests, including middleware delegation/config route generation; align the old exact route assertion to original content patterns plus this one explicit endpoint. Verify generated build routes include the configuration endpoint but no proxy.

### Task 2: Security/performance verification and handoff

**Files:** Update the companion spec and this plan with exact evidence. No README/DESIGN/UI edits are needed; permanent five-gate policy is already committed.

- [x] Run full test, format:check, lint, check, build and diff checks. Build with both actual AMap env names unset; never serialize or print their values. Source contains references only; asset checks inspect forbidden reference names, not secret values.
- [x] Record public SDK conversion-path evidence, default-off behavior, two Free-zone empty limiter slots and Billing/OAuth 403. Do not retry billing through another auth route. Give exact parent-only WAF/binding and GUI steps.
- [x] Recheck shared worktree/remote changes. Commit only server-owned paths normally after checks, excluding all frontend files. Report HEAD, tests and remaining SDK decision; no feature activation or proxy-completion claim.

## Self-review

The public config route is independently implementable and uses no AMap upstream credentials beyond its intentionally public identifier. Its default-off gate is not described as rate limiting. The metered forwarding proxy is intentionally not implemented because the inspected SDK cannot meet the weather coordinate contract. This is a concrete compatibility finding, not a generic permission blocker. Parent receives an actionable native/manual fallback and a narrowly scoped GUI verification rather than a permissive temporary transport.

## Execution review

The contract, middleware routing, fail-closed source/feature checks and sensitive-binding non-access are implemented and tested. Endpoint/route red logs and server-only green logs are in `/workspace/weather-location-server-evidence-20261120/`. Full checks passed with 177 working-tree tests / 166 excluding the frontend handoff suite. Public JS/CSS raw and gzip deltas are zero, with all 107 files byte-identical to the pre-server-change build. No forwarding proxy was introduced because the inspected SDK still converts native coordinates despite the requested setting. The concrete SDK compatibility choice, parent-only WAF setup, runtime flag and real-browser checks remain activation gates, not unfinished permissive code. Wrangler packaging was not run because the tool is not installed; no package change was made merely for this optional local check. Frontend files remain outside the server commit.
