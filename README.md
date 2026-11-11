# hychiiu 的个人主页 · 博客

一个以「个人主页」为主、偶尔写写文章的纯静态站点。

- 框架：[Astro](https://astro.build)（纯静态输出，无后端）
- 视觉：参考开源的 [Yohaku 设计系统](https://github.com/Innei/Yohaku/tree/main/design-system)（MIT）的设计令牌——暖白纸面、衬线标题、单一强调色、大量留白。代码为原创实现，未使用 Innei 的品牌、文案或闭源代码。
- 托管：Cloudflare Pages（免费）
- 内容：GitHub Issues（一个 issue = 一篇文章，评论即 issue 评论）
- 评论：构建时静态展示 issue 评论 + utterances 实时评论

## 目录结构

```
src/
├── site.config.ts        ← 唯一配置文件：名字、介绍、链接、引言、强调色、评论
├── data/issues.json      ← 由 GitHub Action 从 Issues 自动同步，不要手改
├── pages/                ← 首页 / 文章 / 手记 / 关于 / 404 / RSS
├── components/ layouts/  ← 组件与布局
└── styles/global.css     ← 设计令牌与排版
public/                   ← 头像、favicon 等静态文件
scripts/avatar.mjs        ← 一键生成头像 webp / favicon
scripts/sync-issues.mjs   ← 把 Issues 同步成 src/data/issues.json
.github/workflows/        ← issue 有变动时自动同步
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
- `social`：首页名字下方的社交图标，取消注释就能启用（X、Telegram、B 站、微博、知乎、Steam、Instagram……）
- `accent`：强调色（默认 Yohaku 的梅色 `#c56473`）
- `startDate`：建站日期，首页显示「已运行 N 天」
- `url`：绑定域名后改成你的正式域名（影响 RSS / sitemap）
- `repo`：文章来源仓库（Issues）

关于页的正文在 `site.config.ts` 的 `about` 字段里（`paragraphs` / `now` 为空时不显示）。

### 更换头像

```bash
npm run avatar -- ./你的头像.png
```

会自动生成 `public/avatar.webp`（256px）、`avatar@2x.webp`（512px）、`favicon.png`、`apple-touch-icon.png`。

## 写一篇文章（GitHub Issues）

文章和手记都写在本仓库的 **Issues** 里，不需要改任何文件：

1. 打开 <https://github.com/hychiiu/hychiiu-blog/issues/new>，标题就是文章标题，正文用 Markdown 写（下文「Markdown 支持」里的语法都能用，图片直接拖进编辑框即可）。
2. 加标签：
   - `post` → 文章，`note` → 手记（二选一）
   - `en` → 英文文章（不加默认中文）
   - 其他任意标签 → 文章的 tag
3. 提交。GitHub Action（`.github/workflows/sync-issues.yml`）会在 1 分钟内把内容同步进 `src/data/issues.json` 并提交，Cloudflare Pages 随后自动重新构建发布。

只有**仓库主人本人**发的、带 `post` / `note` 标签的 issue 才会被收录，别人开的 issue 不会出现在站点上。

正文开头可以放一段可选的元信息（两种写法任选，不写就用默认值）：

```md
<!--
slug: my-first-post        # 网址，默认是 issue 编号，例如 /posts/12/
description: 一句话摘要      # 显示在列表和 SEO 里
date: 2026-11-11           # 覆盖发布日期（默认是 issue 创建时间）
cover: https://…/cover.png
tags: [随笔, 技术]          # 额外的 tag（也可以直接用标签）
mood: 平静                  # 手记专用
weather: 晴                 # 手记专用
-->
```

或者用 `---` 包起来的同样内容。用 HTML 注释写的话，在 GitHub 上看 issue 时不会显示出来。

| 操作 | 做法 |
| --- | --- |
| 修改 | 直接编辑 issue，保存后自动同步 |
| 归档 | **关闭（Close）** issue：文章仍然可以访问（链接不变），但不再出现在首页和列表里，会移到「归档」页（`/archive/`），文章页显示「已归档」，RSS 不再包含 |
| 恢复 | 重新打开（Reopen）issue |
| 取消发布 | 加上 `draft` 标签，或者直接删除 issue |
| 草稿 | 先加 `draft` 标签写，写完去掉标签即发布 |

### 评论

- issue 下面的评论会在构建时静态展示在文章底部（头像、名字、日期、Markdown、表情回应）。
- 文章页底部还有 [utterances](https://utteranc.es) 实时评论框，读者登录 GitHub 后可以直接评论，评论会写进同一个 issue。**需要先给仓库安装 utterances App：<https://github.com/apps/utterances>**（选择只授权 `hychiiu-blog` 仓库）。
- 锁定（Lock）issue 后评论框会隐藏。
- 新评论同样会触发同步，几分钟后静态评论也会更新。另外每天会自动兜底同步一次。

### 手动同步 / 本地预览

```bash
gh workflow run sync-issues.yml          # 手动触发一次同步
GITHUB_TOKEN=$(gh auth token) node scripts/sync-issues.mjs   # 本地拉取最新 issues 到 src/data/issues.json
npm run dev
```

## Markdown 支持

issue 正文和评论都用同一套管线在构建时渲染，没有后端。

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
