import { weatherConfig } from '../../config/weather.ts';
import { validPlace, type Place, type WeatherLang, type WeatherService } from './service.ts';
import { renderWeather, type WeatherState } from './view.ts';

type Host = {
  document: Document;
  window: Window;
  service: WeatherService;
  geolocation?: Pick<Geolocation, 'getCurrentPosition'>;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};
const bound = new WeakSet<Document>();
export function bindWeather({ document: doc, window: win, service, geolocation, storage }: Host) {
  if (bound.has(doc)) return;
  bound.add(doc);
  const panel = () => doc.querySelector<HTMLElement>('#weather-panel');
  const trigger = () => doc.querySelector<HTMLButtonElement>('[data-weather-toggle]');
  const lang = (): WeatherLang => (doc.documentElement.dataset.lang === 'en' ? 'en' : 'zh');
  let state: WeatherState = { mode: 'choice' },
    selected: Place | undefined,
    manual = false,
    open = false,
    generation = 0,
    active: AbortController | undefined;
  let retry: () => void = () => {};
  try {
    const p: unknown = JSON.parse(storage?.getItem(weatherConfig.storageKey) ?? 'null');
    if (validPlace(p) && p.name !== '@location') {
      selected = p;
      manual = true;
    }
  } catch {
    /* Storage is optional (private browsing, quota). */
  }
  const cancel = () => {
    generation++;
    active?.abort();
    active = undefined;
  };
  const focus = (el: HTMLElement | null | undefined) => el?.focus({ preventScroll: true });
  function position() {
    const p = panel(),
      d = doc.querySelector<HTMLElement>('[data-dock]'),
      b = trigger();
    if (!open || !p || !d || !b || win.innerWidth < 1024) return;
    const dockRect = d.getBoundingClientRect(),
      rect = b.getBoundingClientRect();
    const top = Math.max(12, Math.min(rect.top - 20, win.innerHeight - p.offsetHeight - 12));
    p.style.setProperty('--weather-top', `${top}px`);
    p.style.setProperty('--weather-left', `${dockRect.right + 12}px`);
  }
  function draw(focusSelector?: string, preserveOutsideFocus = false) {
    const p = panel();
    if (!p) return;
    const focusInside = p.contains(doc.activeElement);
    p.innerHTML = renderWeather(state, lang());
    position();
    if (focusSelector && (!preserveOutsideFocus || focusInside)) focus(p.querySelector<HTMLElement>(focusSelector));
  }
  function close(restore = true) {
    if (!open) return;
    const hadFocus = !!panel()?.contains(doc.activeElement);
    open = false;
    cancel();
    if (panel()) panel()!.hidden = true;
    trigger()?.setAttribute('aria-expanded', 'false');
    if (restore && hadFocus) focus(trigger());
  }
  function manualSearch() {
    cancel();
    state = {
      ...state,
      mode: 'search',
      query: '',
      candidates: [],
      message: undefined,
      searched: false,
      searching: false,
    };
    draw('input');
  }
  async function load(place: Place, isManual: boolean, preserveOutsideFocus = false) {
    cancel();
    const ticket = generation;
    active = new AbortController();
    selected = place;
    manual = isManual;
    state = { mode: 'loading' };
    draw('[data-weather-action="manual"]', preserveOutsideFocus);
    retry = () => {
      void load(place, isManual);
    };
    try {
      const weather = await service.weather(place, active.signal);
      if (ticket !== generation || !open) return;
      if (isManual) {
        try {
          storage?.setItem(weatherConfig.storageKey, JSON.stringify(place));
        } catch {}
      } else {
        try {
          storage?.removeItem(weatherConfig.storageKey);
        } catch {}
      }
      state = { mode: 'weather', place, weather };
      draw('[data-weather-action="manual"]', true);
    } catch {
      if (ticket !== generation || !open) return;
      state = {
        mode: 'error',
        message:
          lang() === 'zh'
            ? '暂时无法获取天气，请重试或选择其他城市。'
            : 'Weather is unavailable. Retry or choose another city.',
      };
      draw('[data-weather-action="retry"]', true);
    }
  }
  function locate() {
    cancel();
    const ticket = generation;
    state = { mode: 'locating' };
    draw('[data-weather-action="manual"]');
    const fail = (code: number) => {
      if (ticket !== generation || !open) return;
      state = {
        mode: 'choice',
        message:
          lang() === 'zh'
            ? code === 1
              ? '定位未获允许，仍可手动选择城市。'
              : code === 3
                ? '定位超时，请重试或手动选择城市。'
                : '定位不可用，请手动选择城市。'
            : code === 1
              ? 'Location permission was denied. You can select a city manually.'
              : code === 3
                ? 'Location timed out. Retry or choose a city manually.'
                : 'Location is unavailable. Choose a city manually.',
      };
      draw('[data-weather-action="manual"]', true);
    };
    if (!geolocation) {
      fail(2);
      return;
    }
    // Browser coordinates never leave this scope at full precision or enter storage/logs.
    try {
      geolocation.getCurrentPosition(
        (pos) => {
          if (ticket !== generation || !open) return;
          const place = {
            name: '@location',
            latitude: Math.round(pos.coords.latitude * 100) / 100,
            longitude: Math.round(pos.coords.longitude * 100) / 100,
          };
          if (!validPlace(place)) {
            fail(2);
            return;
          }
          void load(place, false, true);
        },
        (error) => fail(error.code),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
      );
    } catch {
      fail(2);
    }
  }
  doc.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    if (target?.closest('[data-weather-toggle]')) {
      if (open) {
        close(false);
        return;
      }
      open = true;
      panel()!.hidden = false;
      trigger()?.setAttribute('aria-expanded', 'true');
      if (selected) void load(selected, manual);
      else {
        state = { mode: 'choice' };
        draw('[data-weather-action="locate"]');
      }
      return;
    }
    if (!open || !panel()?.contains(target)) return;
    const city = target?.closest<HTMLElement>('[data-weather-city]');
    if (city) {
      const place = state.candidates?.[Number(city.dataset.weatherCity)];
      if (place) void load(place, true);
      return;
    }
    const action = target?.closest<HTMLElement>('[data-weather-action]')?.dataset.weatherAction;
    if (action === 'manual') manualSearch();
    if (action === 'locate') locate();
    if (action === 'retry') retry();
    if (action === 'back' && state.weather) {
      cancel();
      state = { ...state, mode: 'weather' };
      draw('[data-weather-action="manual"]');
    }
  });
  doc.addEventListener('submit', async (e) => {
    const form = e.target as HTMLFormElement;
    if (!form.matches('[data-weather-form]') || !open) return;
    e.preventDefault();
    const query = form.querySelector<HTMLInputElement>('input')?.value.trim() ?? '';
    cancel();
    const ticket = generation;
    active = new AbortController();
    state = { ...state, mode: 'search', query, candidates: [], message: undefined, searching: true, searched: true };
    draw('input');
    try {
      const candidates = await service.search(query, lang(), active.signal);
      if (ticket !== generation || !open) return;
      state = { ...state, candidates, searching: false };
      draw(candidates.length ? '[data-weather-city]' : 'input', true);
    } catch {
      if (ticket !== generation || !open) return;
      state = {
        ...state,
        searching: false,
        message:
          lang() === 'zh' ? '暂时无法搜索城市，请再次搜索。' : 'City search is unavailable. Please search again.',
      };
      draw('input', true);
    }
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  });
  doc.addEventListener('pointerdown', (e) => {
    const target = e.target as Node | null;
    if (open && !panel()?.contains(target) && !trigger()?.contains(target)) close();
  });
  doc.addEventListener('astro:before-preparation', () => close(false));
  doc.addEventListener('astro:after-swap', () => {
    if (!open && panel()) panel()!.innerHTML = '';
  });
  win.addEventListener('resize', position);
}
