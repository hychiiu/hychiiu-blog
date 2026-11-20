import { cityTime, condition, type Place, type Weather, type WeatherLang } from './service.ts';
import { weatherIcon } from './icons.ts';
import zh from '../../i18n/zh.ts';
import en from '../../i18n/en.ts';
const ui = { zh, en };

export type WeatherState = {
  mode: 'choice' | 'search' | 'locating' | 'loading' | 'weather' | 'error';
  place?: Place;
  weather?: Weather;
  message?: string;
  query?: string;
  candidates?: Place[];
  searching?: boolean;
  searched?: boolean;
};

export const escapeHTML = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function copy(lang: WeatherLang) {
  return ui[lang];
}

function button(action: string, label: string, primary = false) {
  return `<button type="button" class="weather-button${primary ? ' is-primary' : ''}" data-weather-action="${action}">${label}</button>`;
}

function title(text: string) {
  return `<header class="weather-heading"><h2 id="weather-title">${text}</h2>${weatherIcon()}</header>`;
}

function status(text: string) {
  return `<p class="weather-status" role="status">${escapeHTML(text)}</p>`;
}

function privacy(lang: WeatherLang) {
  const t = copy(lang);
  return `<p class="weather-privacy">${t['weather.provider']}</p><details class="weather-credit"><summary>${t['weather.privacyLink']}</summary><p>${t['weather.retention']}</p><p><a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener noreferrer" data-astro-reload>${t['weather.terms']}</a></p></details>`;
}

function credits() {
  return `<p class="weather-credit"><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" data-astro-reload>Open-Meteo</a> · <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" data-astro-reload>GeoNames</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" data-astro-reload>CC BY 4.0</a></p>`;
}

function searchForm(state: WeatherState, lang: WeatherLang, heading: string, intro: boolean) {
  const t = copy(lang);
  const esc = escapeHTML;
  const candidates = state.candidates ?? [];
  const statusText = state.searching
    ? t['weather.searching']
    : state.message
      ? state.message
      : state.searched && !candidates.length
        ? t['weather.empty']
        : '';
  const back = state.weather ? button('back', t['weather.back']) : '';
  return `${title(heading)}${intro ? `<p class="weather-intro">${t['weather.privacy']}</p>` : ''}
   <form data-weather-form><label for="weather-query">${t['weather.city']}</label><div class="weather-search-row"><input id="weather-query" name="city" type="search" autocomplete="off" maxlength="100" required value="${esc(state.query ?? '')}" aria-describedby="weather-search-hint" /><button type="submit" class="weather-button">${t['weather.search']}</button></div><p id="weather-search-hint" class="weather-hint">${t['weather.hint']}</p></form>
   <div class="weather-status-slot">${statusText ? status(statusText) : ''}</div>
   <ul class="weather-candidates">${candidates.map((p, i) => `<li><button type="button" data-weather-city="${i}"><span>${esc(p.name)}</span><small>${esc(p.detail ?? '')} · ${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}</small></button></li>`).join('')}</ul>
   <div class="weather-actions">${button('locate', t['weather.locate'])}${back}</div>${credits()}${privacy(lang)}`;
}

export function renderWeather(state: WeatherState, lang: WeatherLang): string {
  const t = copy(lang);
  const esc = escapeHTML;
  if (state.mode === 'weather' && state.weather && state.place) {
    const w = state.weather,
      p = state.place,
      c = condition(w.code, lang, w.isDay);
    const name = p.name === '@location' ? t['weather.dock.currentLocation'] : p.name;
    return `<h2 id="weather-title" class="weather-city">${esc(name)}</h2>${p.detail ? `<p class="weather-region">${esc(p.detail)}</p>` : ''}
   <div class="weather-current"><div><div class="weather-temperature">${Math.round(w.temperature)}<span>°C</span></div><p class="weather-description">${c.text}</p></div><div class="weather-symbol">${weatherIcon(c.icon)}</div></div>
   <p class="weather-range">${t['weather.high']} ${Math.round(w.high)}° <span>·</span> ${t['weather.low']} ${Math.round(w.low)}°</p>
   <footer class="weather-footer"><p><span>${t['weather.time']} ${esc(cityTime(w.time, w.timezone, lang))}</span><span>${t['weather.local']} · ${esc(w.timezone)}</span></p><button type="button" data-weather-action="manual">${t['weather.change']}</button></footer>
   <p class="weather-credit">${t['weather.model']} <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" data-astro-reload>Weather data by Open-Meteo.com</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" data-astro-reload>CC BY 4.0</a></p>`;
  }
  if (state.mode === 'search') return searchForm(state, lang, t['weather.change'], false);
  if (state.mode === 'choice') return searchForm(state, lang, t['weather.title'], true);
  if (state.mode === 'locating' || state.mode === 'loading')
    return `${title(t['weather.title'])}${status(state.mode === 'locating' ? t['weather.locating'] : t['weather.loading'])}<div class="weather-actions">${button('manual', t['weather.manual'])}</div>${credits()}${privacy(lang)}`;
  if (state.mode === 'error')
    return `${title(t['weather.title'])}${status(state.message ?? '')}<div class="weather-actions">${button('retry', t['weather.retry'], true)}${button('manual', t['weather.manual'])}</div>${credits()}${privacy(lang)}`;
  return searchForm(state, lang, t['weather.title'], true);
}
