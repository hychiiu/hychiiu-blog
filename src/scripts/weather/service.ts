import { weatherConfig } from '../../config/weather.ts';
import { condition, type WeatherIcon, type WeatherLang } from './conditions.ts';

export type { WeatherIcon, WeatherLang };
export { condition };

export type WeatherProvider = 'weatherapi';
export type Place = {
  name: string;
  latitude: number;
  longitude: number;
  detail?: string;
  id?: number;
  provider?: 'weatherapi' | 'legacy-wgs84';
  region?: string;
  country?: string;
};
export type Weather = {
  provider: 'weatherapi';
  temperature: number;
  code: number;
  isDay: boolean;
  high: number;
  low: number;
  time: number;
  timezone: string;
  humidity: number;
  windKph: number;
  windDegree: number;
};

export class WeatherRequestError extends Error {
  readonly code: string;
  constructor(code: string, message = code) {
    super(message);
    this.name = 'WeatherRequestError';
    this.code = code;
  }
}

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid weather data');
  return v as Record<string, unknown>;
};
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
const safeId = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) > 0 && (v as number) <= Number.MAX_SAFE_INTEGER;

export function validCoords(latitude: unknown, longitude: unknown): boolean {
  return finite(latitude) && Math.abs(latitude) <= 90 && finite(longitude) && Math.abs(longitude) <= 180;
}

export function validPlace(v: unknown): v is Place {
  if (!v || typeof v !== 'object') return false;
  const p = v as Place;
  return (
    text(p.name) &&
    validCoords(p.latitude, p.longitude) &&
    (p.detail === undefined || p.detail === '' || text(p.detail))
  );
}

export function isWeatherApiPlace(v: unknown): v is Place & { provider: 'weatherapi'; id: number } {
  if (!validPlace(v)) return false;
  const p = v as Place;
  return p.provider === 'weatherapi' && safeId(p.id);
}

/** Read stored selection. Legacy GeoNames ids are dropped so they can never be sent as WeatherAPI ids. Does not write storage. */
export function readStoredPlace(v: unknown): Place | undefined {
  if (!validPlace(v) || (v as Place).name === '@location') return undefined;
  if (isWeatherApiPlace(v)) {
    const p = v as Place;
    return {
      provider: 'weatherapi',
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      detail: p.detail,
      region: text(p.region) ? p.region : undefined,
      country: text(p.country) ? p.country : undefined,
    };
  }
  const p = v as Place;
  return {
    provider: 'legacy-wgs84',
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    ...(p.detail ? { detail: p.detail } : {}),
  };
}

export function persistablePlace(place: Place): Place | undefined {
  if (isWeatherApiPlace(place)) return readStoredPlace(place);
  if (validPlace(place) && place.name !== '@location') {
    return {
      provider: 'legacy-wgs84',
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      ...(place.detail ? { detail: place.detail } : {}),
    };
  }
  return undefined;
}

export function isCurrentStale(
  weather: { time: number },
  nowMs: number,
  maxAgeMs = weatherConfig.currentMaxAgeMs,
): boolean {
  return nowMs / 1000 - weather.time > maxAgeMs / 1000;
}
export function parsePlaces(data: unknown): Place[] {
  const root = record(data);
  if (root.provider !== 'weatherapi') throw new Error('Invalid city data');
  if (root.results === undefined) return [];
  if (!Array.isArray(root.results)) throw new Error('Invalid city data');
  const out: Place[] = [];
  for (const raw of root.results) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const p = raw as Record<string, unknown>;
    const id = p.id,
      name = p.name,
      latitude = p.latitude,
      longitude = p.longitude;
    if (
      p.provider !== 'weatherapi' ||
      !safeId(id) ||
      !text(name) ||
      !finite(latitude) ||
      !finite(longitude) ||
      !validCoords(latitude, longitude)
    )
      continue;
    const region = text(p.region) ? p.region : '';
    const country = text(p.country) ? p.country : '';
    const detail = text(p.detail) ? p.detail : [...new Set([region, country].filter(Boolean))].join(' · ');
    if (detail && !text(detail) && detail !== '') continue;
    out.push({
      provider: 'weatherapi',
      id,
      name,
      latitude,
      longitude,
      region: region || undefined,
      country: country || undefined,
      detail,
    });
    if (out.length === 8) break;
  }
  return out;
}

export function parseWeather(data: unknown): Weather {
  const root = record(data);
  if (root.provider !== 'weatherapi') throw new Error('Invalid weather data');
  const w = record(root.weather);
  if (w.provider !== 'weatherapi') throw new Error('Invalid weather data');
  if (
    !finite(w.temperature) ||
    !Number.isInteger(w.code) ||
    !finite(w.code) ||
    typeof w.isDay !== 'boolean' ||
    !finite(w.high) ||
    !finite(w.low) ||
    w.high < w.low ||
    !finite(w.time) ||
    w.time <= 0 ||
    !text(w.timezone) ||
    !finite(w.humidity) ||
    !finite(w.windKph) ||
    !finite(w.windDegree)
  )
    throw new Error('Invalid weather data');
  new Intl.DateTimeFormat('en', { timeZone: w.timezone }).format();
  return {
    provider: 'weatherapi',
    temperature: w.temperature,
    code: w.code,
    isDay: w.isDay,
    high: w.high,
    low: w.low,
    time: w.time,
    timezone: w.timezone,
    humidity: w.humidity,
    windKph: w.windKph,
    windDegree: w.windDegree,
  };
}

export function cityTime(time: number, timezone: string, lang: WeatherLang) {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(time * 1000));
}

function apiUrl(path: string, origin?: string): URL {
  const base = origin ?? ((typeof location !== 'undefined' && location.origin) || 'http://127.0.0.1');
  return new URL(path, base);
}

const errorByStatus: Record<number, string> = {
  400: 'INVALID_REQUEST',
  404: 'LOCATION_NOT_FOUND',
  429: 'RATE_LIMITED',
  502: 'UPSTREAM_INVALID',
  503: 'WEATHER_UNAVAILABLE',
  504: 'UPSTREAM_TIMEOUT',
};

export function createWeatherService({
  fetcher = globalThis.fetch,
  now = Date.now,
  timeoutMs = weatherConfig.timeoutMs as number,
  origin,
}: {
  fetcher?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  origin?: string;
} = {}) {
  const cache = new Map<string, { at: number; value: Weather }>();
  const inflight = new Map<string, Promise<Weather>>();

  async function request(url: URL, init: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const res = await fetcher(url, {
        ...init,
        signal: controller.signal,
        credentials: 'same-origin',
        referrerPolicy: 'no-referrer',
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok) {
        const reported =
          body && typeof body === 'object' && !Array.isArray(body) ? (body as { code?: unknown }).code : undefined;
        const code =
          typeof reported === 'string' && reported ? reported : (errorByStatus[res.status] ?? 'WEATHER_UNAVAILABLE');
        throw new WeatherRequestError(code);
      }
      return body;
    } catch (error) {
      if (error instanceof WeatherRequestError) throw error;
      if (timedOut) throw new WeatherRequestError('UPSTREAM_TIMEOUT', 'Weather request timeout');
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  function cacheGet(key: string): Weather | undefined {
    const hit = cache.get(key);
    if (!hit) return undefined;
    if (now() - hit.at >= weatherConfig.cacheMs || isCurrentStale(hit.value, now())) {
      cache.delete(key);
      return undefined;
    }
    return hit.value;
  }

  function cacheSet(key: string, value: Weather) {
    if (isCurrentStale(value, now())) return;
    if (cache.size >= weatherConfig.maxCacheEntries) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: now(), value });
  }

  return {
    async search(query: string, lang: WeatherLang, signal?: AbortSignal): Promise<Place[]> {
      const name = Array.from(query.trim()).slice(0, weatherConfig.queryMax).join('');
      if (Array.from(name).length < weatherConfig.queryMin) return [];
      const url = apiUrl(weatherConfig.search, origin);
      url.search = new URLSearchParams({ q: name, lang }).toString();
      return parsePlaces(await request(url, {}, signal));
    },
    async weather(place: Place, signal?: AbortSignal): Promise<Weather> {
      if (!validPlace(place)) throw new Error('Invalid location');
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      let key: string;
      let send: () => Promise<unknown>;
      if (isWeatherApiPlace(place)) {
        key = `weatherapi:${place.id}`;
        const url = apiUrl(weatherConfig.forecast, origin);
        url.search = new URLSearchParams({ cityId: String(place.id) }).toString();
        send = () => request(url, {}, signal);
      } else if (validCoords(place.latitude, place.longitude)) {
        key = `wgs84:${place.latitude},${place.longitude}`;
        send = () =>
          request(
            apiUrl(weatherConfig.forecast, origin),
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                coordinates: { latitude: place.latitude, longitude: place.longitude, system: 'wgs84' },
              }),
            },
            signal,
          );
      } else {
        throw new Error('Invalid location');
      }
      const cached = cacheGet(key);
      if (cached) return cached;
      if (!signal) {
        const pending = inflight.get(key);
        if (pending) return pending;
      }
      const run = (async () => {
        const value = parseWeather(await send());
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        cacheSet(key, value);
        return value;
      })();
      if (!signal) inflight.set(key, run);
      try {
        return await run;
      } finally {
        inflight.delete(key);
      }
    },
  };
}
export type WeatherService = ReturnType<typeof createWeatherService>;
