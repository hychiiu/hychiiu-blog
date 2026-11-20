import zh from '../../i18n/zh.ts';
import en from '../../i18n/en.ts';
import { refreshDockTooltip } from '../dock-tooltip.ts';
import { condition, isCurrentStale, type Place, type Weather, type WeatherLang } from './service.ts';
import { dockWeatherIcon } from './dock-icons.ts';

/**
 * One presentation snapshot per document, retained with the ClientRouter Dock.
 * The controller calls success/failed only after its request-generation guards,
 * and sync after a locale/navigation swap; a new document starts neutral.
 * Observations older than 60 minutes are cleared on sync without fetching.
 * No requests, timers, persistence or location coordinates are owned here.
 */
export function createWeatherDock(doc: Document, { now = Date.now }: { now?: () => number } = {}) {
  let snapshot: { name: string; code: number; isDay: boolean; time: number } | undefined;
  let unavailable = false;
  const current = () => {
    if (snapshot && isCurrentStale({ time: snapshot.time }, now())) {
      snapshot = undefined;
      unavailable = false;
    }
    return snapshot;
  };
  const label = (lang: WeatherLang): string => {
    const text = { zh, en }[lang];
    const snap = current();
    if (!snap) return text[unavailable ? 'weather.dock.unavailable' : 'weather.dock.label'];
    const city = snap.name === '@location' ? text['weather.dock.currentLocation'] : snap.name;
    return text['weather.dock.summary'](city, condition(snap.code, lang, snap.isDay).text);
  };
  function sync(): void {
    const button = doc.querySelector<HTMLButtonElement>('[data-weather-toggle]');
    if (!button) return;
    const lang: WeatherLang = doc.documentElement.dataset.lang === 'en' ? 'en' : 'zh';
    const snap = current();
    const icon = snap ? condition(snap.code, lang, snap.isDay).icon : 'unknown';
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
      snapshot = { name: place.name, code: weather.code, isDay: weather.isDay, time: weather.time };
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
