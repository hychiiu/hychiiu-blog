import { locationConfigResponse } from '../../../src/server/location-config.ts';

/** Pages 文件路由：仅使用请求时的绑定，公开配置与安全码/上游传输分离。 */
export function onRequest({ request, env }) {
  return locationConfigResponse(request, env);
}
