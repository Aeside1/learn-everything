# 01 验收记录：统一 HeroUI 主题与项目入口

状态：**完成**（代码、用户行为测试、类型检查、静态构建、浏览器双主题验收全部通过）

## 1. 改动清单

| 文件 | 改动 |
| --- | --- |
| `frontend/features/theme/theme.ts`（新增） | 主题单一来源：存储键、`Theme`/`ResolvedTheme`、`readStoredTheme`、`readAppliedTheme`、`resolveTheme`、`applyTheme`（同时写 `.dark` 类与 `data-theme`）、`themeInitScript` |
| `frontend/features/theme/ThemeProvider.tsx` | 复用同一状态驱动 HeroUI 与业务内容；首屏用布局副作用读取偏好，先读后应用，避免挂载后覆盖用户选择；`toggleThemeLabel` 提供下一步切换目标的可访问名称 |
| `frontend/app/layout.tsx` | 首屏内联脚本改为由 `themeInitScript()` 生成，避免主题闪烁 |
| `frontend/app/styles.css` | 业务配色改为 HeroUI 主题变量派生（`--ink/--paper/--panel/--line` 等映射到 `--foreground/--background/--surface/--border`），删除会覆盖 HeroUI 的 `--muted` 定义，新增深色下的品牌/危险/警示/代码块取值 |
| `frontend/app/page.tsx` | 外壳改用 `bg-background text-foreground` |
| `frontend/features/projects/ProjectRail.tsx` | HeroUI `Button`/`IconButton`/`Chip`/`Spinner`/`Alert`/`ProgressBar`；项目卡片按钮带显式 `aria-label`；移除全部手写皮肤 class |
| `frontend/features/projects/ProjectEditDialog.tsx` | `Modal` + `TextField`/`TextArea`/`NumberField`/`Label`/`Description`/`FieldError`；提交中禁止关闭（含 Escape 与遮罩） |
| `frontend/features/projects/ProjectDeletionDialog.tsx` | 同上，保留 `DELETE` 确认词校验与提交中禁用 |
| `frontend/components/ui/IconButton.tsx` | 带 Tooltip 的图标按钮共享组合（多模块复用） |
| `frontend/components/ui/SelectField.tsx` | 带 Label、长文本换行与键盘选择的选择器共享组合（03–06 复用） |
| `frontend/tests/browser/*`（新增） | 双主题浏览器验收工具：`stub_api.py`（静态产物 + `/api/v1` 虚构数据 + 可控 SSE/错误/延迟）、`verify_theme.py`（场景执行、浅→深→浅往返、浮层配色探针）、`scenarios/*.json` |
| `frontend/tests/setup.ts` | 补齐 jsdom 缺失的 `ResizeObserver`/`IntersectionObserver`/`matchMedia` |

## 2. 控件来源清单（本任务范围）

| 位置 | 基础控件 | 来源 | 说明 |
| --- | --- | --- | --- |
| 主题切换 | Button（图标）+ Tooltip | HeroUI + `IconButton` | 可访问名称随目标变化：`切换为深色主题` / `切换为浅色主题` |
| 侧栏刷新 | Button（图标）+ Tooltip | HeroUI + `IconButton` | |
| 侧栏新建 | Button `primary` + fullWidth | HeroUI | |
| 侧栏项目入口 | Button `ghost` | HeroUI | 显式 `aria-label`：`标题 主题 done/total 已完成` |
| 侧栏编辑/删除 | Button（图标） | HeroUI + `IconButton` | 删除用 `danger-soft` |
| 侧栏项目进度 | ProgressBar + Track + Fill | HeroUI | `role=progressbar`，带项目名 |
| 侧栏加载/错误/空 | Spinner / Alert / 空态容器 | HeroUI（空态为布局 DIV） | 错误态带 HeroUI `Button danger-soft` 重试 |
| 项目弹窗 | Modal.Backdrop/Container/Dialog/Header/Heading/Body/Footer/CloseTrigger | HeroUI | 遮罩 `variant="blur"`，标题走 `slot="title"` |
| 弹窗表单 | TextField/Input/TextArea/NumberField/Label/Description/FieldError | HeroUI | 必填、长度、1–168 小时范围校验保留 |
| 弹窗按钮 | Button `secondary`/`primary`/`danger` + Spinner | HeroUI | 提交中禁用并阻止 Escape/遮罩关闭 |
| 局部加载指示 | Spinner | HeroUI | 取代手写 `LoaderCircle` 旋转图标（业务面板仍保留 Lucide 图标，属图标而非控件） |

### 原生元素例外

| 元素 | 用途 | 理由 |
| --- | --- | --- |
| `<html>`/`<body>` | 文档根与主题类 | 平台元素，主题状态必须落在文档根 |
| `<form>`/`<main>`/`<aside>`/`<nav>`/`<section>`/`<article>` | 页面结构与地标 | 语义布局，不属于基础控件 |
| `<label>`（弹窗内 HeroUI `Label`） | 字段标签 | 用 HeroUI `Label`，非原生 |
| 内联主题初始化脚本 | 首屏防闪烁 | 必须在 JS 包加载前读取存储 |

本任务范围内不再有原生 `button`/`input`/`textarea`/`select`；后续模块的原生控件由任务 03–06 处理。

## 3. 主题与状态行为测试（jsdom，`npm run test`）

| 测试文件 | 覆盖 |
| --- | --- |
| `tests/theme-toggle.test.tsx` | 切换按钮驱动 `.dark` + `data-theme`；可访问名称更新；偏好持久化；重新加载按已保存主题呈现；存储不可用仍可切换；切换主题不重置当前项目与已选标签；弹窗打开时受控主题更新保留未提交草稿 |
| `tests/project-dialogs.test.tsx` | 编辑弹窗提交完整字段；删除弹窗 `DELETE` 校验；提交中取消/关闭/Escape 全部被阻止；关闭后焦点回到触发位置 |
| `tests/home-page.test.tsx` | 项目首次选择、侧栏切换、删除后回退（沿用既有行为，标签名按显式 `aria-label` 更新） |
| `tests/ui-shared.test.tsx` | 选择器浮层选中回传、禁用不可展开、图标按钮可访问名称与禁用 |

## 4. 浏览器双主题验收

工具：`frontend/tests/browser/verify_theme.py`（Python Playwright 1.58，本地 Chromium）+ `stub_api.py` 虚构数据（不含任何真实密钥）。
命令：

```powershell
cd frontend
npm run build
python tests/browser/verify_theme.py --scenarios tests/browser/scenarios/01-theme-and-projects.json --out ..\.scratch\heroui-integration\evidence\01
```

结果：5 个场景全部通过，25 组双主题截图，证据在 `.scratch/heroui-integration/evidence/01/`（`report.json` 含每一步状态、浮层配色探针、切换方式与控制台/请求失败记录）。

| 场景 | 覆盖 | 截图 |
| --- | --- | --- |
| `projects-workspace-and-dialogs` | 侧栏默认态、悬停、键盘焦点、项目长标题、弹窗、Escape 关闭、窄屏 420×860（含工作区可达性断言）、窄屏弹窗 | 8 组 |
| `project-edit-save` | 编辑草稿保留、保存后侧栏刷新、弹窗关闭 | 2 组 |
| `project-delete-confirmation` | 未输入确认词时禁用、输入 `DELETE` 后可用、删除成功后回退到剩余项目 | 3 组 |
| `workspace-loading-error-retry` | 读取中、服务端错误 + 重试、恢复 | 3 组 |
| `theme-preference-roundtrip` | 默认浅色、已保存深色偏好重载后立即生效、真实 HeroUI 控件切换、双向持久化重载 | 3 组 |

每次截图点都会自动执行 浅色 → 深色 → 浅色 往返，并在切换后重新校验该点声明的“必须保留”元素；浮层（`role=dialog/listbox/tooltip`）会记录并比较两种主题下的计算样式，颜色未变化即判定失败。

### 本轮浏览器验收发现并修复的真实缺陷

1. **主题挂载竞态**：`ThemeProvider` 原先在挂载副作用里先按初始 `light` 应用主题、再读取存储，重载时偶发把已保存的深色偏好覆盖回浅色（DOM 与 HeroUI 标签都会回退）。改为“布局副作用先读取偏好（存储 → 当前 DOM 状态兜底），读取完成后才应用”，并在 `theme.ts` 中提供 `readAppliedTheme`。
2. **可访问名称与浏览器不一致**：项目卡片按钮依赖子元素文本拼接，Chromium 会因块级子元素插入空格（`学习 Rust Rust 1/4 已完成`），与 jsdom 计算不同。改为显式 `aria-label`，测试与浏览器契约统一。
3. **`title` 属性不被 HeroUI `Button` 接受**：图标按钮改用 `aria-label` + Tooltip。
4. **窄屏（<760px）工作区不可达（预存缺陷）**：`@media (max-width:760px)` 已将外壳改为纵向排列，但侧栏仍是 `h-screen w-72`，把工作区挤到视口之外，而外壳 `overflow-hidden` 又没有滚动。修复：侧栏改为 `w-full` + `lg:h-screen lg:w-72`，项目列表窄屏上限 `max-h-[50vh]`，工作区滚容器去掉 `h-screen` 改为 `flex-1 min-h-0`。验收工具新增 `scrollTo` 与 `expectInViewport` 步骤，在 420×860 下真实断言工作区可滚动到视口内（旧写法只断言侧栏元素，因而漏报了这个缺陷）。

## 5. 命令结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run test` | 通过（7 文件 / 19 测试） |
| `npm run build` | 通过（静态导出，`/` 与 `/_not-found`） |
| Playwright 场景（5 个） | 全部通过 |

## 6. 未完成 / 限制

- 浏览器验收用的服务端数据由本地替身提供，未对接真实 FastAPI 与真实模型；规格允许以 API 客户端处的数据模拟进行验收。
- 系统主题（`system`）跟随操作系统变化的行为只做了实现与代码路径保留，未在真实操作系统切换中验证（jsdom 与浏览器均固定为浅色系统偏好）。
- 03–06 覆盖的业务面板本轮只验证到“工作区外壳 + 项目入口”，其内部控件由对应任务验收。
