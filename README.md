# EEG 抑郁症识别项目 · 官方网站

这是项目官网的完整源码。基于 **Astro** 构建的静态站点：文章用 Markdown 写，`git push` 即自动部署。

---

## 一、本地看效果

### ⚠️ 先记住一条：不要直接双击 `dist/index.html`

静态站点里的资源引用的是**绝对路径**：

```html
<link rel="stylesheet" href="/_astro/BaseLayout.xxx.css">
<a href="/about">关于</a>
```

用 `file://` 打开时，`/_astro/...` 会被解析到**盘符根目录**（`E:\_astro\...`），
那里没有文件 → CSS 加载失败、所有站内链接也都是坏的，你看到的会是**没有样式的裸 HTML**。

**这不是网站的问题。** Hugo、Jekyll、Next、Astro 生成的静态站点全都这样 ——
它们必须**通过 HTTP 提供服务**，而不是当成一个文件双击打开。

（想验证的话：双击打开后按 F12 看 Console，会看到一串 404。）

### 方式 A：双击预览（推荐，不需要装任何东西）

双击项目根目录下的 **`预览网站.cmd`** —— 它会启动一个本地服务器并自动打开浏览器。
关掉那个窗口就停止服务。

### 方式 B：手动起服务器

```bash
# 用 Python（本机已装，不需要 npm install）
cd dist
python -m http.server 8080
# 然后浏览器打开 http://127.0.0.1:8080/
```

### 方式 C：开发模式（改样式、写文章时用这个）

需要 **Node.js 20+**（本机实测 22.23.3）。

```bash
npm install        # 第一次需要，约 1–2 分钟
npm run dev        # 打开 http://localhost:4321，改文件会自动刷新
```

其他命令：

```bash
npm run build      # 构建到 dist/
npm run preview    # 预览构建结果（等价于方式 B）
```

---

## 二、怎么发一篇新文章（90% 的时间都花在这）

在对应的目录里新建一个 `.md` 文件即可，**不需要改任何代码**。

| 想发什么 | 放到哪个目录 |
|---|---|
| 项目进展 | `src/content/progress/` |
| 未来展望 | `src/content/outlook/` |
| 心得分享 | `src/content/notes/` |

文件名就是网址。比如 `src/content/notes/mne-pitfalls.md` → `/notes/mne-pitfalls/`。

**文件开头必须写这段 frontmatter：**

```markdown
---
title: "文章标题"
description: "一句话摘要，会显示在列表页和搜索结果里"
date: 2026-10-08
tags: ["标签一", "标签二"]
draft: false
---

正文从这里开始，正常写 Markdown 就行。
```

- `draft: true` 表示草稿，**不会**出现在网站上 —— 写一半可以先存草稿。
- `date` 用 `YYYY-MM-DD` 格式。
- 支持 Markdown 的标题、列表、表格、代码块、引用、图片。

### 不会命令行 / Git 的队友怎么发？

最简单的办法：**在 GitHub 网页上直接新建文件**。

1. 打开仓库 → 进入 `src/content/notes/`
2. 右上角 **Add file → Create new file**
3. 文件名写 `my-article.md`
4. 粘贴上面的 frontmatter + 正文
5. 拉到底部点 **Commit changes**

30 秒学会，不需要装任何东西，提交后网站会自动重新部署。

---

## 二·补、访客投稿：审核后自动发布

「心得分享」栏目**对外开放投稿** —— 任何访客都能写，不限于项目组成员。

### 它是怎么运转的

```
访客在网站上点「我要投稿」
   ↓ 打开预填好的 GitHub Issue 表单（.github/ISSUE_TEMPLATE/submit-note.yml）
   ↓ 填写标题 / 署名 / 摘要 / 正文，勾选三项同意条款
   ↓ 提交 → 变成一条公开 Issue
你在 Issue 上打一个「已采纳」标签          ← 人工审核就在这一步
   ↓ .github/workflows/publish-submission.yml 被触发
   ↓ 解析 Issue、校验同意条款、生成 src/content/notes/<slug>.md
   ↓ 提交并推送，然后主动触发 deploy.yml（因为 GITHUB_TOKEN 的推送不会自动触发其它工作流）
   ↓ 1 分钟后文章上线，机器人回到 Issue 里回复网址
```

### 你要做的只有一个动作

**在 Issue 上打「已采纳」标签。** 剩下的全自动。

如果内容有问题（比如同意条款没勾全），工作流会失败并**自动在 Issue 里回帖说明原因**，不会发布。

### 想改一篇已发布的投稿

让作者直接编辑那条 Issue（或者你自己改），然后**去掉「已采纳」标签再重新打一次**，文章会自动更新，网址不变。

### 想撤下一篇投稿

直接删掉 `src/content/notes/<slug>.md` 并推送即可。

### 相关文件

| 文件 | 作用 |
|---|---|
| `.github/ISSUE_TEMPLATE/submit-note.yml` | 访客看到的投稿表单 |
| `.github/ISSUE_TEMPLATE/config.yml` | 表单入口的引导与说明 |
| `.github/scripts/issue-to-post.mjs` | 把 Issue 解析成文章的脚本 |
| `.github/workflows/publish-submission.yml` | 打标签后触发的自动化流程 |
| `src/pages/contribute.astro` | 站内的《投稿指南》页面 |
| `src/components/ContributeCTA.astro` | 心得分享页顶部的投稿入口 |
| `src/consts.ts` 的 `CONTRIBUTE` | 投稿相关的链接配置 |

> ⚠️ **改 Issue 表单的字段名时，必须同步改 `issue-to-post.mjs` 里的 `FIELDS`** —— 脚本靠字段标签来解析内容。

> ⚠️ **本地开发时删过文章的话**，要清掉内容层缓存再构建，否则会报
> `Rolldown failed to resolve import ... content-layer-deferred-module`：
> ```powershell
> Remove-Item .astro,node_modules\.astro,dist -Recurse -Force
> npm run build
> ```
> （CI 每次是全新检出，不会遇到这个问题）

---

## 三、要改的地方（就这几处）

| 想改什么 | 改哪里 |
|---|---|
| **域名** | `astro.config.mjs` 里的 `SITE_URL` ← **上线前必改** |
| 站名、简介、作者 | `src/consts.ts` 里的 `SITE` |
| 栏目名称与说明 | `src/consts.ts` 里的 `SECTIONS` |
| 配色、字号、圆角 | `src/styles/global.css` 顶部的 CSS 变量 |
| 页脚备案号 | `src/components/Footer.astro` |
| 团队成员、数据集说明 | `src/pages/about.astro` |

改完 `npm run dev` 会热更新，立刻能看到效果。

---

## 四、用 GitHub 当"后端"能覆盖到什么程度

**能覆盖到这个项目 95% 的需求，而且不需要任何服务器。** 但要分清它能做什么、不能做什么。

### GitHub 能当什么

| 角色 | 用什么实现 | 状态 |
|---|---|---|
| **代码仓库 / 唯一事实来源** | Git 仓库 | ✅ 已经在用 |
| **构建机（CI）** | GitHub Actions（`.github/workflows/deploy.yml`） | ✅ 已配好 |
| **静态托管 / CDN** | GitHub Pages | ✅ 已配好 |
| **内容管理后台（CMS）** | 仓库网页端编辑器 / `github.dev`（在仓库页按 `.` 键） | ✅ 开箱即用 |
| **评论系统后端** | Giscus（把 GitHub Discussions 当评论数据库） | ⬜ 待接入，见下 |
| **需求 / 问题收集** | GitHub Issues，可以直接当"留言板"用 | ✅ 开箱即用 |
| **版本历史与审计** | Git 提交历史 | ✅ 已经在用 |

### GitHub 不能当什么（别踩）

| 做不了 | 为什么 | 替代方案 |
|---|---|---|
| **数据库**（可查询、可写入） | 仓库只能读文件，没有查询接口 | 静态 JSON 文件够用；真要动态数据得上服务端 |
| **用户登录 / 权限** | 没有服务端会话 | 用 GitHub OAuth（第三方）或干脆不做 |
| **服务端接口（API）** | Actions 是"被事件触发"的，不是"被 HTTP 请求调用"的 | Cloudflare Workers / Vercel Functions |
| **存敏感数据** | 仓库的一切都会被 clone 到每个协作者本地 | ❌ 见第五节的硬红线 |
| **存大文件** | 单文件 100MB 上限、仓库建议 <1GB | 数据留在本地/网盘，网站只放图表 |

### ⚠️ 一条硬红线

**不要因为"仓库是 Private"就把被试数据传上去。**

- 每一次 `git clone` 都会把完整历史拉到协作者的电脑上，你**无法收回**
- 一旦某天转为公开、或有人 fork，数据就流出了
- EDF 头部字段里有被试姓名、性别、出生日期 —— 这是**可识别个人信息**
- `.gitignore` 已经做了防护，但**推之前必须自己再确认一遍**（见第五节）

**GitHub 当后端 ≠ 可以存敏感数据。** 它只适合放"本来就打算公开"的内容。

---

## 五、两种部署方式（二选一，或都配）

### 方式 1：GitHub Pages（纯 GitHub 方案）

网站、构建、托管全在 GitHub 上，**一个平台搞定**。

**一次性配置：**

1. 仓库 → **Settings → Pages** → Source 选 **GitHub Actions**
2. 绑自定义域名：Settings → Pages → **Custom domain** 填 `weegoto.top`
3. 去域名注册商加 DNS 记录：
   ```
   A      @      185.199.108.153
   A      @      185.199.109.153
   A      @      185.199.110.153
   A      @      185.199.111.153
   CNAME  www    cmnx666.github.io
   ```
4. 勾选 **Enforce HTTPS**（证书 GitHub 自动签发）

之后每次 `git push`，Actions 会自动构建并发布。

> ⚠️ **如果用自定义域名**：`astro.config.mjs` 的 `SITE_URL` 已经填好 `https://weegoto.top`，`base` 不用管。
> **如果不用自定义域名**（走 `https://cmnx666.github.io/weegoto/`）：
> 必须在 `astro.config.mjs` 里加 `base: '/weegoto'`，否则 CSS 和站内链接会 404。

### 方式 2：Cloudflare Pages（访问速度更稳）

GitHub 只管代码，构建和托管交给 Cloudflare。配置见下一节。

### 怎么选

| | GitHub Pages | Cloudflare Pages |
|---|---|---|
| 平台数量 | 一个（GitHub） | 两个（GitHub + Cloudflare） |
| 费用 | 免费 | 免费 |
| 自定义域名 + HTTPS | ✅ | ✅ |
| 构建时长限制 | 每月 2000 分钟（个人够用） | 每月 500 次构建 |
| **国内访问** | ⚠️ **`*.github.io` 在国内经常很慢甚至打不开** | 相对更稳，但不保证 |
| 需要备案 | 不需要 | 不需要 |

**给你们的建议**：因为评委和同学都在国内，**优先用 Cloudflare Pages**；
GitHub Pages 作为备份方案（两个都配着，哪个通用哪个，源码完全一样）。

> 如果对国内访问速度有硬要求，那就只能走国内云主机 + **ICP 备案**（域名+服务器，2–21 天，见 `项目官网建设方案.html`）。

---

## 六、可选：用 GitHub Discussions 当评论系统（Giscus）

这是"用 GitHub 当后端"最典型的用法 —— 评论存在 GitHub Discussions 里，不需要任何数据库。

1. 仓库 → **Settings → General → Features** → 勾选 **Discussions**
2. 到 [giscus.app](https://giscus.app/) 填你的仓库名，它会生成一段 `<script>` 配置
3. 把那段脚本放进 `src/layouts/ArticleLayout.astro` 的正文下方
4. 访客用 GitHub 账号登录后即可评论，评论以 Discussion 形式存在你的仓库里

**代价**：评论者必须有 GitHub 账号，门槛偏高。学生项目一般够用。

---

## 七、部署到 Cloudflare Pages

### 1. 推到 GitHub

```bash
git init
git add .
git commit -m "init: 项目官网"
git branch -M main
git remote add origin git@github.com:cmnx666/weegoto.git
git push -u origin main
```

> ⚠️ **推之前先看第八节的检查清单** —— 仓库里绝对不能有被试数据。

### 2. 连 Cloudflare Pages

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 选中刚推上去的仓库
3. 构建配置填：

   | 字段 | 值 |
   |---|---|
   | Framework preset | `Astro`（或 None） |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | 环境变量 | `NODE_VERSION` = `22` |

4. 点 **Save and Deploy**，等 1–2 分钟。完成后会给你一个 `xxx.pages.dev` 的地址 —— **这时候网站已经上线了**。

### 3. 绑定你自己的域名

1. 在 Pages 项目里 → **Custom domains** → **Set up a custom domain** → 填 `weegoto.top`
2. 按提示去域名注册商改 DNS（通常是加一条 `CNAME`，或者把 NS 托管给 Cloudflare）
3. 等几分钟到几小时生效
4. **HTTPS 证书 Cloudflare 会自动签发和续期**，不用自己申请

因为托管在 Cloudflare（海外），**不需要 ICP 备案**。

### 4. 提交搜索引擎

- [Google Search Console](https://search.google.com/search-console)
- [Bing 站长工具](https://www.bing.com/webmasters)
- [百度站长平台](https://ziyuan.baidu.com/)

提交 `https://weegoto.top/sitemap-index.xml`，之后别人搜项目名才能搜到。

---

## 八、⚠️ 上传前的强制检查清单

**这一步不能跳。** EDF 文件的头部字段里直接写着被试的「姓名 + 性别 + 出生日期」明文，
而 `results/edf_headers.csv` 把 181 个文件的姓名、性别、出生日期全列出来了。

`.gitignore` 已经做了防护，但**你必须亲自确认一遍**：

```bash
git status                        # 逐条看要提交什么
git ls-files | findstr /i "csv fif edf data results"    # 应该没有任何输出
```

- [ ] 没有 `data/`、`results/`、`results_*/`、`figures_*/` 目录
- [ ] 没有 `*.edf`、`*.fif` 文件
- [ ] 没有 `edf_headers*.csv`、`*subject*.csv`
- [ ] 没有 `.env` 或任何密钥
- [ ] 仓库先设为 **Private**，确认干净后再决定是否公开

**万一不小心推上去了**：改一个 commit 是不够的，必须
用 `git filter-repo` 重写历史，或者直接删库重建。

**网站内容的红线**：

- ✅ 可以发：准确率、AUC、混淆矩阵、ROC 曲线、方法学讨论
- ❌ 不能发：原始脑电数据、被试姓名/性别/出生日期、量表分数、任何可反推个体身份的信息
- ❌ 不要写"我们的系统能诊断抑郁症" —— 你们自己已经证明了批次混杂问题，更准确的说法是
  **"我们建立了一条可复现的基线，并发现了该公开数据集中的批次混杂"**

---

## 九、目录结构

```
.
├── 预览网站.cmd              # ← 双击本机预览（不需要 npm install）
├── astro.config.mjs          # 站点配置（域名在这里改）
├── package.json
├── tsconfig.json
├── .gitignore                # ⚠️ 数据红线防护，别删
├── .github/
│   └── workflows/
│       └── deploy.yml        # ← 推送到 main 自动构建并发布到 GitHub Pages
├── public/                   # 原样拷贝到 dist 的静态文件
│   ├── favicon.svg
│   └── robots.txt
├── dist/                     # 构建产物（已在 .gitignore 中，不进仓库）
└── src/
    ├── consts.ts             # 站名、简介、栏目定义
    ├── content.config.ts     # 内容系统（含自定义 Markdown loader）
    ├── styles/global.css     # 全局样式与设计变量
    ├── components/
    │   ├── Header.astro
    │   ├── Footer.astro
    │   ├── ArticleCard.astro
    │   └── SectionIndex.astro
    ├── layouts/
    │   ├── BaseLayout.astro  # HTML 骨架、SEO meta
    │   └── ArticleLayout.astro
    ├── content/              # ← 文章都放这里
    │   ├── progress/
    │   ├── outlook/
    │   └── notes/
    └── pages/                # 路由
        ├── index.astro
        ├── about.astro
        ├── resources.astro
        ├── 404.astro
        ├── rss.xml.js
        ├── progress/{index,[...slug]}.astro
        ├── outlook/{index,[...slug]}.astro
        └── notes/{index,[...slug]}.astro
```

新增一个栏目需要改三处：`consts.ts` 的 `SECTIONS`、`content.config.ts` 的 `collections`、
以及 `src/pages/<新栏目>/` 下的两个页面（可以照抄 `notes/` 里的）。

---

## 十、两点技术说明（出问题时看这里）

### 1. 为什么 `content.config.ts` 里有一个自己写的 loader？

Astro 官方的 glob loader 在顶层 `import` 了 `yaml` 和 `picomatch` 这两个 **CJS 包**。
在当前组合（Astro 7.3.8 + Vite 8.3.4 + Node 22 + Windows）下，
Vite 的模块运行器会把它们当 ESM 求值，直接抛：

```
require is not defined
    at eval (.../node_modules/yaml/dist/index.js:6:16)
```

这会让 `astro sync` 失败，**整个构建起不来**。

官方 loader 改不了，所以这里用 Astro 的内容层扩展点写了一个等价的自定义 loader：
只用 Node 内置模块递归读 `.md`、手写 frontmatter 解析、把正文交给 Astro 渲染。
行为与官方 loader 一致，而且更好调试。

**如果将来 Astro/Vite 修好了这个问题**，可以换回官方写法：

```ts
import { glob } from 'astro/loaders';
const progress = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/progress' }),
  schema: articleSchema,
});
```

### 2. 构建时要注意的环境变量

在受限环境或 CI 里，Astro 的遥测会尝试写用户目录并失败。加一个环境变量即可：

```bash
ASTRO_TELEMETRY_DISABLED=1
```

Cloudflare Pages 上不需要设置这个。

---

## 十一、下一步可以做的

- [ ] 换成真实域名（`astro.config.mjs`）
- [ ] 补上团队成员信息与照片（`about.astro`，上网站前先征得本人同意）
- [ ] 加上访问统计（Cloudflare Web Analytics，免费，加一段 script 即可；加了记得补隐私政策页）
- [ ] 把项目里的图表导出成 PNG 放进 `public/images/`，在文章里引用
- [ ] 定一个更新节奏：**每 2 周一篇**，写进团队日历
