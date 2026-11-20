import { weatherConfig } from '../../config/weather.ts';

export type WeatherLang = 'zh' | 'en';
export type Place = { name: string; latitude: number; longitude: number; detail?: string; id?: number };
export type Weather = {
  temperature: number;
  code: number;
  isDay: boolean;
  high: number;
  low: number;
  time: number;
  timezone: string;
};
export type WeatherIcon = 'sun' | 'moon' | 'cloud' | 'partly' | 'fog' | 'rain' | 'snow' | 'storm' | 'unknown';
const codes: Record<number, [string, string, WeatherIcon]> = {
  0: ['晴', 'Clear sky', 'sun'],
  1: ['大部晴朗', 'Mainly clear', 'partly'],
  2: ['多云', 'Partly cloudy', 'partly'],
  3: ['阴', 'Overcast', 'cloud'],
  45: ['雾', 'Fog', 'fog'],
  48: ['雾凇', 'Rime fog', 'fog'],
  51: ['小毛毛雨', 'Light drizzle', 'rain'],
  53: ['毛毛雨', 'Moderate drizzle', 'rain'],
  55: ['强毛毛雨', 'Dense drizzle', 'rain'],
  56: ['小冻毛毛雨', 'Light freezing drizzle', 'rain'],
  57: ['强冻毛毛雨', 'Dense freezing drizzle', 'rain'],
  61: ['小雨', 'Slight rain', 'rain'],
  63: ['中雨', 'Moderate rain', 'rain'],
  65: ['大雨', 'Heavy rain', 'rain'],
  66: ['小冻雨', 'Light freezing rain', 'rain'],
  67: ['大冻雨', 'Heavy freezing rain', 'rain'],
  71: ['小雪', 'Slight snowfall', 'snow'],
  73: ['中雪', 'Moderate snowfall', 'snow'],
  75: ['大雪', 'Heavy snowfall', 'snow'],
  77: ['米雪', 'Snow grains', 'snow'],
  80: ['小阵雨', 'Slight rain showers', 'rain'],
  81: ['中阵雨', 'Moderate rain showers', 'rain'],
  82: ['强阵雨', 'Violent rain showers', 'rain'],
  85: ['小阵雪', 'Slight snow showers', 'snow'],
  86: ['大阵雪', 'Heavy snow showers', 'snow'],
  95: ['雷暴', 'Thunderstorm', 'storm'],
  96: ['雷暴伴小冰雹', 'Thunderstorm with slight hail', 'storm'],
  97: ['强雷暴', 'Heavy thunderstorm', 'storm'],
  99: ['雷暴伴大冰雹', 'Thunderstorm with heavy hail', 'storm'],
};
export function condition(code: number, lang: WeatherLang, isDay = true) {
  const entry = codes[code] ?? ['天气未知', 'Unknown conditions', 'unknown'];
  return { text: entry[lang === 'zh' ? 0 : 1], icon: (code === 0 && !isDay ? 'moon' : entry[2]) as WeatherIcon };
}
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid weather data');
  return v as Record<string, unknown>;
};
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
export function validPlace(v: unknown): v is Place {
  if (!v || typeof v !== 'object') return false;
  const p = v as Place;
  return (
    text(p.name) &&
    finite(p.latitude) &&
    Math.abs(p.latitude) <= 90 &&
    finite(p.longitude) &&
    Math.abs(p.longitude) <= 180 &&
    (p.detail === undefined || p.detail === '' || text(p.detail))
  );
}
export function parsePlaces(data: unknown): Place[] {
  const root = record(data);
  if (root.error) throw new Error('City search failed');
  if (root.results === undefined) return [];
  if (!Array.isArray(root.results)) throw new Error('Invalid city data');
  return root.results
    .filter(validPlace)
    .slice(0, 8)
    .map((raw) => {
      const p = raw as Place & Record<string, unknown>;
      return {
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        ...(Number.isInteger(p.id) ? { id: p.id } : {}),
        detail: [...new Set([p.admin2, p.admin1, p.country].filter(text))].join(' · '),
      };
    });
}
export function parseWeather(data: unknown): Weather {
  const root = record(data),
    c = record(root.current),
    d = record(root.daily);
  const high = Array.isArray(d.temperature_2m_max) ? d.temperature_2m_max[0] : undefined;
  const low = Array.isArray(d.temperature_2m_min) ? d.temperature_2m_min[0] : undefined;
  if (
    !finite(c.temperature_2m) ||
    !finite(c.weather_code) ||
    !Number.isInteger(c.weather_code) ||
    !finite(c.time) ||
    c.time <= 0 ||
    !finite(high) ||
    !finite(low) ||
    high < low ||
    !text(root.timezone) ||
    ![0, 1].includes(c.is_day as number)
  )
    throw new Error('Invalid weather data');
  // Reject invalid IANA zones rather than interpreting an unzoned timestamp as local time.
  new Intl.DateTimeFormat('en', { timeZone: root.timezone }).format();
  return {
    temperature: c.temperature_2m,
    code: c.weather_code,
    isDay: c.is_day === 1,
    high,
    low,
    time: c.time,
    timezone: root.timezone,
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
export function createWeatherService({
  fetcher = globalThis.fetch,
  now = Date.now,
  timeoutMs = weatherConfig.timeoutMs as number,
} = {}) {
  const cache = new Map<string, { at: number; value: Weather }>();
  async function request(url: URL, signal?: AbortSignal): Promise<unknown> {
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
      const res = await fetcher(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!res.ok) throw new Error('Weather service unavailable');
      return await res.json();
    } catch (error) {
      if (timedOut) throw new Error('Weather request timeout', { cause: error });
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  return {
    async search(query: string, lang: WeatherLang, signal?: AbortSignal): Promise<Place[]> {
      const name = query.trim().slice(0, 100);
      if (Array.from(name).length < 2) return [];
      const url = new URL(weatherConfig.search);
      url.search = new URLSearchParams({ name, language: lang, count: '8' }).toString();
      return parsePlaces(await request(url, signal));
    },
    async weather(place: Place, signal?: AbortSignal): Promise<Weather> {
      if (!validPlace(place)) throw new Error('Invalid location');
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const key = `${place.latitude},${place.longitude}`;
      const hit = cache.get(key);
      if (hit && now() - hit.at < weatherConfig.cacheMs) return hit.value;
      const url = new URL(weatherConfig.forecast);
      url.search = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current: 'temperature_2m,weather_code,is_day',
        daily: 'temperature_2m_max,temperature_2m_min',
        forecast_days: '1',
        timezone: 'auto',
        timeformat: 'unixtime',
        temperature_unit: 'celsius',
      }).toString();
      const value = parseWeather(await request(url, signal));
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (cache.size >= weatherConfig.maxCacheEntries) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: now(), value });
      return value;
    },
  };
}
export type WeatherService = ReturnType<typeof createWeatherService>;
