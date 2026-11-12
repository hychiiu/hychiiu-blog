# hychiiu-blog

hychiiu（怀秋）的个人主页与博客：文章写在 GitHub Issues 里，Astro 构建成纯静态站点，托管在 Cloudflare Pages。

**在线访问：<https://hychiiu.com>**（同站：<https://inbluemoon.com>）

## 特性

- **Issues 即 CMS**：一个 issue 就是一篇文章或手记，用 label 区分 `post` / `note` / `draft` / `en`；关闭 issue 即归档，链接不变
- **评论**：issue 下的评论在构建时静态展示；文章页底部的 [utterances](https://utteranc.es) 评论框写回同一个 issue，并跟随站点深浅色
- **自动同步**：issue / 评论有变动时，GitHub Action 把内容同步进 `src/data/issues.json`，Cloudflare Pages 随即重新构建
- **完整的 Markdown**：GFM、脚注、KaTeX 数学公式、Mermaid、提示块（`> [!NOTE]` 等）、带文件名 / 行高亮 / diff 的代码块
- **中英双语**：中文在 `/`，英文在 `/en/`，带 `hreflang` 与双语 sitemap
- **阅读体验**：站内跳转使用 View Transitions；底部 Dock 导航；深浅色跟随系统并可手动切换；遵循「减少动态效果」设置
- **订阅**：RSS（`/rss.xml`、`/en/rss.xml`）与 sitemap（`/sitemap-index.xml`）
- **纯静态**：没有后端、没有统计脚本；字体全部自托管

## 写一篇文章

不需要改任何文件，在本仓库 **新建 Issue** 即可：<https://github.com/hychiiu/hychiiu-blog/issues/new>

1. 标题就是文章标题，正文用 Markdown 写，图片直接拖进编辑框。
2. 加标签：
   - `post` → 文章，`note` → 手记（二选一）
   - `en` → 英文文章（不加默认中文）
   - 其他任意标签 → 文章的 tag（即分类）：每个 tag 有自己的页面 `/tags/<tag>/`，文章列表顶部可按 tag 筛选；第一个 tag 作为这篇的主分类显示在文章页 meta 里
3. 提交。`.github/workflows/sync-issues.yml` 会在 1 分钟左右同步并提交，Cloudflare Pages 随后自动发布。

只有**仓库主人本人**发的、带 `post` / `note` 标签的 issue 才会被收录。

正文开头可以放一段可选的元信息（HTML 注释在 GitHub 上不显示；也可以用 `---` 包起来）：

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

| 操作     | 做法                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 修改     | 直接编辑 issue，保存后自动同步                                                                                                                       |
| 归档     | **关闭（Close）** issue：文章仍然可以访问（链接不变），但不再出现在首页和列表里，会移到「归档」页（`/archive/`），文章页显示「已归档」，RSS 不再包含 |
| 恢复     | 重新打开（Reopen）issue                                                                                                                              |
| 取消发布 | 加上 `draft` 标签，或者直接删除 issue                                                                                                                |
| 草稿     | 先加 `draft` 标签写，写完去掉标签即发布                                                                                                              |

### 评论

- issue 下的评论在构建时静态展示在文章底部（头像、名字、日期、Markdown、表情回应）。
- 页面加载后，utterances 评论框会自动出现，读者登录 GitHub 即可评论，评论写进同一个 issue。需要先给仓库安装 utterances App：<https://github.com/apps/utterances>（只授权 `hychiiu-blog` 仓库即可）。
- 锁定（Lock）issue 后评论框隐藏。新评论同样会触发同步；每天另有一次定时兜底同步。

### 手动同步

```bash
gh workflow run sync-issues.yml               # 手动触发一次同步
GITHUB_TOKEN=$(gh auth token) npm run sync    # 本地拉取最新 issues 到 src/data/issues.json
```

## Markdown 支持

issue 正文和评论用同一套管线在构建时渲染。

| 功能           | 写法                                                                          | 实现                                                               |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 基础语法 + GFM | 标题、列表、引用、表格、`- [ ]` 任务清单、`~~删除线~~`、`[^1]` 脚注、自动链接 | Astro 自带（remark-gfm）                                           |
| 图片说明       | `![替代文字](/img.png "这句会显示为图片说明")`                                | 自定义插件，生成 `<figure>`                                        |
| 数学公式       | 行内 `$E=mc^2$`，块级 `$$ … $$`                                               | remark-math + rehype-katex（KaTeX 样式和字体打包在站内，不走 CDN） |
| Mermaid 图     | ` ```mermaid ` 代码块                                                         | mermaid，只在有图的页面按需加载，跟随深浅色切换                    |
| 提示块         | `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`         | remark-github-blockquote-alert                                     |
| 代码块         | 语法高亮、文件名、行高亮、diff、行号、复制按钮                                | Expressive Code（Shiki 双主题）                                    |
| 标题锚点       | 自动生成，鼠标悬停标题时出现 `#`                                              | rehype-slug + rehype-autolink-headings                             |
| 外链           | 站外链接自动新标签页打开，并带 ↗ 标记                                         | rehype-external-links                                              |
| Emoji          | `:tada:` `:rocket:`                                                           | remark-emoji                                                       |
| HTML           | `<kbd>`、`<sup>`、`<sub>`、`<mark>`、`<details><summary>`                     | 原生支持，已配好样式                                               |

代码块写法：

````md
```ts title="src/hello.ts" {2} ins={3} del={4}
const a = 1;
const b = 2; // {2} 高亮第 2 行
const c = 3; // ins 标记为新增
const d = 4; // del 标记为删除
```

```diff
- 旧的一行
+ 新的一行
```

```python showLineNumbers
print("显示行号")
```
````

> 改过 `astro.config.mjs` 之后，如果本地构建出来的代码块样式不对，删掉 `.astro/` 目录再构建一次（这是 Astro 的内容缓存）。

## 本地开发

需要 Node.js 22.23+（推荐 24，见 `.nvmrc`）。

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 构建到 dist/
npm run preview    # 预览构建结果
npm run lint       # ESLint
npm run format     # Prettier（format:check 只检查）
npm run check      # astro check + tsc
```

提交前保证 `npm run lint && npm run check && npm run build` 通过（CI 在 push / PR 时跑同样的检查），提交信息使用 [Conventional Commits](https://www.conventionalcommits.org/)。

没有真实文章时，可以用测试数据预览：`YH_ISSUES_FILE=/绝对路径/issues.json npm run dev`（格式同 `src/data/issues.json`，不要提交）。

## 配置

所有可调项都在 `src/config/`，组件、脚本、GitHub Action、Pages Function 都从这里读取；视觉数值只用 `src/styles/tokens.css` 里的 CSS 令牌。

| 文件                     | 内容                                                                                               | 环境变量覆盖                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `config/site.ts`         | 名字、标题、介绍、引言、关于页、头像、建站日期、强调色、地址栏颜色、正式域名                       | `SITE_URL`                                                                                   |
| `config/locales.ts`      | 支持的语言、默认语言、`html lang` / `og:locale` 代码                                               | —                                                                                            |
| `config/nav.ts`          | Dock 导航项（顺序、路径、图标；「归档」仅在有归档内容时显示）                                      | —                                                                                            |
| `config/social.ts`       | 首页 / 关于页的社交链接                                                                            | —                                                                                            |
| `config/content.ts`      | 文章来源仓库、作者、特殊 label（`post` / `note` / `draft` / `en`）、数据文件、GitHub API、阅读速度 | `GITHUB_REPO`（其次 `GITHUB_REPOSITORY`）、`BLOG_AUTHOR`、`GITHUB_API_URL`、`YH_ISSUES_FILE` |
| `config/integrations.ts` | 评论（utterances）、ICP 备案号与显示域名、页脚致谢链接                                             | `COMMENTS_MODE`（`auto` / `click` / `off`）、`ICP_NUMBER`（设为空即关闭）、`ICP_HOSTS`       |
| `config/deploy.ts`       | Pages 项目名、交给 Function 的路径（生成 `dist/_routes.json`）、缓存键参数、构建号                 | `PAGES_PROJECT`                                                                              |
| `config/motion.ts`       | Dock 放大 / 激活点动画参数                                                                         | —                                                                                            |
| `config/env.ts`          | 读取环境变量的工具（浏览器 / Worker 中自动用默认值）                                               | —                                                                                            |

环境变量全部可选：复制 `.env.example` 为 `.env`（不提交），或在 Cloudflare Pages / GitHub Actions 里配置同名变量。`robots.txt`、`_routes.json` 在构建时由配置生成。

常改的几项：

- `site.ts`：名字、首页介绍与引言、关于页正文（`about`）、强调色 `accent`（松绿，浅色 `#3a7350` / 深色 `#7eb892`）、建站日期 `startDate`、正式域名 `url`
- `social.ts`：首页 / 关于页的社交图标，取消注释即可启用
- `content.ts`：文章来源仓库 `repo`（或 `GITHUB_REPO`）

更换头像：`npm run avatar -- ./你的头像.png`，会生成 `public/avatar.webp`、`avatar@2x.webp`、`favicon.png`、`apple-touch-icon.png`。

## 部署

托管在 **Cloudflare Pages**，通过 Git 集成部署：push 到 `main` 即自动构建发布。

- 构建命令 `npm run build`，输出目录 `dist`，环境变量 `NODE_VERSION=24`
- `functions/` 是 Pages Function：让下线的文章及时返回 404
- 内容更新由 `sync-issues.yml` 提交到 `main`，同样触发构建
- 也可以命令行直接上传：`npx wrangler login` 后 `npm run deploy`（项目名见 `config/deploy.ts`，`PAGES_PROJECT` 可覆盖）
- 自定义域名在 Cloudflare 控制台 → Workers & Pages → 项目 → 自定义域中添加；正式域名由 `site.ts` 的 `url`（或 `SITE_URL`）决定

## 中英文双语

- 中文为默认语言，在根路径 `/`；英文在 `/en/`（Astro i18n 路由）。Dock 底部的 `EN` / `中` 按钮切换，会跳到当前页面的对应语言版本，并记住选择（localStorage）。
- 界面文案（导航、按钮、区块标题、页脚、404、Mermaid 控件……）在 `src/i18n/zh.ts` / `en.ts`（`en` 缺键时类型检查会报错）。
- 首页介绍、第二行介绍、引言、关于页正文在 `src/config/site.ts`，每项都有 `zh` / `en` 两份。
- 文章 / 手记可在 frontmatter 写 `lang: en`（默认 `zh`）：
  - 中文站列出全部文章，英文文章带 `English` 小标记；
  - 英文站只列英文文章；一篇英文都没有时，回退显示中文文章，并带 `Chinese` 小标记。
- 每个页面都带 `hreflang` 互链；sitemap 也包含双语互链。RSS：中文 `/rss.xml`，英文 `/en/rss.xml`。

## 目录结构

```
src/
├── config/               ← 配置层（唯一来源，见下文「配置」）
├── i18n/                 ← 界面文案字典 zh.ts / en.ts
├── data/issues.json      ← 由 GitHub Action 从 Issues 自动同步，不要手改
├── pages/                ← 首页 / 文章 / 手记 / 归档 / 关于 / 404 / RSS（en/ 为英文版）
├── components/ layouts/  ← 组件与布局
├── scripts/              ← 浏览器端小模块（如 Mermaid 缩放平移）
└── styles/               ← tokens.css 设计令牌 + 排版 / 组件样式
docs/DESIGN.md            ← 前端视觉设计规范（改界面前先看）
public/                   ← 头像、favicon 等静态文件
scripts/avatar.mjs        ← 一键生成头像 webp / favicon
scripts/sync-issues.mjs   ← 把 Issues 同步成 src/data/issues.json
functions/                ← Cloudflare Pages Function（让下线的文章及时 404）
.env.example              ← 可选环境变量
.github/workflows/        ← issue 有变动时自动同步；CI 检查
```

## 设计

视觉规范（颜色、字号、间距、圆角、动效、组件规则）见 [`docs/DESIGN.md`](docs/DESIGN.md)，改界面前先看。

- 暖白纸面 `#faf9f5` / 深色 `#18181a`，暖色中性灰阶，单一强调色松绿 `#3a7350` / `#7eb892`
- 标题与正文 Noto Serif SC，界面 Inter，元信息与代码 JetBrains Mono，均为 OFL 字体并自托管
