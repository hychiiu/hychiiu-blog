import { weatherApi } from '../../../src/server/weather/api.ts';

/** Fixed search route; the provider key is supplied only by Pages runtime bindings. */
export function onRequest({ request, env }) {
  return weatherApi(request, env);
}
