# Weather integration boundaries — 2026-11-20

## Authorization and scope

The owner approved starting this work on 2026-11-20 (t24), including the permanent fifth release gate, “保证页面高性能，丝滑”. UI designs belong exclusively to the UI designer; the parent is obtaining the design. This batch changes no UI, CSS, artwork, weather controller, theme, article return behavior, language navigation, geolocation provider or production configuration. Local normal commits are permitted; push, deployment and online secret writes await the parent’s integrated acceptance.

The baseline is `e33a00c6b76ba8daa6b756c83a52888fcdc11ed7` in the existing linked worktree `/workspace/hychiiu-blog-weather-icons`, branch `feat/dynamic-weather-icons`. Live remote main was checked before work and matched that SHA. The baseline has 111 passing tests.

## Decisions and alternatives

1. Preserve static Astro plus the existing Pages Functions (recommended). Its root middleware must reserve versioned asset handling for the original content prefixes and delegate other matched Function requests with `next()`. Generate invocation routes from the existing config source, not by hand-editing dist. Do not activate an AMap route in this batch.
2. A separate Worker is an alternative if independently configurable rate limiting, secret isolation or observability makes it necessary. It adds deployment/routing ownership and is not authorized for creation in this batch.
3. Do not migrate Astro to SSR or introduce `_worker.js`: advanced mode would replace the existing Functions pipeline and unnecessarily endanger article cache/404 handling.

## AMap production contract — blocked, not implemented

- Load JSAPI only following an informed, explicit location action. No `Map` instance, eager SDK loading, CitySearch/getCityInfo, watchPosition, polling, automatic retries or additional coordinate persistence.
- Explicit device-only options: `noIpLocate: 3`, `getCityWhenFail: false`, `GeoLocationFirst: true`, `noGeoLocation: 0`, `useNative: false`, `convert: false`, `needAddress: false`; retain the existing single-shot timeout/cache boundaries. Prioritizing HTML5 alone does not disable IP fallback. SDK wrapping cannot promise to repair a native browser code-3 timeout.
- A location adapter must establish browser/WGS84 provenance before passing coordinates into the existing weather service. Do not assume all `convert:false` results, SDK results or IP centers are WGS84; do not invent a GCJ-02 inverse conversion. Unknown provenance returns a dictionary-backed manual-city error. No new UI copy is introduced in this batch.
- Official `serviceHost` must be configured before SDK loading and retain the fixed `/_AMapService` prefix. The public JS Key is intended to be visible to browsers; source stores references only. The security code is a server-only encrypted runtime binding. The owner permits its required transmission solely in the fixed trusted upstream HTTPS query; never return or log it. A GitHub variable does not automatically create a Pages runtime binding.
- No proxy production route until an exact necessary SDK endpoint/method/query manifest has been verified and reviewed. Never allow `/v3/*`, arbitrary URLs/hosts, redirects, client-supplied `jscode`, unrelated map/search/weather services or unknown parameters. The pure device configuration does not justify speculatively enabling reverse geocoding, coordinate conversion or IP endpoints.
- Require a verified enforcement path for rate limiting, upstream quota handling and both production domains. Referer/Origin/CORS are defense in depth, not authentication. Preview/pages.dev access must not bypass the production policy. Do not use isolate-memory counters as a reliable limiter.
- Location responses bypass shared/CDN caches and use `private, no-store`. Keep existing weather cache behavior unchanged. Errors, traces and structured logs must not contain secrets, full sensitive URLs, coordinates or response bodies. Worker query-string redaction exists, but its applicability to this Pages project and outbound tracing must be checked rather than assumed.
- An AMap allowlist, live runtime secret setup, limiter and real-device SDK compatibility are not yet verified. They block claiming that the proxy/location integration is complete or publishable. This batch does not create a nonfunctional placeholder endpoint to conceal these gaps.

## Navigation lifecycle defect, separate from tooltip UI semantics

The installed Astro runtime exposes a preparation `signal` and an overridable `loader`. It may return without before-swap after cancellation, prevented preparation, loader failure or delegation to browser navigation. Dock currently sets a persistent navigating flag on preparation but releases it only from before-swap. Its pointerleave and outside-pointermove handlers intentionally ignore cleanup while that flag is true.

Provide a small lifecycle owner for the existing Dock binding. It must release the current navigation on abort, prevented preparation, a loader that prevents/defaults or throws, and transition completion/rejection. The loader wrapper must preserve its receiver, return/rejection and Router behavior. Late abort/completion from an older navigation cannot release a newer one. Remove each navigation’s abort listener when superseded or settled. Do not reset from page-load while a valid visual transition is still running; no timers, polling, forced blur or weather-controller manipulation of global navigation state.

On cancellation without a last pointer position, discard an untrusted hover mirror and reset the raw pointer; with a known position, use the existing hit test. Keep successful navigation’s existing pointer reconciliation, reduced-motion behavior and animation engine. Do not implement tooltip-dismiss styling/semantics before the UI designer specifies them.

The production tooltip root cause is still unconfirmed. Parent probe: reproduce desktop open→trigger close and Escape separately; record weather item `:hover`, `:focus-within`, `.is-hover`, `window.__yhDock.navigating`, active control, and computed display/opacity of both `.dock-tip` and `.dock-floating-tip`. Repeat after moving outside and Tab to EN; compare a fresh reload, post-navigation, canceled navigation and 330px viewport. Text retained inside a hidden tooltip is not proof of visibility. If no matching state explains a visible node, inspect the actual node/view-transition painting instead of masking it with suppression.

## Verification and review

TDD tests cover current content cache/404/redirect handling, non-content delegation and generated route scope; actual Dock event-handler cancellation, rejected/successful transitions, supersession, prevented/throwing loaders and repeated page-load initialization. Security contract tests keep the server security-code reference out of client source and production proxy paths inactive until blockers are resolved. These are not proxy functional tests or browser acceptance.

Run test, format:check, lint, check, build and diff checks. Compare JS/CSS raw and gzip sizes against a freshly built baseline with the same toolchain. The permanent release policy covers logic, no temporary patches, documented contracts, project/module conventions and measurable performance. Parent reviews this non-UI batch and the later designer-based UI before authorizing push/deployment.

## Official evidence

- https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode
- https://lbs.amap.com/api/maps-javascript-api/reference/location/geolocation
- https://lbs.amap.com/api/javascript-api-v2/guide/services/geolocation
- https://lbs.amap.com/api/webservice/guide/api/convert
- https://open-meteo.com/en/docs
- https://developers.cloudflare.com/pages/functions/routing/
- https://developers.cloudflare.com/pages/functions/middleware/
- https://developers.cloudflare.com/pages/functions/bindings/#secrets
- https://developers.cloudflare.com/workers/observability/traces/spans-and-attributes/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Self-review

Scope is split into independently reviewable configuration/middleware and Dock-lifecycle tasks. Neither enables location networking or interprets the absent UI design. AMap path/limiter/runtime-binding gaps are explicit release blockers, not permissive defaults. Cancellation repair is a proven code defect, not a claim that production tooltip observations have been fully explained. All newly introduced user-facing copy must use existing bilingual dictionaries in the future UI batch.

## t25 ownership handoff and proposed frontend/server contract

On t25 the parent assigned frontend work to the frontend engineer. Stop editing `src/scripts/dock.ts`, `src/scripts/dock-navigation.ts` and `tests/dock-navigation.test.mjs`; these three files already have local, uncommitted lifecycle changes. They are handed over intact, not reverted, included in a server commit or claimed as reviewed frontend delivery. Controller, tooltip renderer, CSS and UI were not modified. Server ownership remains `functions/`, `src/config/deploy.ts`, server/configuration tests and shared project documents.

The following contract is a proposal for coordinated implementation, **not an available endpoint**. The parent/frontend engineer must acknowledge it before activation:

- Following explicit informed location action only, request `GET /api/weather/location-config` from the current origin. Success is JSON `{jsApiKey: string, serviceHost: string}`. `serviceHost` must be the validated current production origin plus `/_AMapService`; return no security code, internal upstream URL or provider debug data. The public JS Key is the only intentionally browser-visible credential identifier. Unavailable configuration returns HTTP 503 with machine code `{code: 'LOCATION_UNAVAILABLE'}`; the frontend maps that code to zh/en dictionary text. Config responses are `private, no-store`.
- The frontend sets `_AMapSecurityConfig.serviceHost` before loading the official JSAPI with the public key. It does not set `securityJsCode`, create a Map, run an IP-city fallback, poll or load on page initialization/navigation. The device-only/WGS84 requirements above apply; cancellation and old-result guards remain owned by the frontend.
- SDK calls may use `GET /_AMapService/<verified path>` only after the exact SDK endpoint/parameter manifest is recorded and a reliable limiter is confirmed. This is a routing prefix, never permission for arbitrary nested paths. Approved upstream SDK response formats must be preserved; do not wrap successful JSON/JSONP in an application object. Unknown paths/methods are rejected; use fixed, non-sensitive machine errors for unavailable/limited requests. Actual SDK method/response compatibility remains subject to the manifest; no wildcard forwarding is approved.
- Neither route is currently included in production `_routes.json`. Existing content routes are unchanged. No placeholder handler is installed while SDK path, limiter, preview-host policy and runtime bindings are unverified.
- Parent arranges encrypted Pages runtime `BLOG_AMAP_SECURITY_JS_CODE` and the public JS Key configuration after acceptance. GitHub Actions/Environment **Secrets**, not plaintext Variables, are required if the security code is transported through CI. GitHub values do not automatically become Pages runtime bindings. No credentials have been read or written during this work.

Before continuing server proxy implementation, obtain the frontend's chosen pinned JSAPI loading/Geolocation mode and exact required request manifest without logging the sensitive upstream query. The parent must coordinate a safe evidence collection method; this batch made no authenticated high-level SDK requests and cannot invent that evidence.
