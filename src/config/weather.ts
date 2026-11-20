/** Same-origin WeatherAPI routes. The key never leaves the server; the client has no SDK. */
export const weatherConfig = {
  search: '/api/weather/search',
  forecast: '/api/weather/forecast',
  cacheMs: 10 * 60 * 1000,
  currentMaxAgeMs: 60 * 60 * 1000,
  timeoutMs: 10000,
  storageKey: 'yh-weather-city-v1',
  maxCacheEntries: 12,
  queryMin: 2,
  queryMax: 80,
} as const;
