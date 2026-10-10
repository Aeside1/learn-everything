# 03 验收记录：完成 HeroUI 路线创建与节点学习

状态：**完成**（用户行为测试、类型检查、静态构建、浏览器双主题验收全部通过；构建命令有一处环境限制，见第 6 节）

## 1. 改动清单

| 文件 | 改动 |
| --- | --- |
| `frontend/features/roadmap/RoadmapCreation.tsx` | 原生 `label`+`Input`/`TextArea`/数字输入替换为 HeroUI `TextField`/`Label`/`Input`/`TextArea`/`NumberField`(+`Group`/`DecrementButton`/`IncrementButton`)/`Description`/`FieldError`；操作按钮全部 HeroUI `Button`（primary/secondary/ghost）+ `Spinner`；内容准备作业的停止/重试加在途禁用（`jobAction`）防止重复提交；错误块加 `role="alert"`；表单容器类由 `.roadmap-form` 改为 `roadmap-create-form`（Tailwind 网格），调整行由 `.refine-row` 改为 `roadmap-refine`，使旧的 `.roadmap-form input/textarea/label`、`.refine-row input` 手写皮肤不再命中迁移后的 HeroUI 控件；删除无效的 `.command-layout`、`.hour-input` |
| `frontend/features/roadmap/RoadmapPanel.tsx` | 节点入口 `<Button variant="ghost">` 去掉 `.node-open-button` 皮肤，改用 Tailwind 工具类实现原有栅格/内边距与 `max-[1100px]` 响应式；其余业务结构、可访问名称与回调不变 |
| `frontend/features/roadmap/NodeStatusControl.tsx` | 4 个带 `.status-button` 手写皮肤的 `Button` 替换为 HeroUI `ToggleButtonGroup`（`selectionMode="single"`、`isDetached`、`size="sm"`、`selectedKeys=[node.status]`、`disallowEmptySelection`）+ 4 个 `ToggleButton`；保留 `status-control` 布局类与 `statusLabels` 导出 |
| `frontend/features/roadmap/NodeDetailPanel.tsx` | 笔记原生皮肤 `TextArea.detail-note` 替换为 `TextField`+`Label`+`TextArea`；`LoaderCircle` 局部加载图标替换为 HeroUI `Spinner`；新增 `role="status"` 操作状态文字（正在生成课程内容/实操/拉取资料/保存笔记…）；错误容器保持 `role="alert"`；按钮保持 `secondary`/`primary` 与禁用语义 |
| `frontend/features/roadmap/useNodeDetail.ts` | 未改动（状态所有权、请求编号、错误语义保持原样） |
| `frontend/tests/roadmap-panel.test.tsx` | 重写并扩展：状态单选控件、待提交禁用、乐观更新回滚、操作期间禁用与状态文字、笔记保存成功/失败、长内容 Markdown 结构、主题切换保留详情与笔记草稿 |
| `frontend/tests/roadmap-creation.test.tsx`（新增） | 创建预览→调整→保存→准备任务→停止→重试→查看新项目、生成中禁用、失败保留输入、字段必填/长度/1–168 范围、页面级主题切换保留表单与预览 |
| `frontend/tests/fixtures.ts` | 追加导出：`richLessonMarkdown`、`richLessonDetail`、`roadmapPreview`、`contentPreparation`、`projectCreation`（未改动既有导出） |
| `frontend/tests/browser/scenarios/03-roadmap-and-node-detail.json`（新增） | 4 个双主题场景，26 组浅/深截图 |
| `frontend/tests/browser/stub_api.py` | 未改动：本任务所需的路线预览/调整、项目创建、内容准备轮询与停止/重试、节点状态、节点详情、笔记、资料接口已由既有替身覆盖，无需新增数据 |

## 2. 控件来源清单（本任务范围）

| 位置 | 基础控件 | 来源 | 说明 |
| --- | --- | --- | --- |
| 路线创建 选题/学习背景/学习目标 | `TextField`/`Label`/`Input`/`TextArea`/`FieldError` | HeroUI | 必填、`maxLength` 300/4000 保留 |
| 路线创建 每周投入时间 | `NumberField`/`NumberField.Group`/`DecrementButton`/`Input`/`IncrementButton`/`Description`/`FieldError` | HeroUI | `isRequired`、`minValue=1`、`maxValue=168`；1–168 夹取行为有测试 |
| 生成路线预览 / 调整 / 确认保存并开始准备 | `Button`（primary/secondary）+ `Spinner` | HeroUI | 生成、保存、准备中禁用并显示「正在生成 / 正在保存项目 / 正在启动内容准备」 |
| 内容准备 停止准备 / 重试未完成内容 / 查看新项目 | `Button`（secondary/ghost、`size="sm"`）+ `Spinner` | HeroUI | 请求在途禁用，防重复提交 |
| 创建错误提示 | 业务色块 + `Button ghost` 关闭 | HeroUI（容器为业务排版） | `role="alert"`，文案保持原样 |
| 节点入口 | `Button variant="ghost"` | HeroUI | 布局用主题无关的 Tailwind 工具类（`h-auto/w-full/items-start/p-[19px]/max-[1100px]:…`），显式 `aria-label` 保留 |
| 返回学习路线 | `Button variant="secondary"` + Lucide 图标 | HeroUI | |
| 节点状态 4 状态 | `ToggleButtonGroup`（single/detached/sm）+ `ToggleButton` | HeroUI | 单选中，`role=radiogroup`+`aria-checked`，选中态由 `data-selected` 驱动（`--accent-soft`）；文字标签始终可见 |
| 详情 生成课程 / 生成实操 / 拉取资料 | `Button variant="secondary"` + `Spinner` | HeroUI | 任一操作进行中全部禁用 |
| 详情 笔记 | `TextField`/`Label`/`TextArea` | HeroUI | 标签「学习笔记」，操作进行中禁用，失败保留草稿 |
| 详情 保存笔记 | `Button variant="primary"` + `Spinner` | HeroUI | |
| 详情操作状态文字 | `<p role="status">` | 业务排版 | 「正在生成课程内容…」等，随操作出现/消失 |
| 课程/实操 Markdown | `MarkdownContent` + `.lesson-content` 业务排版 | 业务排版（保留） | 排版规则本身已由主题变量驱动，本任务未改 `app/styles.css` |

### 原生元素例外

| 元素 | 用途 | 理由 |
| --- | --- | --- |
| `<form>`（创建表单） | 提交与原生必填/长度校验 | 语义表单容器，不是控件 |
| `<ol>/<li>`、`<article>`、`<section>` | 预览节点列表、节点行、详情分栏 | 语义布局 |
| `<a class="detail-resource">` | 参考资料条目链接 | 业务内容链接（非基础操作控件），排版与配色走业务主题变量 |
| HeroUI `Label` 渲染出的 `<label>`、`TextArea`/`Input` 渲染出的原生表单元素 | 库内部实现 | 来源仍是 HeroUI |
| Lucide 图标 | 按钮内图标 | 图标不是基础控件 |

本任务范围内已无手写的 `button`/`input`/`textarea`/`select` 皮肤类：`.node-open-button`、`.status-button`、`.detail-note`、`.hour-input`、`.command-layout`、`.secondary-button`、`.command-button` 均已不再被本模块引用；`.roadmap-form input/textarea/label`、`.refine-row input` 因容器类改名不再命中。这些规则本体由任务 07 统一删除。

## 3. 用户行为测试

| 测试文件 | 覆盖 |
| --- | --- |
| `tests/roadmap-creation.test.tsx`（5 个） | 预览→调整→保存→准备任务→停止→重试→查看新项目的完整链路与请求载荷；生成中禁用与状态文字「正在生成」；预览失败保留已填内容并显示可读错误、按钮恢复可用；必填/`maxLength` 300·4000/每周投入 500→168、0→1 的范围约束；页面级切换主题后表单与预览保留（`previewRoadmap` 只调用一次） |
| `tests/roadmap-panel.test.tsx`（10 个） | 列表进详情再返回；4 个状态控件的可访问名称、当前状态（`aria-checked`）与回传；提交中禁用全部状态控件；详情状态更新失败回滚乐观状态；生成失败显示操作错误；生成中显示状态文字并禁用其他操作、完成后恢复；笔记提交内容、失败保留草稿并显示错误、成功后采用服务端笔记；课程/实操 Markdown 的标题/代码/表格/引用/链接结构；切换主题保留当前节点与笔记草稿 |

## 4. 浏览器双主题验收

```powershell
$env:NEXT_PRIVATE_OUTPUT_TRACE_ROOT="G:/Github"   # 见第 6 节的环境限制
npm run build
& "C:\Users\32494\.pyenv\pyenv-win\versions\3.11.9\python.exe" tests\browser\verify_theme.py --scenarios tests\browser\scenarios\03-roadmap-and-node-detail.json --out ..\.scratch\heroui-integration\evidence\03 --port 8131
```

结果：4 个场景全部通过，26 组双主题截图，无请求失败；仅在故意注入 503 的步骤出现 3 条浏览器控制台「Failed to load resource: 503」记录（预期）。证据在 `.scratch/heroui-integration/evidence/03/`（`report.json` 含每步状态、浅→深→浅往返方式、浮层配色探针）。

| 场景 | 覆盖 | 截图 |
| --- | --- | --- |
| `roadmap-create-preview-refine-save` | 填表与输入焦点、提交按钮焦点、预览、按调整指令重生成、保存并启动内容准备、停止准备、重试、查看新项目 | 8 组 |
| `roadmap-node-list-status-and-detail-actions` | 已选/未选状态、悬停、焦点、更新中禁用、失败回滚、笔记草稿、按钮焦点、生成中禁用与状态文字、笔记保存失败与恢复、资料链接、返回列表 | 11 组 |
| `roadmap-detail-loading-and-error` | 详情读取中、读取失败（错误文案）、恢复加载 | 3 组 |
| `roadmap-long-content-and-narrow-viewport` | 长标题/长描述、实操 Markdown 标题与代码、资料链接、900×860 窄屏详情与列表、420×860 外壳现状 | 4 组 |

每个截图点都会自动执行 浅色 → 深色 → 浅色 往返，并在切换后重新校验该点声明的「必须保留」元素；场景中还使用 `expectText` 在往返之后复验预览摘要与错误文案仍在，`expectChecked` 复验状态选中态与 `data-theme` 同步。

## 5. 命令结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npx vitest run --no-cache` | 通过（9 文件 / 41 测试） |
| `npm run build` | 通过（静态导出，`/` 与 `/_not-found`，需第 6 节的 `NEXT_PRIVATE_OUTPUT_TRACE_ROOT` 环境变量） |
| Playwright 场景（4 个） | 全部通过 |

## 6. 未完成 / 限制

1. **`npm run build` 在 worktree 中需要环境变量**：本 worktree 的 `frontend/node_modules` 是指向主检出的 junction，Turbopack 直接以 `Symlink [project]/node_modules is invalid, it points out of the filesystem root` 失败（与代码无关）。设置 `NEXT_PRIVATE_OUTPUT_TRACE_ROOT=G:/Github` 后 `npm run build` 稳定通过。请主代理决定：在主检出执行构建，或在 `next.config.ts` 中固定 `turbopack.root`，或把 worktree 的 `node_modules` 换成真实目录。
2. **窄屏（≤760px）外壳缺陷（非本任务代码）**：实测 420×860 时 `.app-shell` 变 `column`，`<aside>` 仍是 `h-screen`，`#workspace-scroll-container` 高度被压成 0 且位于 y=860，学习路线整块不可达（Playwright 报 aside 拦截点击/元素在视口外）。本任务的窄屏验收因此使用 900×860（低于 1100px 单列断点，可真实操作），并保留一张 420×860 截图 `roadmap-shell-420px-*` 记录现状。修复需要改 `app/styles.css` 与 `frontend/features/projects/ProjectRail.tsx`（任务 01 范围）。
3. **浏览器端未覆盖 Markdown 表格与引用**：`app/styles.css` 的 `.lesson-content table/blockquote` 规则未改且由主题变量驱动，表格/引用结构在 jsdom 长内容测试中验证；但替身 API 的节点详情只有标题、列表与代码块，无法在不改既有 handler/常量的前提下新增表格与引用内容，因此缺少这两种元素的浅/深截图。
4. **错误提示的浏览器断言用文案而非 `role=alert`**：Next.js 自带的 `#__next-route-announcer__` 是常驻的 `role="alert"`（1×1 视口元素，Playwright 视为可见），因此 `role=alert` 定位在浏览器里不具区分度；`network` 错误状态改用 `expectText "验收模拟的服务端错误"` + 截图取证（jsdom 另有 `alert` 断言，会随操作清除）。同理 `expectFocus` 无法断言裸输入框（无文案/`aria-label`），输入框焦点以截图取证。
5. **未在真实 FastAPI 与真实模型上运行**：浏览器数据全部来自 `stub_api.py` 虚构数据（规格允许在 API 客户端处模拟）。
6. **系统主题（`system`）跟随操作系统变化**仍未在真实系统切换中验证（与任务 01 相同的限制）。
7. `useNodeDetail.ts` 未改动；节点详情的状态更新失败只回滚、不在路线面板内显示错误横幅，这是迁移前既有语义，本任务按规格保留未改。
