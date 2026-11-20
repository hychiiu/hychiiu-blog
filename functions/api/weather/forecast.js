import { weatherApi } from '../../../src/server/weather/api.ts';

/** GET accepts a provider city ID; POST accepts only explicitly sourced WGS84 coordinates. */
export function onRequest({ request, env }) {
  return weatherApi(request, env);
}
