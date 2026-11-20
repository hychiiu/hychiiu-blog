/** Public, keyless non-commercial API. No visitor requests pass through this site. */
export const weatherConfig = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  search: 'https://geocoding-api.open-meteo.com/v1/search',
  cacheMs: 10 * 60 * 1000,
  timeoutMs: 10000,
  storageKey: 'yh-weather-city-v1',
  maxCacheEntries: 12,
} as const;
