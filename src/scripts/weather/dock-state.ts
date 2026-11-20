import { refreshDockTooltip } from '../dock-tooltip.ts';
import { condition, type Place, type Weather, type WeatherLang } from './service.ts';
import { dockWeatherIcon } from './dock-icons.ts';

/** Presentation only: no requests, timers, persistence or location coordinates. */
export function createWeatherDock(doc: Document) {
  let snapshot: { name: string; code: number; isDay: boolean } | undefined;
  let unavailable = false;
  const label = (lang: WeatherLang): string => {
    if (!snapshot)
      return unavailable
        ? lang === 'zh'
          ? '天气暂不可用'
          : 'Weather unavailable'
        : lang === 'zh'
          ? '天气'
          : 'Weather';
    const city = snapshot.name === '@location' ? (lang === 'zh' ? '当前位置' : 'Current location') : snapshot.name;
    return `${city} · ${condition(snapshot.code, lang, snapshot.isDay).text} · ${lang === 'zh' ? '天气' : 'Weather'}`;
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
