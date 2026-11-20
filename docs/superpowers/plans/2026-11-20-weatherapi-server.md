# WeatherAPI Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the unused AMap configuration scaffold with real bounded WeatherAPI search and forecast Pages Functions.

**Architecture:** Thin file-route handlers call one request orchestrator. Pure upstream schema parsers and bounded JSON/deadline helpers isolate provider validation from transport. Existing frontend session cache/in-flight cancellation remains frontend-owned; this batch deliberately does not introduce cross-request Worker promises, caches or a pretend global limiter.

**Tech Stack:** Existing TypeScript/Web Fetch APIs, Node test runner, Pages Functions and isolated pinned Wrangler tooling.

## Global Constraints

- Follow accepted `/workspace/weather-boundaries-evidence-20261120/weatherapi-server-contract-v1.md`; output timestamps are Unix seconds, codes remain WeatherAPI codes, coordinates only explicit WGS84.
- Own only `functions/`, `src/server/`, server configuration/routes/tests and server documentation. Do not touch frontend scripts/styles/components/i18n/tests or their staged work.
- No push, deployment, online configuration/secrets, purchase or account changes. Key only runtime env; real local checks read the protected 600 file, never the link-valued shell env.
- Five release gates: elegant logic; no temporary patches/dead interfaces; complete lifecycle/security comments; focused project modules; verifiable performance/no background traffic.
- Explicit production origin allowlist; source headers are defense in depth, not authentication. Local integration invokes production-origin Requests in memory, not a production-only bypass flag.
- Fixed provider HTTPS host and two endpoints, redirect:manual with explicit 3xx rejection, no callback/IP/alternate query modes; timeout covers response body and parsing; bounded JSON input/output, no sensitive logs.

---

### Task 1: Prove route and input/security behavior before implementation

**Files:** Create `tests/weather-api.test.mjs`; modify `tests/pages-middleware.test.mjs`.
**Interfaces:** `createWeatherApi({fetch?,now?,timeoutMs?}?)` produces `(request:Request,env:WeatherBindings)=>Promise<Response>`; file routes export `onRequest({request,env})`.

- [x] Add the initial tests below and run `node --test tests/weather-api.test.mjs tests/pages-middleware.test.mjs`; expect missing API module and exact invocation-route assertions to fail before production edits.

```js
const api = createWeatherApi({ fetch: async () => Response.json([]), now: () => 1795171200000 });
const response = await api(new Request('https://hychiiu.com/api/weather/search?q=London&lang=en'), {
  BLOG_WEATHERAPI_KEY: 'synthetic-weatherapi-key',
});
assert.equal(response.status, 200);
assert.deepEqual((await response.json()).results, []);
```

- [x] Add matrix cases for paths/methods/hosts/origins, duplicate/unknown query keys, q 2–80 Unicode characters/forbidden modes, safe integer ids, exact JSON WGS84 coordinate schema, content/body bounds, missing/link-like env key. Reject before env access or upstream calls.
- [x] Add real bounded-stream response fixtures for malformed/schema/error/redirect/timeout/oversized bodies; UTC/timezone/local-date agreement and provider namespace; verify no output contains synthetic key or raw upstream message.

### Task 2: Implement the bounded provider boundary and file routes

**Files:** Create `src/server/weather/http.ts`, `src/server/weather/schema.ts`, `src/server/weather/api.ts`, `functions/api/weather/search.js`, `functions/api/weather/forecast.js`.
**Interfaces:** `ApiError(code,status)`; `withDeadline(ms,work,parentSignal?)`; `readJson(source,limit,signal)`; `parsePlaces(data)` and `parseForecast(data,now)`; exported `weatherApi` produced by `createWeatherApi()`.

- [x] Implement bounded stream reading with cancellation/release and one deadline enclosing fetch, stream read, decoding, JSON and pure schema work; no background tasks or raw error logging.
- [x] Implement the route/input parsers and fixed request construction below; all other client-controlled URL parameters are rejected.

```ts
const url = new URL(`https://api.weatherapi.com/v1/${kind === 'search' ? 'search.json' : 'forecast.json'}`);
url.searchParams.set('key', key);
url.searchParams.set('q', query);
if (kind === 'forecast') {
  url.searchParams.set('days', '1');
  url.searchParams.set('aqi', 'no');
  url.searchParams.set('alerts', 'no');
}
```

- [x] Preserve upstream numeric condition code, current.is_day, explicit daily maxima/minima, observed epoch seconds and IANA timezone. Validate source local timestamps and forecast date, numeric ranges, complete shapes, bounded display strings. Return only domain fields, no raw upstream.
- [x] Export thin real handlers; run focused tests until green. Do not add disabled flag or placeholder response: valid runtime binding and request execute real provider logic.

### Task 3: Remove dead AMap surface and preserve content behavior

**Files:** Delete `functions/api/weather/location-config.js`, `src/server/location-config.ts`, `src/config/location.ts`, `tests/location-config.test.mjs`; modify `src/config/deploy.ts`, `functions/_middleware.js`, `tests/pages-middleware.test.mjs`, README server rows and obsolete server specs/plans.
**Interfaces:** `pages.functionRoutes` remains six versioned content patterns plus exact `/api/weather/search` and `/api/weather/forecast`; `pages.versionedPrefixes` unchanged.

- [x] Assert the exact new route list and absence of old handler/config/test in a server ownership regression. Then remove the dead files and update route constants.
- [x] Retain real content 404/redirect/build-id tests and API next-delegation tests. Correct middleware header comment; replace obsolete activation instructions rather than claiming dead 503 is a release solution.
- [x] Write `docs/superpowers/specs/2026-11-20-weatherapi-server.md` with v1 types, fixed errors, limits, explicit WAF proposal, secret-stdin deployment instructions and honest locale/network/location limitations.

### Task 4: Verify package/runtime, real local request, and scoped commit

**Files:** Server files only; isolated tool install and artifacts under `/workspace/blog-worker-tools-20261120` and evidence directory, never package/lock changes in shared repo.

- [x] Run full `npm test`, `npm run format:check`, `npm run lint`, `npm run check`, build with actual key/link env names unset, and `git diff --check`.
- [x] Install a pinned official Wrangler in the isolated tooling project, inspect installed `pages functions build --help`, then compile `functions` with `--outfile` outside repository. This is separate from Astro build.
- [x] Exercise the actual handler locally using one selected public city, protected file key in process memory, and official provider. Verify response schema, no key in response, no original link use; no personal geolocation.
- [x] Recheck live HEAD/status/index/remote and prepare explicit owned paths only. The final normal local commit SHA and remaining review/WAF/secret/browser gates are recorded in the executor handoff, not a self-referential commit field. Do not push or amend others' history.

## Plan self-review

Coverage: v1 search, GET/POST forecast, temporal semantics, strict transport, old scaffold removal, content isolation, standalone packaging, secret handling and five gates all have tasks. No generic proxy, SDK additions, paid products or frontend changes. Interfaces consistently use `WeatherBindings` and Unix seconds. Client session cache is intentionally not presented as server/global rate enforcement. Key binding alone activates the real handler; no empty feature flag remains. Baseline 199 tests passed. Existing linked worktree HEAD c5fb8e6, remote main e33a00c, frontend WIP preserved.

## Execution evidence and acceptance status

Evidence directory: `/workspace/weather-boundaries-evidence-20261120/`.

- TDD red logs cover the absent module/routes, malformed JSON classification, stream cleanup, incoming abort, official monthly key cap (2011), and malformed UTF-8/cleanup rejection. Final focused server + middleware suite: **118 passed** (`weatherapi-server-green.log`); owned ESLint and standalone strict TypeScript also pass.
- All full-repository gates were executed, not short-circuited: **270 tests, 265 passed, 5 failed**; `format:check`, `lint`, and `check` also fail in frontend-owned migration work. Four router assertions still read old `name` instead of `q`; one clear-night label expects `Sunny` rather than the new `Clear`. Six frontend files need formatting; frontend tests have unused `window`/`last`; weather service coordinate narrowing fails at lines 126–127. These files were not modified by this server task. See `weatherapi-final-*.log` and `weatherapi-final-check-status.json`. These failures remain release blockers, not ignored successes.
- Full static build and `git diff --check` pass. Final independent Wrangler 4.165.0 Pages Functions build passes; artifact and exact eight invocation routes are recorded in `weatherapi-artifact-verification.json`. No source/public/Worker artifact contains the protected key, public assets contain no runtime binding names, old location-config is absent, and no fixture-named public files were found. No online configuration or secret was written.
- Actual exported handlers made only three local official-provider requests: Shanghai search, selected-id forecast, and an explicitly synthetic public-city WGS84 coordinate forecast. All 200, native condition 1036/night, extrema/Unix seconds/private no-store validated, no secret reflected (`weatherapi-real-handler.json`). Earlier eight search/locale requests remain documented separately. No personal location was requested.
- Performance comparison captured the same frontend WIP in an isolated source copy and changed only server/routes back to the starting HEAD for its baseline. Every client JS/CSS byte/hash is identical: **+0 raw/gzip bytes**. Total lazy/eager assets together are 5570189 raw/1617877 gzip bytes; these totals are not a claim of first-load weight or browser smoothness. See `weatherapi-assets-comparison.json`.
- Before scoped commit, live remote main remained `e33a00c6b76ba8daa6b756c83a52888fcdc11ed7`, local starting HEAD `c5fb8e6fda0e1b85e7ee78688e664c1c166fef6d`, branch `feat/dynamic-weather-icons`, shared index empty. Frontend WIP is preserved. Protected file mode 600 and parent directory 700 were verified; the directory mode was corrected locally without reading other credentials.
- Self-review: input/orchestration/schema/transport responsibilities are separate; fixed routes replace the dead scaffold rather than hiding it; abort/reader/timer cleanup has failure regressions; comments document security/namespace/lifecycle decisions; server code adds no client dependency, SDK, polling, background traffic, shared coordinate cache or pretend global limiter.
- Parent gates remain: frontend fixes/full green rerun, independent five-gate review, real UI acceptance, runtime binding, both-zone WAF/rule behavior and no-store/observability checks, exact deployment CI/Pages and both-domain smoke evidence. Native geolocation code3, China network reachability and actual account/trial status are not claimed fixed or verified.

### Actual Workers runtime compatibility

The local Pages/workerd integration found that Workers rejects Fetch `redirect: "error"` with TypeError before any upstream request. Official Request documentation and a credential-free data-URL runtime probe confirm `manual` is supported. The server now uses `redirect: "manual"` and rejects every 3xx response before parsing; it never follows or forwards a redirect. A red/green regression covers Workers-style rejection and one-call 307 denial. This is a real runtime fix, not a mock or a production host exception. Reference: https://developers.cloudflare.com/workers/runtime-apis/request/
