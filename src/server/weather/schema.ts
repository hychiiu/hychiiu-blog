import { ApiError } from './http.ts';

type RecordValue = Record<string, unknown>;
export type WeatherPlace = {
  provider: 'weatherapi';
  id: number;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  detail: string;
};
export type WeatherData = {
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
const invalid = (): never => {
  throw new ApiError('UPSTREAM_INVALID', 502);
};
export function record(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValue) : invalid();
}
function text(value: unknown, empty = false): string {
  return typeof value === 'string' &&
    (empty || value.trim().length > 0) &&
    value.length <= 200 &&
    !/\p{Cc}/u.test(value)
    ? value
    : invalid();
}
function number(value: unknown, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : invalid();
}
function integer(value: unknown, min: number, max: number): number {
  const result = number(value, min, max);
  return Number.isSafeInteger(result) ? result : invalid();
}

/** Search identifiers live in this provider's namespace, not the old GeoNames namespace. */
export function parsePlaces(data: unknown): WeatherPlace[] {
  if (!Array.isArray(data)) return invalid();
  return data.slice(0, 8).map((raw) => {
    const p = record(raw);
    const region = p.region === undefined ? '' : text(p.region, true);
    const country = text(p.country);
    return {
      provider: 'weatherapi',
      id: integer(p.id, 1, Number.MAX_SAFE_INTEGER),
      name: text(p.name),
      region,
      country,
      latitude: number(p.lat, -90, 90),
      longitude: number(p.lon, -180, 180),
      detail: [...new Set([region, country].filter(Boolean))].join(' · '),
    };
  });
}

/** Assemble source-local strings from UTC seconds without using the server's timezone. */
function localTime(epoch: number, timezone: string): string {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date(epoch * 1000))
        .map(({ type, value }) => [type, value]),
    );
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  } catch {
    return invalid();
  }
}

/** Preserve observed epoch, explicit daily extrema and the native WeatherAPI code/day flag. */
export function parseForecast(data: unknown, now: number): WeatherData {
  const root = record(data);
  const location = record(root.location);
  const timezone = text(location.tz_id);
  const locationEpoch = integer(location.localtime_epoch, 0, now / 1000 + 300);
  if (text(location.localtime) !== localTime(locationEpoch, timezone)) return invalid();
  const current = record(root.current);
  const observed = integer(current.last_updated_epoch, 0, now / 1000 + 300);
  if (text(current.last_updated) !== localTime(observed, timezone)) return invalid();
  const days = record(root.forecast).forecastday;
  if (!Array.isArray(days) || days.length !== 1) return invalid();
  const first = record(days[0]);
  if (first.date !== localTime(now / 1000, timezone).slice(0, 10)) return invalid();
  const daily = record(first.day);
  const high = number(daily.maxtemp_c, -150, 100);
  const low = number(daily.mintemp_c, -150, 100);
  if (low > high || (current.is_day !== 0 && current.is_day !== 1)) return invalid();
  return {
    provider: 'weatherapi',
    temperature: number(current.temp_c, -150, 100),
    code: integer(record(current.condition).code, 0, 1_000_000),
    isDay: current.is_day === 1,
    high,
    low,
    time: observed,
    timezone,
    humidity: number(current.humidity, 0, 100),
    windKph: number(current.wind_kph, 0, 1000),
    windDegree: number(current.wind_degree, 0, 360),
  };
}
