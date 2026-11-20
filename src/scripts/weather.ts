import { once } from './runtime';
import { bindWeather } from './weather/controller';
import { createWeatherService } from './weather/service';

if (once('weather')) {
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
  } catch {}
  bindWeather({ document, window, service: createWeatherService(), geolocation: navigator.geolocation, storage });
}
