import type { WeatherIcon } from './service.ts';
const cloud = '<path d="M6 19h12a4 4 0 0 0 .3-8 6 6 0 0 0-11.5-1A4.5 4.5 0 0 0 6 19Z"/>';
const paths: Record<WeatherIcon, string> = {
  cloud,
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/>',
  partly:
    '<path d="M9 5V3M4 7 2.5 5.5M3 11H1m14-5 1-1M6 12a4 4 0 1 1 6-4"/><path d="M9 20h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9-2 4.5 4.5 0 0 0 0 9Z"/>',
  fog: '<path d="M4 10h16M2 14h20M5 18h14M6 6h12"/>',
  rain: '<path d="M6 15h12a4 4 0 0 0 0-8 5 5 0 0 0-9-1 4.5 4.5 0 0 0-3 9Zm1 3-1 3m6-3-1 3m6-3-1 3"/>',
  snow: '<path d="M6 14h12a4 4 0 0 0 0-8 5 5 0 0 0-9-1 4.5 4.5 0 0 0-3 9ZM7 18v4m-2-2h4m7-2v4m-2-2h4"/>',
  storm: '<path d="M6 15H5a4.5 4.5 0 0 1 4-8 5 5 0 0 1 9 1 3.5 3.5 0 0 1 1 7m-6-4-4 6h5l-3 5"/>',
  unknown: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5m0 3h.01"/>',
};
/** Only internal, fixed SVG paths are interpolated. */
export function weatherIcon(name: WeatherIcon = 'partly') {
  return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}
