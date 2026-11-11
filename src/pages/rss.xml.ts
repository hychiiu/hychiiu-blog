import type { APIContext } from 'astro';
import { feed } from '../utils/rss';
export const GET = (context: APIContext) => feed(context, 'zh');
