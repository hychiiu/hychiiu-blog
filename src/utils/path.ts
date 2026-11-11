/** 去掉英文前缀 /en，得到与语言无关的路径（服务端与浏览器端共用，不依赖站点配置） */
export function stripLang(path: string): string {
  const p = path.replace(/^\/en(?=\/|$)/, '');
  return p === '' ? '/' : p;
}
