/**
 * 环境变量读取（带类型默认值）。
 * - 构建（Astro / Vite）、scripts/、GitHub Action：读 process.env；astro.config.mjs 会先把 .env 合并进来
 * - 浏览器与 Cloudflare Worker 里没有 process，直接返回默认值
 *   （所以随环境变化的值一律在构建时渲染进 HTML / data-* 属性，浏览器端脚本不直接读环境）
 * 可用变量见 .env.example 与 README「配置」。
 */
type ProcessLike = { process?: { env?: Record<string, string | undefined> } };

/** 未设置或为空时用默认值；allowEmpty 时「显式设为空」也算有效（用来关闭某项，如 ICP_NUMBER=） */
export function env(name: string, fallback: string, { allowEmpty = false } = {}): string {
  const v = (globalThis as ProcessLike).process?.env?.[name];
  if (v === undefined) return fallback;
  return v.trim() !== '' || allowEmpty ? v.trim() : fallback;
}

/** 逗号分隔的列表 */
export function envList(name: string, fallback: string[]): string[] {
  const v = env(name, '');
  return v
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;
}
