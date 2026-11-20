# Weather location server contract and audited SDK boundary

## Scope and ownership

Continuation of t24 under the parent's 2026-11-20 server-only assignment. The frontend engineer owns Dock/controller/tooltip/UI and their pending files. This batch changes only server handlers, server configuration/tests and this server documentation. No push, deployment, online binding/rule write, new product or purchase is permitted.

## Concrete SDK evidence, not an assumed endpoint list

The official documented loader `https://webapi.amap.com/maps` was read in memory with `v=2.0` and `plugin=AMap.Geolocation` using the authorized public JS Key. Neither key value nor credential-bearing URL/body was printed or saved; the security code was not read. No location business endpoint was called and no coordinates were transmitted. Script download success does not establish business permissions, security-code pairing, real-device success or network availability in China. The retrieved script was 992,309 bytes, SHA256 `36ccfe936dba497a44fc55b8b261f5c2fed353be3862586b2cd459ea124127d5`. This is an audit of that retrieved build, not a guarantee about every future response to the mutable `2.0` loader.

- `noIpLocate:3` sets `useIPLocation=false`. `getCityWhenFail:false` skips the IP-city branch, and `useNative:false` skips SDK-assistance branches.
- The HTML5 helper calls `navigator.geolocation.getCurrentPosition` and starts with browser coordinates. However, the locate success branch calls its conversion helper when `!result.isConverted` without consulting `_config.convert`.
- That helper calls the documented fixed upstream `https://restapi.amap.com/v3/assistant/coordinate/convert` with `coordsys:gps` and `locations:position.toString()`. `needAddress:false` skips reverse geocoding, but does not skip this conversion.
- The inspected plugin section has no read of `_config.convert`. After successful conversion it replaces `position` without updating `isConverted` in that branch. Therefore `convert:false`, `location_type:html5` and a false `isConverted` are not sufficient provenance for the returned coordinates in this build.
- A browser-identity heuristic can bypass conversion for selected embedded browsers; it is not a safe or portable WGS84 contract. Do not spoof user agents or depend on that branch.

This answers the architecture question: the inspected device-only SDK path is not proven native-only and statically requires a conversion request on ordinary browsers. Its output cannot currently satisfy the approved WGS84-only weather boundary. The SDK does not fix an underlying browser code-3 acquisition failure either.

Do not implement a pass-through/echo conversion response, intentionally fail conversion to harvest the SDK fallback position, copy/patch SDK source, guess a reverse transform, downgrade to legacy 1.4 based only on option names, or open generic proxy paths. The minimal safe product alternative is to retain the existing native WGS84/manual-city path while this SDK compatibility issue is resolved. An explicit approximate-IP-city option is a different product/privacy decision and is not approved here.

Official evidence: https://lbs.amap.com/api/javascript-api-v2/guide/abc/plugins ; https://lbs.amap.com/api/maps-javascript-api/reference/location/geolocation ; https://lbs.amap.com/api/webservice/guide/api/convert ; https://open-meteo.com/en/docs . The conversion REST API is documented to convert other coordinates **to AMap coordinates**, not to WGS84. Public SDK source was inspected, not executed or locally redistributed.

## Implementable configuration API

`GET /api/weather/location-config` is a real server handler, separate from any SDK transport. It returns `{jsApiKey: string, serviceHost: string}` only when a production-only runtime enable flag is exactly `true`, a nonempty, bounded public-key runtime binding exists (not an upstream credential-validation claim), the HTTPS origin is exactly `https://hychiiu.com` or `https://inbluemoon.com`, and request method/path/source checks pass. The serviceHost is derived from that validated origin with the fixed `/_AMapService` prefix. No value is embedded into source or build output.

All responses are JSON with `private, no-store` and `nosniff`. Unknown/preview/www hosts, non-default ports, cross-origin/malformed Origin or Referer and cross-site fetch metadata fail closed. There is no wildcard CORS or credential cookie handling. Source-header checks are defense in depth, not authentication: a non-browser can spoof them. Query parameters are not accepted. Failure bodies are fixed machine codes, never upstream text, URLs, coordinates or environment values.

Runtime bindings:

- `BLOG_AMAP_JS_API_KEY`: intentionally public identifier, read only at request time after request and enable checks.
- `BLOG_AMAP_LOCATION_ENABLED`: default absent/false; parent must keep it off until SDK provenance, frontend behavior, limiter and privacy acceptance are complete.
- `BLOG_AMAP_SECURITY_JS_CODE`: reserved server-only binding for a future necessary proxy, but **not read by this configuration endpoint**, not returned or placed in build configuration. Do not provision/use it for an unneeded proxy.

The invocation scope may include the configuration route, but the feature remains unavailable by default (503). `/_AMapService` has no forwarding route. The root middleware delegates the configuration request while its six original content prefixes retain versioned asset handling.

## Reliable limiter using current resources

Read-only Cloudflare inspection found both production zones active on **Free Website**, with zero `http_ratelimit` rulesets/rules. Current official WAF documentation includes one rate-limiting rule per Free zone, IP counting, a 10-second counting period and 10-second mitigation. No paid upgrade or new Worker is required to protect the configuration endpoint with these existing unused slots. Account subscription lookup returned 403 (OAuth does not cover Billing Read); no alternate credentials or billing workaround was attempted, so the Workers account plan is unknown.

Parent can configure one rule per production zone after review:

- expression: `http.request.uri.path eq "/api/weather/location-config"` (later OR only a reviewed proxy path if it becomes necessary);
- characteristics: `cf.colo.id`, `ip.src`;
- counting period 10 seconds; proposed 20 requests per period; block for 10 seconds. The threshold is a starting operational proposal, not a hard global quota or identity assertion.

Verify enforcement and legitimate shared-IP behavior before setting the enable flag. WAF counters are approximate/per-location, not a globally strict account-key quota. This configuration endpoint does not call AMap or consume provider business quota. If a future metered proxy needs a strict cross-location credential quota, use an explicitly approved suitable enforcement service; no isolate-memory counter or readiness boolean substitutes for it.

Host allowlisting rejects pages.dev/preview hosts, preventing those hosts from bypassing zone rules to get this endpoint's public configuration. No forwarding endpoint is enabled, so there is currently no secret-bearing upstream request or transport log to redact. Future outbound `jscode` must use only the official fixed upstream HTTPS query, with verified logs/traces query redaction and no unsafe error/redirect passthrough.

Sources: https://developers.cloudflare.com/waf/rate-limiting-rules/ ; https://developers.cloudflare.com/pages/functions/routing/ ; https://developers.cloudflare.com/pages/functions/middleware/ ; https://developers.cloudflare.com/pages/functions/bindings/#secrets .

## Smallest parent GUI verification

1. Coordinate an authorized test origin/key without broadening production host allowlists or exposing secrets. On the frontend engineer's controlled harness, do not create a Map. Use explicit device-only options and display only a pass/fail summary of result provenance; never log raw result/message/coordinates or copy a full network URL.
2. In DevTools Sensors choose a clearly labeled simulated public-city coordinate, not the user's location. After the explicit locate click, filter Network for `/_AMapService/` and record only method, pathname and status. Check specifically whether `/v3/assistant/coordinate/convert` occurs despite `convert:false`; do not let a generic proxy fulfill unknown requests.
3. Compare returned position to the simulated input locally, retaining only an equality boolean and metadata. If the path/conversion occurs, do not feed that result to weather and do not work around it with an approximate inverse. Repeat denied/timeout behavior without enabling IP fallback. Real-device success/network availability remains a separate check; this source audit and simulation are not it.

The parent must decide native-only/manual fallback versus an independently verified/fixed SDK build before activation. A runtime configuration handler is infrastructure, not evidence that the weather location feature is complete.

## Local execution evidence

- Configuration endpoint and routing tests were written first: the missing file-route failed, and the exact route-list assertion independently failed before the production implementation.
- Focused server/configuration suite: 55 passing tests. Full working tree: 177 passing tests, including the frontend engineer's 11 uncommitted lifecycle tests. Excluding that separate frontend suite, 166 server/baseline tests pass.
- Full `npm test`, `format:check`, `lint`, `check`, `build` and `git diff --check` passed. Existing ESLint deprecation hint, empty-notes and large-chunk warnings remain; none were suppressed.
- All 107 generated public JS/CSS files are byte-identical to the pre-server-change build: raw and gzip deltas are zero. No SDK or runtime binding value enters these assets. Generated invocation routes add only the exact configuration API; no `/_AMapService` route exists.
- Builds ran with the actual AMap env names unset in the child. Tests use fake public identifiers and a throwing private-binding getter; no private binding value is read.
- Local Wrangler was absent (`npx --no-install wrangler --version` reported a missing package). No dependency/auth workaround or package/lockfile change was made. `npm run build` validates Astro/static output, not Cloudflare's Functions packaging; parent should compile the Functions with the documented Wrangler command or verify its CI packaging before any publication.
- Evidence: `/workspace/weather-location-server-evidence-20261120/`; complete check log `/home/box/.cursor/projects/workspace/terminals/676421.txt`. No online configuration, deployment or push occurred.
