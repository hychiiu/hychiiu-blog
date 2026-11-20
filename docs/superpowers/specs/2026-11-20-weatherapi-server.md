# WeatherAPI Pages server contract

## Scope and ownership

The user selected a widely used global public weather service. Official WeatherAPI Free-compatible endpoints were verified with eight real requests (Shanghai/上海 and London/伦敦, forecasts in en/zh). This implementation replaces the abandoned AMap configuration interface, not an automatically enabled SDK/location proxy. Frontend code and UI belong to the frontend engineer; no device location was obtained or repaired. The five permanent release gates in README and DESIGN apply.

## Exact API

Production origins: `https://hychiiu.com`, `https://inbluemoon.com`. All responses are JSON, `private, no-store`, `nosniff`, no wildcard CORS. Browser source headers are defense in depth, not authentication: scripts can spoof them. Other hosts, including Pages default/preview hosts, are rejected so they cannot bypass the production zone rules. Runtime secret is mandatory; there is no unused activation flag.

- `GET /api/weather/search?q=<city>&lang=zh|en`: q is trimmed/NFC-normalized,2–80 Unicode code points, letters/marks/numbers and bounded city punctuation only. Control characters, URLs, IP-only values, colon modes (`auto:ip`, `id:`, `metar:`), duplicate/unknown query fields and missing/invalid lang are rejected. Result: `{provider:'weatherapi',results:WeatherPlace[],fetchedAt:number}`. Empty matches are a successful empty list. At most 8 candidates.
- `WeatherPlace`: `{provider:'weatherapi',id:number,name:string,region:string,country:string,latitude:number,longitude:number,detail:string}`. id is a positive safe integer; it is NOT a legacy GeoNames id. Coordinates are provider-search data, not a claim that arbitrary GCJ02 is accepted. Normal lookup uses id. Names/countries can follow the search input language; lang is not a city-translation guarantee. Render escaping and aliases remain frontend responsibilities.
- `GET /api/weather/forecast?cityId=<positive-safe-integer>`: only canonical decimal integer syntax, no duplicates/other query. Server constructs `q=id:<id>`; no client-controlled alternate query grammar.
- `POST /api/weather/forecast`: no query, JSON body at most 1024 bytes; exact `{coordinates:{latitude:number,longitude:number,system:'wgs84'}}`. Only finite bounded numeric coordinates. The client must know provenance (native standard geolocation/known-WGS84 legacy selection); the server cannot infer CRS from numbers. No shared coordinate cache or coordinate logs. GCJ02 must not be relabeled.
- Forecast result: `{provider:'weatherapi',weather:WeatherData,fetchedAt:number}`. `WeatherData={provider:'weatherapi',temperature:number,code:number,isDay:boolean,high:number,low:number,time:number,timezone:string,humidity:number,windKph:number,windDegree:number}`. time and fetchedAt are Unix **seconds**. code remains the native WeatherAPI code; current.is_day selects day/night, not daily dominant weather. high/low are explicit current-local-day max/min. No raw provider URL, response text, icon URL or credential is returned.

Unknown paths return 404; unsupported methods return 405 plus Allow; malformed inputs return 400 INVALID_REQUEST; unavailable key/transport/provider account returns 503 WEATHER_UNAVAILABLE; no city returns 404 LOCATION_NOT_FOUND; exhausted account/key quota returns 503 QUOTA_UNAVAILABLE; rate limit returns 429 RATE_LIMITED; deadline returns 504 UPSTREAM_TIMEOUT; malformed upstream returns 502 UPSTREAM_INVALID. Public text is supplied by frontend dictionaries, not hardcoded server prose.

## Transport, validation and lifecycle

Only `https://api.weatherapi.com/v1/search.json` and `/v1/forecast.json` are constructed in server code. Forecast parameters are fixed days=1/aqi=no/alerts=no. Secret is added only to the trusted HTTPS provider query. Fetch uses redirect:error; no redirect or arbitrary-host forwarding. No account/payment/upgrade API is called.

An 8-second deadline covers fetch, complete response stream, UTF-8/JSON decoding and pure schema validation; incoming body has at most 2 seconds. Responses are capped at 524288 bytes, declared length and streaming length are checked, malformed UTF-8/JSON fail closed. Reader cancellation and locks are cleaned on oversize/abort/early MIME/status rejection. Plain HTML/provider error details cannot be reflected into app output. No raw URL/body/coordinate logging. Before enabling production, verify platform automatic traces/Logpush do not retain complete outgoing credential-bearing URLs; use supported redaction or disable that sensitive capture. This task does not silently enable such tracing or claim the online logging configuration has been audited.

Schema checks include finite ranges, native 0/1 day flag, safe integer code/id/epoch, IANA timezone, UTC-epoch→source-local agreement for observation/location, current-local forecast date, and ordered daily extrema. Unknown valid integer codes remain unknown for the frontend provider map, not fabricated WMO equivalents. Live 1036 haze and 1063 rain must be covered by the frontend mapping/dictionary tests.

No mutable request state, provider promises or credentials are saved across Worker requests. This batch deliberately relies on the existing frontend 10-minute success cache, same-location coalescing, request supersession and router lifecycle; it does not invent a misleading globally shared in-memory limiter. All server responses are no-store. Future shared city caching can use an approved platform cache, but coordinate requests must remain private. Provider terms cap current-data caching at 60 minutes; frontend snapshots may not be retained indefinitely. Source credit/link is mandatory for Free.

## WAF rules — parent applies and verifies, not written here

Read-only zone evidence previously showed both production domains on Free with one unused rate-rule slot each. Recheck before changing anything. Proposed rule per zone:

```text
http.request.uri.path in {"/api/weather/search" "/api/weather/forecast"}
```

IP counting characteristics `cf.colo.id`, `ip.src`, 20 requests/10 seconds, block 10 seconds. This is an initial per-location/IP burst proposal, NOT WeatherAPI account-global 10 QPS enforcement or protection against all distributed quota depletion. Monitor legitimate shared-IP use. Confirm no force-cache rule overrides no-store. Pages default hosts fail app host checks; do not bind production secrets to unreviewed preview deployments. Provider Free has a hard monthly pause rather than automatic overage billing; do not upgrade/add automatic top-ups without approval. No paid product/new resource is provisioned.

## Runtime secret and parent-only deployment steps

The shell's current `BLOG_WEATHERAPI_KEY` is a **share URL**, not the extracted key. Never upload it. Local validation reads only `/home/box/.config/blog-ops-secrets/weatherapi-key` (600, parent directory 700). Production reads only context.env.BLOG_WEATHERAPI_KEY. GitHub variables do not automatically become Pages runtime bindings.

After the parent’s integrated acceptance under the existing release authorization, an already authorized Wrangler session targeting the correct account/project can upload the protected file through stdin; never through command arguments, source, stdout or shell tracing. Inspect installed `pages secret put --help` first. The documented form is:

```sh
wrangler pages secret put BLOG_WEATHERAPI_KEY --project-name hychiiu-blog --env production < /home/box/.config/blog-ops-secrets/weatherapi-key
```

This is an instruction for the parent, **not executed by this task**. Verify the production environment and CLI auth/permissions first; do not scrape connector tokens for CLI authentication. If preview binding is separately requested, handle it explicitly rather than assuming inheritance. Confirm the required binding is in the exact deployed environment before release. Builds run with actual key/link env names unset. Do not put credentials in `.env`, generated JS, the Functions artifact or local fixtures.

## Verification and remaining gates

Plan: `docs/superpowers/plans/2026-11-20-weatherapi-server.md`. Tests use synthetic identifiers/bindings; live checks use only public cities, no personal location. Capture full automated checks and separate Wrangler Pages Functions compilation (Astro build alone does not compile Functions). Wrangler 4.165.0 is installed/pinned in an isolated tooling project, leaving shared dependency files untouched. Focused server/middleware tests: 118 passed; standalone types/lint, static build, exact routes and independent Functions compilation pass. Three real exported-handler requests pass. Full-repository checks currently fail in frontend-owned migration work; execution details and exact remaining failures are recorded in the plan, not waived. Server-only client JS/CSS growth is 0 bytes in matched-source builds. No online secret/configuration was changed.

Before publish: independent five-gate code review, frontend/provider integration and unknown/clear-day/night regression review, both-domain WAF/secret checks, real UI search/IME/tooltip/navigation/expiry checks, exact deployment CI/Pages success and asset/API smoke checks. Current evidence does not prove account has exited the initial paid-tier trial or that China-network/production-Cloudflare paths work. No SDK was added and native code3 remains a device/browser issue, not a fixed weather API issue.

## Official references

- https://www.weatherapi.com/docs/error-codes/

- https://www.weatherapi.com/docs/request-parameters/
- https://www.weatherapi.com/docs/search-api/
- https://www.weatherapi.com/docs/realtime-api/
- https://www.weatherapi.com/docs/forecast-api/
- https://www.weatherapi.com/terms.aspx
- https://www.weatherapi.com/pricing.aspx
- https://developers.cloudflare.com/pages/functions/routing/
- https://developers.cloudflare.com/workers/wrangler/commands/pages/
- https://developers.cloudflare.com/waf/rate-limiting-rules/
