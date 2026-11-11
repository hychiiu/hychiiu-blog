/** robots.txt：sitemap 地址随 site.url（SITE_URL）变化 */
import type { APIRoute } from 'astro';
import { site } from '../config';

export const GET: APIRoute = ({ site: astroSite }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', astroSite ?? site.url).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
