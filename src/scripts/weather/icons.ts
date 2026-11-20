import type { WeatherIcon } from './service.ts';
import { weatherIconPaths } from './icon-paths.ts';

/** Only internal, fixed SVG paths are interpolated. Default is the approved neutral unknown glyph. */
export function weatherIcon(name: WeatherIcon = 'unknown', size = 24) {
  const body = weatherIconPaths[name] ?? weatherIconPaths.unknown;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
