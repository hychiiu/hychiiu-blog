# hychiiu 的个人主页 · 博客

一个以「个人主页」为主、偶尔写写文章的纯静态站点。

- 框架：[Astro](https://astro.build)（纯静态输出，无后端）
- 视觉：参考开源的 [Yohaku 设计系统](https://github.com/Innei/Yohaku/tree/main/design-system)（MIT）的设计令牌——暖白纸面、衬线标题、单一强调色、大量留白。代码为原创实现，未使用 Innei 的品牌、文案或闭源代码。
- 托管：Cloudflare Pages（免费）
- 评论：Giscus（基于 GitHub Discussions，默认关闭，配置后自动启用）

## 目录结构

```
src/
├── site.config.ts        ← 唯一配置文件：名字、介绍、链接、引言、强调色、评论
├── content/
│   ├── posts/            ← 文章（.md / .mdx）
│   └── notes/            ← 手记（.md / .mdx）
├── pages/                ← 首页 / 文章 / 手记 / 关于 / 404 / RSS
├── components/ layouts/  ← 组件与布局
└── styles/global.css     ← 设计令牌与排版
public/                   ← 头像、favicon 等静态文件
scripts/avatar.mjs        ← 一键生成头像 webp / favicon
```

## 本地开发

需要 Node.js 22.23+（推荐 24，见 `.nvmrc`）。

```bash
npm install        # 或 pnpm install
npm run dev        # 本地预览：http://localhost:4321
npm run build      # 构建到 dist/
npm run preview    # 预览构建结果
```

## 修改个人信息

全部在 `src/site.config.ts` 里：

- `name` / `intro` / `subIntro`：首页名字和介绍（留空则不显示）
- `quote`：首页引言（留空则不显示整个区块）
- `socials`：社交链接，取消注释就能启用（X、邮箱、Telegram、B 站……）
- `accent`：强调色（默认 Yohaku 的梅色 `#c56473`）
- `startDate`：建站日期，首页显示「已运行 N 天」
- `url`：绑定域名后改成你的正式域名（影响 RSS / sitemap）
- `giscus`：评论配置（见下文）

关于页的正文在 `site.config.ts` 的 `about` 字段里（`paragraphs` / `now` 为空时不显示）。

### 更换头像

```bash
npm run avatar -- ./你的头像.png
```

会自动生成 `public/avatar.webp`（256px）、`avatar@2x.webp`（512px）、`favicon.png`、`apple-touch-icon.png`。

## 写一篇文章

在 `src/content/posts/` 下新建一个 `.md` 文件，文件名就是网址，例如 `my-first-post.md` → `/posts/my-first-post/`：

```md
---
title: 文章标题
date: 2026-11-11
description: 一句话摘要（显示在列表和 SEO 里）
tags: [随笔, 技术]
draft: false        # true 时只在本地 dev 可见，不会发布
---

正文用 Markdown 写。
```

写手记同理，放在 `src/content/notes/`，frontmatter 为：

```md
---
title: 手记标题
date: 2026-11-11
mood: 平静       # 可选
weather: 晴      # 可选
---
```

没有文章时，首页和列表页会显示「还没有文章」。

写完后：

```bash
git add . && git commit -m "new post" && git push
```

Cloudflare Pages 会自动构建发布。

## Markdown 支持

文章和手记都支持 `.md` 和 `.mdx`，全部在构建时渲染，没有后端。

| 功能 | 写法 | 实现 |
| --- | --- | --- |
| 基础语法 + GFM | 标题、列表、引用、表格、`- [ ]` 任务清单、`~~删除线~~`、`[^1]` 脚注、自动链接 | Astro 自带（remark-gfm） |
| 图片说明 | `![替代文字](/img.png "这句会显示为图片说明")` | 自定义插件，生成 `<figure>` |
| 数学公式 | 行内 `$E=mc^2$`，块级 `$$ … $$` | remark-math + rehype-katex（KaTeX 样式和字体打包在站内，不走 CDN） |
| Mermaid 图 | ` ```mermaid ` 代码块 | mermaid，只在有图的页面按需加载，跟随深浅色切换 |
| 提示块 | `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]` | remark-github-blockquote-alert |
| 代码块 | 语法高亮、文件名、行高亮、diff、行号、复制按钮 | Expressive Code（Shiki 双主题） |
| 标题锚点 | 自动生成，鼠标悬停标题时出现 `#` | rehype-slug + rehype-autolink-headings |
| 外链 | 站外链接自动新标签页打开，并带 ↗ 标记 | rehype-external-links |
| Emoji | `:tada:` `:rocket:` | remark-emoji |
| HTML | `<kbd>`、`<sup>`、`<sub>`、`<mark>`、`<details><summary>` | 原生支持，已配好样式 |
| MDX | `.mdx` 文件里可以 `import` 或定义组件 | @astrojs/mdx |

代码块写法：

~~~md
```ts title="src/hello.ts" {2} ins={3} del={4}
const a = 1;
const b = 2;          // {2} 高亮第 2 行
const c = 3;          // ins 标记为新增
const d = 4;          // del 标记为删除
```

```diff
- 旧的一行
+ 新的一行
```

```python showLineNumbers
print("显示行号")
```
~~~

> 改过 `astro.config.mjs` 之后，如果本地构建出来的代码块样式不对，删掉 `.astro/` 目录再构建一次（这是 Astro 的内容缓存）。

## 部署到 Cloudflare Pages

### 方式一：连接 Git（推荐，push 即发布）

1. 把项目推到 GitHub（公开或私有都行）。
2. 打开 Cloudflare 控制台 → **Workers & Pages** → **创建** → **Pages** → **连接到 Git**，选择仓库。
3. 构建设置：
   - 框架预设：`Astro`
   - 构建命令：`npm run build`
   - 构建输出目录：`dist`
   - 环境变量：`NODE_VERSION` = `24`（Astro 需要 Node 22.23+）
4. 保存并部署，几十秒后会得到一个 `xxx.pages.dev` 地址。

### 方式二：命令行直接上传

```bash
npm run build
npx wrangler login                 # 第一次需要登录 Cloudflare
npx wrangler pages deploy dist --project-name hychiiu-blog
```

（也可以直接 `npm run deploy`，它会先构建再上传。）

## 绑定自定义域名

1. Cloudflare 控制台 → Workers & Pages → 你的项目 → **自定义域** → **设置自定义域**。
2. 输入域名，例如 `blog.example.com` 或 `example.com`。
   - 域名已托管在 Cloudflare：会自动添加 DNS 记录，等几分钟证书签发即可。
   - 域名在别处：按提示添加一条 `CNAME` 指向 `你的项目.pages.dev`（根域名建议把 DNS 迁到 Cloudflare）。
3. 回到 `src/site.config.ts`，把 `url` 改成 `https://你的域名`，提交并推送。

## 开启评论（Giscus）

1. 准备一个**公开**的 GitHub 仓库，在仓库 Settings 里开启 **Discussions**。
2. 安装 [giscus App](https://github.com/apps/giscus) 并授权这个仓库。
3. 打开 <https://giscus.app/zh-CN>，填仓库名，选一个分类（推荐 Announcements），页面下方会生成 `data-repo`、`data-repo-id`、`data-category`、`data-category-id`。
4. 把这四个值填进 `src/site.config.ts` 的 `giscus` 里，重新部署，文章页底部就会出现评论区（会跟随深浅色切换）。

## 中英文双语

- 中文为默认语言，在根路径 `/`；英文在 `/en/`（Astro i18n 路由）。右上角 `中 | EN | 主题` 切换，会跳到当前页面的对应语言版本，并记住选择（localStorage）。
- 界面文案（导航、按钮、区块标题、页脚、404……）在 `src/i18n.ts` 的字典里。
- 首页介绍、第二行介绍、引言、关于页正文在 `src/site.config.ts`，每项都有 `zh` / `en` 两份。
- 文章 / 手记可在 frontmatter 写 `lang: en`（默认 `zh`）：
  - 中文站列出全部文章，英文文章带 `English` 小标记；
  - 英文站只列英文文章；一篇英文都没有时，回退显示中文文章，并带 `Chinese` 小标记。
- 每个页面都带 `hreflang` 互链；sitemap 也包含双语互链。RSS：中文 `/rss.xml`，英文 `/en/rss.xml`。

## 字体与设计

- 标题与正文：Noto Serif SC（SIL OFL），按 unicode-range 分片自托管，浏览器只下载用到的字符分片（`src/styles/fonts.css`，由 `node scripts/gen-fonts.mjs` 生成）
- 元信息 / 标签 / 代码：JetBrains Mono（OFL，全站唯一等宽字体），界面文字：Inter（OFL），均通过 Fontsource 自托管，不依赖 Google Fonts
- 颜色：Yohaku 开源令牌——梅色强调 `#c56473`、暖色中性 n-1…10、亮色纸面 `#faf9f5`、暗色 `#18181a`

## 其他

- RSS：`/rss.xml`　站点地图：`/sitemap-index.xml`
- 深浅色：默认跟随系统，右上角可手动切换（会记住选择）
- 动效：遵循系统「减少动态效果」设置
