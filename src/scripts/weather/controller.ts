import { weatherConfig } from '../../config/weather.ts';
import zh from '../../i18n/zh.ts';
import en from '../../i18n/en.ts';
const ui = { zh, en };
import { afterWeatherPanelClose, pointerIsOnItem, refreshDockTooltip } from '../dock-tooltip.ts';
import { createWeatherDock } from './dock-state.ts';
import {
  isCurrentStale,
  persistablePlace,
  readStoredPlace,
  validPlace,
  WeatherRequestError,
  type Place,
  type WeatherLang,
  type WeatherService,
} from './service.ts';
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
  const weatherDock = createWeatherDock(doc);
  weatherDock.sync();
  const panel = () => doc.querySelector<HTMLElement>('#weather-panel');
  const trigger = () => doc.querySelector<HTMLButtonElement>('[data-weather-toggle]');
  const lang = (): WeatherLang => (doc.documentElement.dataset.lang === 'en' ? 'en' : 'zh');
  const t = (
    key:
      | 'weather.searchFailed'
      | 'weather.tooShort'
      | 'weather.unavailable'
      | 'weather.invalidRequest'
      | 'weather.locationNotFound'
      | 'weather.rateLimited'
      | 'weather.upstreamTimeout'
      | 'weather.upstreamInvalid'
      | 'weather.quotaUnavailable'
      | 'weather.locateDenied'
      | 'weather.locateTimeout'
      | 'weather.locateUnavailable',
  ) => ui[lang()][key];
  const errorMessage = (error: unknown, fallback: 'weather.unavailable' | 'weather.searchFailed') => {
    const code = error instanceof WeatherRequestError ? error.code : '';
    const keys: Record<string, Parameters<typeof t>[0]> = {
      INVALID_REQUEST: 'weather.invalidRequest',
      LOCATION_NOT_FOUND: 'weather.locationNotFound',
      RATE_LIMITED: 'weather.rateLimited',
      UPSTREAM_TIMEOUT: 'weather.upstreamTimeout',
      UPSTREAM_INVALID: 'weather.upstreamInvalid',
      QUOTA_UNAVAILABLE: 'weather.quotaUnavailable',
      WEATHER_UNAVAILABLE: 'weather.unavailable',
    };
    return t(keys[code] ?? fallback);
  };
  let state: WeatherState = { mode: 'choice' },
    selected: Place | undefined,
    manual = false,
    open = false,
    generation = 0,
    active: AbortController | undefined;
  let retry: () => void = () => {};
  try {
    const p = readStoredPlace(JSON.parse(storage?.getItem(weatherConfig.storageKey) ?? 'null'));
    if (p) {
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
  let composing = false;
  let ignoreSubmitEnter = false;
  const resetComposition = () => {
    composing = false;
    ignoreSubmitEnter = false;
  };
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
    resetComposition();
    p.innerHTML = renderWeather(state, lang());
    position();
    if (focusSelector && (!preserveOutsideFocus || focusInside)) focus(p.querySelector<HTMLElement>(focusSelector));
  }
  function close(restore = true, reason: 'escape' | 'toggle' | 'outside' | 'nav' = 'outside') {
    if (!open) return;
    resetComposition();
    const hadFocus = !!panel()?.contains(doc.activeElement);
    const tgl = trigger();
    const item = tgl?.closest('.dock-item') ?? null;
    const dock = doc.querySelector<HTMLElement>('[data-dock]');
    open = false;
    cancel();
    if (panel()) panel()!.hidden = true;
    tgl?.setAttribute('aria-expanded', 'false');
    if (restore && hadFocus) focus(tgl);
    if (dock && reason !== 'nav') {
      const pointerOnItem = reason === 'outside' ? false : pointerIsOnItem(item);
      const suppressFocus =
        reason === 'escape' ||
        (reason === 'toggle' && !!tgl && (doc.activeElement === tgl || tgl.contains(doc.activeElement))) ||
        (reason === 'outside' && restore && hadFocus);
      afterWeatherPanelClose(dock, item, { pointerOnItem, suppressFocus });
    } else if (dock) {
      refreshDockTooltip(dock);
    }
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
      if (isCurrentStale(weather, Date.now())) throw new WeatherRequestError('WEATHER_UNAVAILABLE');
      if (isManual) {
        try {
          const saved = persistablePlace(place);
          if (saved) storage?.setItem(weatherConfig.storageKey, JSON.stringify(saved));
        } catch {}
      } else {
        try {
          storage?.removeItem(weatherConfig.storageKey);
        } catch {}
      }
      weatherDock.success(place, weather);
      state = { mode: 'weather', place, weather };
      draw('[data-weather-action="manual"]', true);
    } catch (error) {
      if (ticket !== generation || !open) return;
      weatherDock.failed();
      state = { mode: 'error', message: errorMessage(error, 'weather.unavailable') };
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
          code === 1
            ? t('weather.locateDenied')
            : code === 3
              ? t('weather.locateTimeout')
              : t('weather.locateUnavailable'),
      };
      draw('input', true);
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
        close(false, 'toggle');
        return;
      }
      open = true;
      panel()!.hidden = false;
      trigger()?.setAttribute('aria-expanded', 'true');
      const keyboard = e.detail === 0;
      if (selected) void load(selected, manual);
      else {
        state = { mode: 'choice' };
        draw(keyboard ? 'input' : undefined);
      }
      const dock = doc.querySelector<HTMLElement>('[data-dock]');
      if (dock) refreshDockTooltip(dock);
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
  // ClientRouter registers a document bubble listener in <head>. It calls
  // navigate() and dispatches before-preparation synchronously, closing this
  // popover before a later bubble listener can own the form. Prevent the native
  // submit in capture phase (button and Enter both use this same event).
  doc.addEventListener(
    'submit',
    async (e) => {
      const form = e.target as HTMLFormElement;
      if (!form.matches('[data-weather-form]') || !open) return;
      e.preventDefault();
      const input = form.querySelector<HTMLInputElement>('input');
      const query = input?.value.trim() ?? '';
      const activeIsInput = doc.activeElement === input;
      const activeIsSubmit = doc.activeElement === form.querySelector('[type="submit"]');
      cancel();
      if (Array.from(query).length < 2) {
        state = {
          ...state,
          mode: 'search',
          query,
          candidates: [],
          searching: false,
          searched: false,
          message: t('weather.tooShort'),
        };
        draw('input');
        return;
      }
      const ticket = generation;
      active = new AbortController();
      state = { ...state, mode: 'search', query, candidates: [], message: undefined, searching: true, searched: true };
      draw(activeIsInput ? 'input' : activeIsSubmit ? '[type="submit"]' : undefined, true);
      try {
        const candidates = await service.search(query, lang(), active.signal);
        if (ticket !== generation || !open) return;
        state = { ...state, candidates, searching: false };
        const restore = activeIsInput
          ? 'input'
          : activeIsSubmit
            ? '[type="submit"]'
            : candidates.length
              ? '[data-weather-city]'
              : undefined;
        draw(restore, true);
      } catch (error) {
        if (ticket !== generation || !open) return;
        state = { ...state, searching: false, message: errorMessage(error, 'weather.searchFailed') };
        draw(activeIsInput ? 'input' : activeIsSubmit ? '[type="submit"]' : undefined, true);
      }
    },
    { capture: true },
  );
  const onQueryClear = (e: Event) => {
    const input = e.target as HTMLInputElement | null;
    if (!input || input.id !== 'weather-query' || !open) return;
    if (input.value.trim() !== '') return;
    cancel();
    state = {
      ...state,
      mode: 'search',
      query: '',
      candidates: [],
      message: undefined,
      searching: false,
      searched: false,
    };
    draw('input', true);
  };
  doc.addEventListener('input', onQueryClear);
  doc.addEventListener('search', onQueryClear);
  const inWeatherForm = (target: EventTarget | null) => (target as Element | null)?.closest?.('[data-weather-form]');
  doc.addEventListener(
    'compositionstart',
    (e) => {
      if (inWeatherForm(e.target)) composing = true;
    },
    { capture: true },
  );
  doc.addEventListener(
    'compositionend',
    (e) => {
      if (!inWeatherForm(e.target)) return;
      composing = false;
      // Some engines deliver the candidate-confirm Enter immediately after compositionend.
      ignoreSubmitEnter = true;
      queueMicrotask(() => {
        ignoreSubmitEnter = false;
      });
    },
    { capture: true },
  );
  doc.addEventListener(
    'keydown',
    (e) => {
      const target = e.target as Element | null;
      if (
        target?.closest?.('[data-weather-form]') &&
        e.key === 'Enter' &&
        (e.isComposing || composing || ignoreSubmitEnter || e.keyCode === 229)
      ) {
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape' && open && !e.isComposing && !composing) {
        e.preventDefault();
        close(true, 'escape');
      }
    },
    { capture: true },
  );
  doc.addEventListener('pointerdown', (e) => {
    const target = e.target as Node | null;
    if (open && !panel()?.contains(target) && !trigger()?.contains(target)) close(true, 'outside');
  });
  doc.addEventListener('astro:before-preparation', () => close(false, 'nav'));
  doc.addEventListener('astro:after-swap', () => {
    weatherDock.sync();
    if (!open && panel()) panel()!.innerHTML = '';
  });
  win.addEventListener('resize', position);
}
