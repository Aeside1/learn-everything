# 04 验收记录：完成 HeroUI 看板、复习与测验

状态：**完成**（用户行为测试、类型检查、静态构建、浏览器双主题验收全部通过；`npm run build` 在本 worktree 的构建失败为既有环境问题，见第 6 节）

## 1. 改动清单

| 文件 | 改动 |
| --- | --- |
| `frontend/features/dashboard/DashboardPanel.tsx` | 刷新改 HeroUI `IconButton`（Tooltip + `aria-label=刷新学习看板`），重试改 HeroUI `Button danger-soft`，错误态改 HeroUI `Alert status=danger role=alert`，加载态改 `Spinner`；导出入口改为 HeroUI `Button secondary` + `flex flex-wrap` 布局（移除 `.export-actions` 包裹类）；热力图由「颜色 + 透明度」改为「主题变量填充高度 + 分钟数字 + `role=img` 可访问名称 + `title` + 说明文字」，网格改用 Tailwind（`grid-cols-7 sm:grid-cols-14`） |
| `frontend/features/review/ReviewPanel.tsx` | 刷新改 `IconButton`（`刷新到期复习`），重试/错误改 `Button danger-soft` + `Alert role=alert`，查看/隐藏答案与四档评分改 HeroUI `Button`（原来的 `.review-actions` 皮肤类移除）；新增 `submitting` 状态：提交中保留当前卡片、显示 `Spinner` + `正在提交评分`、禁用全部评分/查看答案/刷新，评分失败保留卡片并显示错误 |
| `frontend/features/quiz/QuizPanel.tsx` | 知识点与题型改共享 `SelectField`（HeroUI `Select`，支持键盘与长文本换行），题目数量改 HeroUI `NumberField`（`minValue=1`/`maxValue=20`，上下按钮带 `aria-label`），选项改 HeroUI `Button`（`aria-pressed` + 选中勾选图标），答案改 `TextField` + `TextArea`（标签「你的答案」），提交/下一题改 HeroUI `Button`；反馈改 `Alert status=success|danger role=status aria-label=回答正确|需要巩固`，保留掌握度文字；移除 `.quiz-form`/`.quiz-option`/`.quiz-question`/`.quiz-feedback`/`.quiz-selection-detail` 等手写皮肤类，布局改用 Tailwind |
| `frontend/tests/dashboard-review-quiz.test.tsx`（新增） | 20 个用户行为测试，见第 4 节 |
| `frontend/tests/fixtures.ts` | 末尾追加导出：`dashboard`、`reviewCardFirst`、`reviewCardNext`、`dueCards`、`quizGeneration`、`quizAnswer`（未修改任何既有导出） |
| `frontend/tests/browser/scenarios/04-dashboard-review-and-quiz.json`（新增） | 8 个双主题场景，见第 5 节 |

未修改 `frontend/app/**`、`frontend/components/ui/**`、`frontend/tests/setup.ts`、`frontend/package.json`、`verify_theme.py`、`stub_api.py`（本次无需新增 stub 路由/常量）以及其他 feature 目录。

## 2. 控件来源清单（本任务范围）

| 位置 | 基础控件 | 来源 | 说明 |
| --- | --- | --- | --- |
| 看板刷新 | Button（图标）+ Tooltip | HeroUI + 共享 `IconButton` | `aria-label=刷新学习看板`，读取中禁用 |
| 看板重试 | Button `danger-soft` | HeroUI | 位于 `Alert status=danger role=alert` 内 |
| 看板加载 | Spinner | HeroUI | 容器 `aria-busy`，文案「正在读取学习看板」 |
| 导出入口（4 个） | Button `secondary` | HeroUI | 仍调用 `apiUrl(/projects/{id}/exports/{kind})`，协议与端点未改 |
| 热力图单元格 | `span role="img"` + Tailwind | 业务内容 | `aria-label="{date} 学习 {minutes} 分钟"`、`title`、下方分钟数字、区块说明文字，四种信息通道均不依赖颜色 |
| 复习刷新 | Button（图标）+ Tooltip | HeroUI + 共享 `IconButton` | `aria-label=刷新到期复习`，提交中禁用 |
| 复习查看/隐藏答案、四档评分 | Button `secondary` | HeroUI | 提交中禁用；评分 `重来/困难/良好/简单` 对应 1–4 |
| 复习加载/提交中 | Spinner + `role=status` 文案 | HeroUI + 业务文案 | 「正在提交评分」与禁用组合阻止重复评分 |
| 复习错误 | Alert `danger` + Button `danger-soft` | HeroUI | 读取失败给「重试」；评分失败保留卡片、提示可重新评分 |
| 测验知识点/题型 | Select（Label + Trigger + Value + Indicator + Popover + ListBox） | HeroUI，经共享 `SelectField` | 键盘：聚焦触发器后 ArrowDown 打开并定位、Enter 选中；长选项 `whitespace-normal wrap-anywhere` |
| 测验题目数量 | NumberField（Group/DecrementButton/Input/IncrementButton） | HeroUI | `minValue=1`/`maxValue=20`，输入与上下按钮均可用 |
| 测验选项 | Button `primary`/`secondary` + `aria-pressed` + Check 图标 | HeroUI | 已选态不止颜色：`aria-pressed` + 勾选图标；反馈后禁用 |
| 测验答案 | TextField + Label + TextArea | HeroUI | 只读/禁用状态由 `TextField` 统一驱动 |
| 测验提交/下一题 | Button `primary`/`secondary` + Spinner | HeroUI | 提交中禁用并显示「正在提交答案」；有反馈后禁止重复提交 |
| 测验反馈 | Alert `success`/`danger` + `role=status` + `aria-label` | HeroUI | 标题文字「回答正确」/「需要巩固」+ 后端 feedback + 「当前掌握度 N%」 |
| 测验空知识点 | 业务文案 + 禁用控件 | 文字说明 + HeroUI 禁用态 | 「当前项目没有知识点…」，Select 禁用、生成按钮禁用 |

### 原生元素例外

| 元素 | 用途 | 理由 |
| --- | --- | --- |
| `<section>`/`<article>`/`<ul>`/`<li>`/`<div>` | 面板结构与业务内容排版 | 语义布局，不是可交互控件 |
| `<p>`/`<span>`/`<strong>` | 指标、状态分布、日报、分钟数字 | 业务内容文本 |
| `span role="img"` | 热力图单元格语义 | 单元格由数字 + 色块组成，用 `role=img` + `aria-label` 表达「日期 + 分钟数」，避免仅凭颜色/透明度传达 |
| 组件库内部元素 | HeroUI 渲染出的 `input`/`textarea`/`button` | 由 HeroUI 控件产生，非手写原生控件 |

三个模块中已无手写的原生 `button`/`input`/`textarea`/`select`。

## 3. 主题与可读性决策

- 热力图原来用 `color: var(--surface)` 配 `background: var(--forest)`，深色下是「深色文字 + 深绿底」，对比不足。改为 Tailwind 语义色：底 `bg-panel-soft` + `border-border`，填充 `bg-brand-ink`（浅色深绿 / 深色浅绿），高度表示时长，数字用 `text-muted`，因此数字与含义在两种主题下都不依赖透明度。
- 看板、复习、测验的容器类（`.dashboard-*`、`.review-*`）继续保留在 `app/styles.css`，它们使用 `--panel/--line/--ink` 等主题变量，深浅两色都可读；本任务只移除控件皮肤类，未改全局 CSS（属主代理文件，见第 7 节）。
- 反馈/状态一律带文字（回答正确 / 需要巩固 / 当前掌握度 / 正在提交评分 / 正在读取学习看板），Alert 的 `status` 只作为附加信号。

## 4. 用户行为测试（jsdom，`npx vitest run --no-cache`）

`frontend/tests/dashboard-review-quiz.test.tsx`，20 个测试，全部在 `../lib/api` 处模拟（保留真实 `apiUrl`）：

| 分组 | 覆盖 |
| --- | --- |
| 学习看板（4） | 指标 185/42%、状态分布、热力图 `aria-label` 与 `title`、热力图说明文字、日报；刷新时禁用 + 重新读取；读取失败 `role=alert` + 重试恢复；导出按钮通过 `apiUrl("/projects/7/exports/roadmap|anki")` 指定目标 |
| 到期复习（7） | 正面→查看答案→隐藏答案；评分 `良好`→`submitReview(501,3,1)`→下一张卡片且答案隐藏；提交中显示「正在提交评分」、禁用四档评分/刷新、第二次点击不重复提交，完成后恢复；空队列「当前没有到期卡片。」；读取失败重试；评分失败保留卡片并可重试 |
| 查漏测验（7） | 知识点 + 题型选择、题目数量 3→4 后 `generateQuiz(1,{node_ids:[104],count:4,qtype:"choice"})`；数量受 1–20 约束（减到 1、加到 20 不再增长）；未选知识点校验且不发请求；空答案校验；提交显示「回答正确」「当前掌握度 75%」并禁用提交/选项，下一题清空答案、隐藏反馈、末题无「下一题」；提交失败保留题目并可重试；生成失败保留已选知识点；空知识点禁用生成 + 提示 |
| 主题保留（2） | 复习查看答案后切深色：正反面、隐藏答案按钮仍在，`getDueCards` 仍为 1 次、未提交评分；测验切深色：已选知识点、当前题目、文本框内容、反馈与掌握度保留，`generateQuiz`/`submitQuizAnswer` 各 1 次 |

## 5. 浏览器双主题验收

```powershell
cd frontend
npx next build --webpack        # 生成 out/（原因见第 6 节）
& "C:\Users\32494\.pyenv\pyenv-win\versions\3.11.9\python.exe" tests\browser\verify_theme.py `
  --scenarios tests\browser\scenarios\04-dashboard-review-and-quiz.json `
  --out ..\.scratch\heroui-integration\evidence\04 --port 8132
```

结果：**8 个场景全部通过，30 组双主题截图（60 张 PNG）**，`report.json` 中所有场景 `status=passed`、`failedRequests` 为空；`consoleErrors` 仅出现在故意注入 503 的错误场景。证据目录：`.scratch/heroui-integration/evidence/04/`（含 `report.json`、`summary.md`、60 张 PNG）。

| 场景 | 覆盖 | 截图 |
| --- | --- | --- |
| `dashboard-metrics-heatmap-report` | 指标/状态分布/热力图（`role=img` 名称 + 分钟数字 + 说明）/日报；刷新按钮键盘焦点；导出按钮悬停；820×900 窄内容列（指标、热力图、日报、导出按钮仍可读） | 4 组 |
| `dashboard-export-targets` | 依次点击 4 个导出按钮，页面导航到 `/api/v1/projects/1/exports/{roadmap,markdown,report,anki}` 并显示对应替身响应，证明沿用原端点与格式 | 1 组 |
| `dashboard-loading-error-retry` | 刷新中（延迟 2500ms）加载态、503 错误 + 重试、恢复 | 3 组 |
| `review-front-back-rating-empty-queue` | 正面、查看答案后的背面、提交中（延迟 6000ms：禁用 + 正在提交评分）、`良好` 后进入下一张、再评分后「当前没有到期卡片。」 | 5 组 |
| `review-loading-error-retry` | 读取失败 `role=alert` + 重试恢复 | 2 组 |
| `quiz-selection-popover-and-answer-flow` | 默认表单；知识点浮层展开（含超长知识点标题，portal 浮层，浅/深两色均有截图）；键盘选择（聚焦→ArrowDown→Enter→「已选：1.1 所有权与借用」）；长标题已选态；生成后的题目；选项已选；提交后「回答正确」「当前掌握度 75%」且提交/选项禁用；下一题切到第 2 题且末题无「下一题」；错误反馈「需要巩固」 | 8 组 |
| `quiz-validation-and-failures` | 未选知识点校验提示；生成 503 失败且保留已选知识点；提交 503 失败且保留当前题目与答案；重试后成功反馈 | 4 组 |
| `theme-switch-retention-review-and-quiz` | 复习查看答案后切深色并往返（正反面与四档评分保留）；测验答题反馈后切深色并往返（知识点、当前题目、答案、反馈、掌握度全部保留） | 3 组 |

每个截图点仍执行 浅色 → 深色 → 浅色 往返，并在切换后复验该点声明的主题无关目标。浮层探针结果：

- `quiz-knowledge-popover-long-option`：`role=dialog` 浅色 `background oklch(1 0 0)` / `color oklch(0.2103 …)`，深色 `background oklch(0.2103 …)` / `color oklch(0.9911 0 0)`；`role=listbox` 文字色同步反转 → 通过 portal 渲染的选择器浮层确实随主题变化，且浮层在两种主题下都被截图（该浮层包含 `role=dialog`，harness 因此走 dom-swap 主题切换而不关闭浮层）。
- `dashboard-error`：错误态出现过一次 Tooltip 浮层探针，浅/深不同。

人工查看的关键截图：`dashboard-default-{light,dark}`、`dashboard-narrow-light`、`review-submitting-{light,dark}`、`quiz-feedback-correct-dark`、`quiz-knowledge-popover-long-option-{light,dark}`、`quiz-selection-long-title-light`、`dashboard-loading-dark`。

## 6. 命令结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npx vitest run --no-cache` | 通过（9 文件 / 48 测试；含本任务 20 个） |
| `npx next build --webpack` | 通过（静态导出 `out/`，`/` 与 `/_not-found`）；浏览器验收使用该产物 |
| `npm run build`（Next 16 默认 Turbopack） | **在本 worktree 失败**：`TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root`。`frontend/node_modules` 是指向主检出 `G:\Github\learn-everything\frontend\node_modules` 的 junction，越出了 Turbopack 自动识别的项目根。已用「改动前同一棵树」（`git stash push -u` 后构建）复现同样错误，确认与本任务改动无关。 |
| `$env:NEXT_PRIVATE_OUTPUT_TRACE_ROOT='G:\Github'; npm run build` | 第一次通过（把 Turbopack 根扩到含 worktree 与主检出的公共祖先，证明失败仅由 junction 根边界造成），第二次在同一环境以另一条无关错误失败（`Failed to write app endpoint /page … async_module_info was canceled`），因此不作为可依赖的构建方式。 |
| Playwright 场景（8 个） | 全部通过（30 组双主题截图） |

## 7. 未完成 / 限制

- **`npm run build` 的 Turbopack 失败是 worktree 环境问题**：主检出的 `node_modules` 是真实目录，主检出构建不受影响；并行 worktree 可用 `npx next build --webpack` 得到同样的静态产物。仓库内没有可移植的配置修复（`turbopack.root` 需要写成机器相关路径），因此建议由主代理在环境层解决（worktree 内提供根内 node_modules，或 worktree 构建统一使用 `--webpack`）。证据：上文第 6 节第三条命令输出；复现命令：`git stash push -u; npm run build; git stash pop`（已在本次执行）。
- **≤760px 的窄屏布局是既有缺陷，与本任务无关**：`app-shell` 在 `max-width: 760px` 下改为纵向排列，而项目侧栏是 `h-screen`、`html/body` 又是 `overflow: hidden`，因此 420×860 下主内容被挤到视口下方且无法滚动到。任务 02 的证据 `evidence/02/workspace-narrow-tabs-light.png` 已经是同样表现。本任务因此把窄屏截图改为 820×900（保持横向为主、内容列窄）并写入记录；真正修复需要改 `app/**`（主代理文件，见下）。
- 题目数量输入在 jsdom 与浏览器中都用「输入框 + 上下按钮」覆盖；`minValue/maxValue` 的边界以「减到 1 不再减小、加到 20 不再增大」验证（jsdom），没有验证键入越界数字后失焦钳制的行为。
- `NumberField` 的增减按钮可访问名称由 RAC 的 `aria-labelledby` 决定（解析为字段标签「题目数量」），我在按钮上写的 `aria-label=增加/减少题目数量` 会被覆盖；测试用该属性定位按钮。这是 HeroUI/RAC 的既有行为，未自行绕过。
- 「长卡片/长题目」使用替身数据中现有的整句正反面与题干，未额外构造超长卡片文本（`stub_api.py` 既有常量不可修改，也不新增常量）。
- 掌握度文字与「下一题」按钮在 900px 视口下位于首屏以下，截图未包含，但 `expectText` 断言其可见（Playwright 可见性不要求进入视口）。
- 复习提交失败时保留当前卡片并提示可重新评分（原实现会切到错误态并隐藏卡片）；这是为「提交加载反馈 + 不重复评分 + 失败重试」做的行为调整，未改变请求、DTO 与错误文案。
- 未验证系统主题（`system`）跟随操作系统变化，与任务 01 记录一致。

## 8. 共享文件变更请求（主代理文件，本次未改动）

1. `frontend/app/styles.css`：本任务已无调用方的控件皮肤可删除（已用 `Select-String` 确认 `features/**` 与 `app/**` 中无引用）：
   `.review-actions`、`.review-actions button`、`.review-actions button:hover`、`.quiz-form`、`.quiz-form label`、`.quiz-form select, .quiz-form input, .quiz-question textarea`、`.quiz-form select`、`.quiz-selection-detail`、`.quiz-question`、`.quiz-question > span`、`.quiz-question > strong`、`.quiz-question textarea`、`.quiz-option`、`.quiz-option.active, .quiz-option:hover`、`.quiz-feedback`、`.quiz-feedback.incorrect`、`.quiz-feedback p`、`.export-actions`、`.export-actions button`、`.export-actions button:hover`、`.heatmap`、`.heatmap span`，以及 `@media (max-width: 760px)` 中的 `.quiz-form { grid-template-columns: minmax(0, 1fr); }`。
2. 窄屏（≤760px）可用性修复需要 `frontend/app/styles.css` 与/或项目外壳改动，例如让侧栏在纵向布局下不占满整屏：
   ```css
   @media (max-width: 760px) {
     .app-shell { flex-direction: column; }
     .app-shell > aside { height: auto; max-height: 40vh; }
     html, body { overflow: auto; }
   }
   ```
   具体取法建议由主代理在全局验收任务中确认（涉及滚动容器与既有「左右两栏独立滚动」的约定）。
