import zh from '../../i18n/zh.ts';
import en from '../../i18n/en.ts';
import { refreshDockTooltip } from '../dock-tooltip.ts';
import { condition, type Place, type Weather, type WeatherLang } from './service.ts';
import { dockWeatherIcon } from './dock-icons.ts';

/**
 * One presentation snapshot per document, retained with the ClientRouter Dock.
 * The controller calls success/failed only after its request-generation guards,
 * and sync after a locale/navigation swap; a new document starts neutral.
 * No requests, timers, persistence or location coordinates are owned here.
 */
export function createWeatherDock(doc: Document) {
  let snapshot: { name: string; code: number; isDay: boolean } | undefined;
  let unavailable = false;
  const label = (lang: WeatherLang): string => {
    const text = { zh, en }[lang];
    if (!snapshot) return text[unavailable ? 'weather.dock.unavailable' : 'weather.dock.label'];
    const city = snapshot.name === '@location' ? text['weather.dock.currentLocation'] : snapshot.name;
    return text['weather.dock.summary'](city, condition(snapshot.code, lang, snapshot.isDay).text);
  };
  function sync(): void {
    const button = doc.querySelector<HTMLButtonElement>('[data-weather-toggle]');
    if (!button) return;
    const lang: WeatherLang = doc.documentElement.dataset.lang === 'en' ? 'en' : 'zh';
    const icon = snapshot ? condition(snapshot.code, lang, snapshot.isDay).icon : 'unknown';
    button.innerHTML = dockWeatherIcon(icon);
    // Dock's existing navigation sync reads these attributes after a locale swap.
    button.dataset.labelZh = label('zh');
    button.dataset.labelEn = label('en');
    button.setAttribute('aria-label', label(lang));
    const tip = button.parentElement?.querySelector('.dock-tip');
    if (tip) tip.textContent = label(lang);
    const dock = button.closest<HTMLElement>('[data-dock]');
    if (dock) refreshDockTooltip(dock);
  }
  return {
    sync,
    success(place: Place, weather: Weather): void {
      snapshot = { name: place.name, code: weather.code, isDay: weather.isDay };
      unavailable = false;
      sync();
    },
    failed(): void {
      snapshot = undefined;
      unavailable = true;
      sync();
    },
  };
}
