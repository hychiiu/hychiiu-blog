import { cityTime, condition, type Place, type Weather, type WeatherLang } from './service.ts';
import { weatherIcon } from './icons.ts';
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
const copy = {
  zh: {
    title: '看看你那里的天气',
    privacy: '只会在你主动点击后申请定位。若你拒绝，仍可手动选择城市。本站不会用 IP 悄悄定位。',
    provider: '查询会将所选城市或约 1 公里精度的位置直接发送给 Open-Meteo。',
    privacyLink: '数据与隐私说明',
    retention: 'Open-Meteo 可能保留含坐标的请求日志 90 天。本站不保存设备定位；手选城市会记在此设备。',
    locate: '使用我的位置',
    manual: '手动选择城市',
    search: '搜索',
    city: '城市名称',
    hint: '输入至少两个字，支持中文或英文，如「北京」或「London」。',
    searching: '正在搜索城市…',
    locating: '正在获取位置…',
    loading: '正在获取天气…',
    empty: '没有找到城市，试试英文名或加上省份、国家。',
    retry: '重试',
    change: '切换城市',
    high: '高',
    low: '低',
    time: '天气时刻',
    local: '城市时间',
    model: '当前为模型估算；温度已取整。',
    back: '返回天气',
  },
  en: {
    title: 'Weather where you are',
    privacy:
      'Location is requested only when you choose it. You can always select a city manually. No IP-based location lookup.',
    provider: 'Your selected city or approximate location (about 1 km) is sent directly to Open-Meteo.',
    privacyLink: 'Data & privacy',
    retention:
      'Open-Meteo may keep request logs containing coordinates for 90 days. Device location is not saved; a manually chosen city is remembered on this device.',
    locate: 'Use my location',
    manual: 'Choose a city manually',
    search: 'Search',
    city: 'City name',
    hint: 'Enter at least two characters, in Chinese or English, e.g. “北京” or “London”.',
    searching: 'Searching cities…',
    locating: 'Finding your location…',
    loading: 'Loading weather…',
    empty: 'No cities found. Try an English name or add a region or country.',
    retry: 'Retry',
    change: 'Change city',
    high: 'High',
    low: 'Low',
    time: 'Weather time',
    local: 'City time',
    model: 'Model estimates; temperatures rounded.',
    back: 'Back to weather',
  },
};
export const escapeHTML = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function renderWeather(state: WeatherState, lang: WeatherLang): string {
  const t = copy[lang],
    esc = escapeHTML;
  const button = (action: string, label: string, primary = false) =>
    `<button type="button" class="weather-button${primary ? ' is-primary' : ''}" data-weather-action="${action}">${label}</button>`;
  const title = (text: string) =>
    `<header class="weather-heading"><h2 id="weather-title">${text}</h2>${weatherIcon()}</header>`;
  const status = (text: string) => `<p class="weather-status" role="status">${esc(text)}</p>`;
  const privacy = `<p class="weather-privacy">${t.provider} <a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener noreferrer" data-astro-reload>${t.privacyLink}</a></p><details class="weather-credit"><summary>${t.privacyLink}</summary><p>${t.retention}</p></details>`;
  if (state.mode === 'weather' && state.weather && state.place) {
    const w = state.weather,
      p = state.place,
      c = condition(w.code, lang, w.isDay);
    const name = p.name === '@location' ? (lang === 'zh' ? '当前位置' : 'Current location') : p.name;
    return `<h2 id="weather-title" class="weather-city">${esc(name)}</h2>${p.detail ? `<p class="weather-region">${esc(p.detail)}</p>` : ''}
   <div class="weather-current"><div><div class="weather-temperature">${Math.round(w.temperature)}<span>°C</span></div><p class="weather-description">${c.text}</p></div><div class="weather-symbol">${weatherIcon(c.icon)}</div></div>
   <p class="weather-range">${t.high} ${Math.round(w.high)}° <span>·</span> ${t.low} ${Math.round(w.low)}°</p>
   <footer class="weather-footer"><p><span>${t.time} ${esc(cityTime(w.time, w.timezone, lang))}</span><span>${t.local} · ${esc(w.timezone)}</span></p><button type="button" data-weather-action="manual">${t.change}</button></footer>
   <p class="weather-credit">${t.model} <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" data-astro-reload>Weather data by Open-Meteo.com</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" data-astro-reload>CC BY 4.0</a></p>`;
  }
  if (state.mode === 'search') {
    const candidates = state.candidates ?? [];
    return `${title(t.change)}<form data-weather-form><label for="weather-query">${t.city}</label><div class="weather-search-row"><input id="weather-query" name="city" type="search" autocomplete="off" maxlength="100" required value="${esc(state.query ?? '')}" aria-describedby="weather-search-hint" /><button type="submit" class="weather-button">${t.search}</button></div><p id="weather-search-hint" class="weather-hint">${t.hint}</p></form>
   ${state.searching ? status(t.searching) : ''}${state.message ? status(state.message) : ''}${state.searched && !state.searching && !candidates.length && !state.message ? status(t.empty) : ''}
   <ul class="weather-candidates">${candidates.map((p, i) => `<li><button type="button" data-weather-city="${i}"><span>${esc(p.name)}</span><small>${esc(p.detail ?? '')} · ${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}</small></button></li>`).join('')}</ul>
   <div class="weather-actions">${button('locate', t.locate)}${state.weather ? button('back', t.back) : ''}</div><p class="weather-credit"><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" data-astro-reload>Open-Meteo</a> · <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" data-astro-reload>GeoNames</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" data-astro-reload>CC BY 4.0</a></p>${privacy}`;
  }
  if (state.mode === 'locating' || state.mode === 'loading')
    return `${title(t.title)}${status(state.mode === 'locating' ? t.locating : t.loading)}<div class="weather-actions">${button('manual', t.manual)}</div>`;
  if (state.mode === 'error')
    return `${title(t.title)}${status(state.message ?? '')}<div class="weather-actions">${button('retry', t.retry, true)}${button('manual', t.manual)}</div>`;
  return `${title(t.title)}<p class="weather-intro">${t.privacy}</p>${state.message ? status(state.message) : ''}<div class="weather-actions">${button('locate', t.locate, true)}${button('manual', t.manual)}</div>${privacy}`;
}
