import type { WeatherIcon } from './service.ts';
import { weatherIcon } from './icons.ts';

/** Dock entrance uses the shared approved v2 paths at 20px. */
export function dockWeatherIcon(icon: WeatherIcon = 'unknown'): string {
  return weatherIcon(icon, 20);
}
