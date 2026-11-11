/**
 * Cloudflare Pages Function（只作用于 _routes.json 里列出的文章 / 手记路径）。
 *
 * 为什么需要：Pages 会把静态资源按数据中心缓存最长一周，删除或下线的 issue 页面在新部署后
 * 仍可能被边缘缓存原样返回（cf-cache-status: DYNAMIC，zone 的 purge 也清不掉）。
 * 经过 Function 时直接从「当前部署」的资源读取，不存在的路径就会得到 404。
 */
export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  return res;
}
