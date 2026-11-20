import { ApiError, json, readJson, withDeadline } from './http.ts';
import { parseForecast, parsePlaces, record } from './schema.ts';

/** Minimal runtime dependency contract, not a build-time environment lookup. */
export type WeatherBindings = { BLOG_WEATHERAPI_KEY?: string };
type Dependencies = { fetch?: typeof globalThis.fetch; now?: () => number; timeoutMs?: number };
type Query = { kind: 'search' | 'forecast'; value: string };
const origins = new Set(['https://hychiiu.com', 'https://inbluemoon.com']);
const paths = new Map<string, Query['kind']>([
  ['/api/weather/search', 'search'],
  ['/api/weather/forecast', 'forecast'],
] as const);
const bad = (): never => {
  throw new ApiError('INVALID_REQUEST', 400);
};

/** Browser source headers are defense in depth, never authentication or a quota limiter. */
function checkSource(request: Request, url: URL): void {
  if (!origins.has(url.origin)) throw new ApiError('FORBIDDEN', 403);
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if ((origin !== null && origin !== url.origin) || (site !== null && site !== 'same-origin' && site !== 'none'))
    throw new ApiError('FORBIDDEN', 403);
  const referer = request.headers.get('referer');
  if (referer !== null) {
    try {
      const value = new URL(referer);
      if (value.origin === url.origin && !value.username && !value.password) return;
    } catch {
      /* A malformed source is rejected without reflecting it. */
    }
    throw new ApiError('FORBIDDEN', 403);
  }
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function parameters(url: URL, keys: string[]): void {
  if (
    Array.from(url.searchParams).length !== keys.length ||
    !keys.every((key) => url.searchParams.getAll(key).length === 1)
  )
    bad();
}
async function query(request: Request, url: URL, kind: 'search' | 'forecast', timeoutMs: number): Promise<Query> {
  if (kind === 'search') {
    parameters(url, ['q', 'lang']);
    const raw = url.searchParams.get('q') ?? '';
    if (/\p{Cc}/u.test(raw)) return bad();
    const value = raw.trim().normalize('NFC');
    if (
      Array.from(value).length < 2 ||
      Array.from(value).length > 80 ||
      !/^[\p{L}\p{M}\p{N} .,'’()-]+$/u.test(value) ||
      !/\p{L}/u.test(value)
    )
      return bad();
    if (!['zh', 'en'].includes(url.searchParams.get('lang') ?? '')) return bad();
    return { kind, value };
  }
  if (request.method === 'GET') {
    parameters(url, ['cityId']);
    const id = url.searchParams.get('cityId') ?? '';
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return bad();
    return { kind, value: `id:${id}` };
  }
  parameters(url, []);
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' ||
    !['identity', null].includes(request.headers.get('content-encoding'))
  )
    return bad();
  let root: Record<string, unknown>;
  try {
    root = record(
      await withDeadline(Math.min(2000, timeoutMs), (signal) => readJson(request, 1024, signal), request.signal),
    );
  } catch (error) {
    if (error instanceof ApiError && ['UPSTREAM_TIMEOUT', 'WEATHER_UNAVAILABLE'].includes(error.code)) throw error;
    return bad();
  }
  if (!exactKeys(root, ['coordinates'])) return bad();
  let point: Record<string, unknown>;
  try {
    point = record(root.coordinates);
  } catch {
    return bad();
  }
  if (
    !exactKeys(point, ['latitude', 'longitude', 'system']) ||
    point.system !== 'wgs84' ||
    typeof point.latitude !== 'number' ||
    !Number.isFinite(point.latitude) ||
    Math.abs(point.latitude) > 90 ||
    typeof point.longitude !== 'number' ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.longitude) > 180
  )
    return bad();
  // Coordinates stay request-local. There is deliberately no shared coordinate cache or log.
  return { kind, value: `${point.latitude},${point.longitude}` };
}

function providerError(data: unknown): void {
  const error = record(data).error;
  if (error === undefined) return;
  const code = record(error).code;
  if (code === 1006) throw new ApiError('LOCATION_NOT_FOUND', 404);
  if (code === 2007 || code === 2011) throw new ApiError('QUOTA_UNAVAILABLE', 503);
  if (code === 2012) throw new ApiError('RATE_LIMITED', 429);
  throw new ApiError('WEATHER_UNAVAILABLE', 503);
}

/** Factory holds only immutable dependencies; env, I/O and coordinates are request-owned. */
export function createWeatherApi(dependencies: Dependencies = {}) {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? Date.now;
  const timeoutMs = dependencies.timeoutMs ?? 8000;
  return async (request: Request, env: WeatherBindings): Promise<Response> => {
    let allow: string | undefined;
    try {
      const url = new URL(request.url);
      checkSource(request, url);
      const kind = paths.get(url.pathname);
      if (!kind) throw new ApiError('NOT_FOUND', 404);
      allow = kind === 'search' ? 'GET' : 'GET, POST';
      if (!(kind === 'search' ? ['GET'] : ['GET', 'POST']).includes(request.method))
        throw new ApiError('METHOD_NOT_ALLOWED', 405);
      const input = await query(request, url, kind, timeoutMs);
      const key = env.BLOG_WEATHERAPI_KEY;
      if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{20,128}$/.test(key))
        throw new ApiError('WEATHER_UNAVAILABLE', 503);
      const timestamp = now();
      const result = await withDeadline(
        timeoutMs,
        async (signal) => {
          const upstream = new URL(
            `https://api.weatherapi.com/v1/${kind === 'search' ? 'search.json' : 'forecast.json'}`,
          );
          upstream.searchParams.set('key', key);
          upstream.searchParams.set('q', input.value);
          if (kind === 'forecast') {
            upstream.searchParams.set('days', '1');
            upstream.searchParams.set('aqi', 'no');
            upstream.searchParams.set('alerts', 'no');
          }
          const response = await fetcher(upstream, {
            redirect: 'error',
            signal,
            headers: { accept: 'application/json' },
          });
          let rejection: ApiError | undefined;
          if (response.status >= 300 && response.status < 400) rejection = new ApiError('UPSTREAM_INVALID', 502);
          else if (response.status === 429) rejection = new ApiError('RATE_LIMITED', 429);
          else if (response.status >= 500) rejection = new ApiError('WEATHER_UNAVAILABLE', 503);
          else if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
            rejection = new ApiError('UPSTREAM_INVALID', 502);
          if (rejection) {
            // No raw error body is needed; release its stream before returning a fixed error.
            await response.body?.cancel().catch(() => {});
            throw rejection;
          }
          const data = await readJson(response, 524288, signal);
          if (!Array.isArray(data)) providerError(data);
          if (!response.ok) throw new ApiError('WEATHER_UNAVAILABLE', 503);
          return kind === 'search' ? { results: parsePlaces(data) } : { weather: parseForecast(data, timestamp) };
        },
        request.signal,
      );
      return json({ provider: 'weatherapi', ...result, fetchedAt: Math.floor(timestamp / 1000) });
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError('WEATHER_UNAVAILABLE', 503);
      return json({ code: failure.code }, failure.status, failure.status === 405 && allow ? { allow } : {});
    }
  };
}

export const weatherApi = createWeatherApi();
