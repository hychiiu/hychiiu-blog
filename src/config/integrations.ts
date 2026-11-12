/** 第三方集成：评论、ICP 备案、页脚致谢链接。没有统计 / 分析脚本。 */
import { env, envList } from './env.ts';

/**
 * 本页留言（utterances）的加载方式：
 * - auto：页面加载后（浏览器空闲时）立即加载，就绪后替换静态列表（默认）；
 * - click：点「或在本页登录后留言」才加载；
 * - off：只有静态列表和「在 GitHub 上留言」。
 * 兼容旧变量：COMMENTS_INLINE=false 等同 off。
 */
export type CommentsMode = 'auto' | 'click' | 'off';
const modes: readonly CommentsMode[] = ['auto', 'click', 'off'];
const rawMode = env('COMMENTS_MODE', env('COMMENTS_INLINE', 'true') === 'false' ? 'off' : 'auto');
const mode: CommentsMode = (modes as readonly string[]).includes(rawMode) ? (rawMode as CommentsMode) : 'auto';

export const comments = {
  /** utterances：静态评论列表之外，可在本页登录后留言；需要在仓库安装 GitHub App */
  utterances: {
    mode,
    origin: 'https://utteranc.es',
    /** 文章页提前建立连接（iframe 页面与它调用的 GitHub API） */
    preconnect: ['https://utteranc.es', 'https://api.github.com'],
    app: 'https://github.com/apps/utterances',
    /**
     * 随站点深浅色切换的主题（utterances 内置主题名）。
     * 浅色用 boxy-light：评论框白底、描边少，在纸色底上最安静；深色用 github-dark：中性灰，没有彩色底。
     */
    theme: { light: 'boxy-light', dark: 'github-dark' },
  },
};

/** 工信部 ICP 备案号：只在 hosts 列出的域名上显示；number 为空则不渲染 */
export const icp = {
  number: env('ICP_NUMBER', '苏ICP备2022019472号-1', { allowEmpty: true }),
  hosts: envList('ICP_HOSTS', ['inbluemoon.com', 'www.inbluemoon.com']),
  url: 'https://beian.miit.gov.cn/',
};

/** 页脚「构建于 / 托管于」 */
export const credits = {
  builtWith: { name: 'Astro', url: 'https://astro.build' },
  hostedOn: { name: 'Cloudflare', url: 'https://pages.cloudflare.com' },
};
