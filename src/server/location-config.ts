import { locationConfig } from '../config/location.ts';

/** Pages 运行时绑定，不从构建环境读取；配置接口完全不需要访问安全码。 */
export type LocationConfigEnv = {
  BLOG_AMAP_LOCATION_ENABLED?: string;
  BLOG_AMAP_JS_API_KEY?: string;
};

type Body = { jsApiKey: string; serviceHost: string } | { code: string };

/** 所有分支禁止共享缓存与类型嗅探；错误只返回固定机器码，不附带请求或绑定值。 */
function json(body: Body, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

function error(code: string, status: number, headers?: Record<string, string>): Response {
  return json({ code }, status, headers);
}

/** 来源头仅作纵深检查，不能代替认证/平台限流；非浏览器可以伪造这些头。 */
function sameOriginSource(request: Request, origin: string): boolean {
  const source = request.headers.get('origin');
  if (source !== null && source !== origin) return false;
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin' && site !== 'none') return false;
  const referer = request.headers.get('referer');
  if (referer !== null) {
    try {
      const url = new URL(referer);
      if (url.origin !== origin || url.username || url.password) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * 只在受限生产源、明确启用且完成请求检查后读取公开 JS Key。
 * 默认 503，直到 SDK 坐标契约、真实限流及隐私验收完成后由父级安排启用。
 * 不读取 securityJsCode、不调用高德、不实现可转发任意路径的代理。
 */
export function locationConfigResponse(request: Request, env: LocationConfigEnv): Response {
  const url = new URL(request.url);
  if (!locationConfig.origins.includes(url.origin)) return error('FORBIDDEN', 403);
  if (url.pathname !== locationConfig.path) return error('NOT_FOUND', 404);
  if (request.method !== 'GET') return error('METHOD_NOT_ALLOWED', 405, { allow: 'GET' });
  if (url.search) return error('INVALID_REQUEST', 400);
  if (!sameOriginSource(request, url.origin)) return error('FORBIDDEN', 403);
  if (env.BLOG_AMAP_LOCATION_ENABLED !== 'true') return error('LOCATION_UNAVAILABLE', 503);
  const key = env.BLOG_AMAP_JS_API_KEY;
  if (
    typeof key !== 'string' ||
    !key ||
    key !== key.trim() ||
    key.length > locationConfig.maxPublicKeyLength ||
    /\s/.test(key)
  )
    return error('LOCATION_UNAVAILABLE', 503);
  return json({ jsApiKey: key, serviceHost: `${url.origin}${locationConfig.servicePrefix}` });
}
