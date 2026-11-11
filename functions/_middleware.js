/**
 * Cloudflare Pages Function（只作用于 _routes.json 里列出的文章 / 手记路径，见 src/config/deploy.ts）。
 *
 * 为什么需要：Pages 的资源服务按「主机名 + URL」在数据中心缓存 HTML，并且跨部署复用。
 * 已删除的 issue 页面在新部署后仍会被原样返回（zone 的 purge 清不掉，pages.dev 上同样如此）。
 * 这里给内部资源请求加上「构建号」查询参数，让缓存键随每次部署变化，
 * 从而总是读取当前部署的内容：不存在的路径得到 404。对外 URL 不变。
 */
import { pages } from '../src/config/deploy.ts';
import { BUILD_ID } from './_build.js';

const KEY = pages.cacheKeyParam;

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  url.searchParams.set(KEY, BUILD_ID);
  const res = await env.ASSETS.fetch(new Request(url, request));

  // 资源服务的 308（补尾斜杠等）会带上内部参数，去掉后再返回
  const location = res.headers.get('location');
  if (!location || !location.includes(KEY + '=')) return res;
  const next = new URL(location, url);
  next.searchParams.delete(KEY);
  const headers = new Headers(res.headers);
  headers.set('location', next.origin === url.origin ? next.pathname + next.search + next.hash : next.href);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
