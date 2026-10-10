# 控件来源清单与原生元素例外

本清单按任务推进逐模块更新。每行必须能回答两个问题：这个控件来自哪里（HeroUI / 共享组合 / 原生例外），以及在浅色与深色下是否验证过。
**只勾选实际完成的验证。** 逐任务的详细证据见 `records/*.md` 与 `evidence/*/report.json`。

## 主题与共享基础

| 能力 | 实现来源 | 文件 | 双主题验证 |
| --- | --- | --- | --- |
| 主题状态与持久化 | 项目主题模块（非 HeroUI useTheme，避免双份存储） | `features/theme/theme.ts`、`features/theme/ThemeProvider.tsx` | 01（jsdom + 浏览器往返） |
| DOM 主题同步 | `.dark` 类 + `data-theme` 双写，覆盖 HeroUI portal | `applyTheme` | 01 |
| 品牌色集中配置 | HeroUI 设计令牌 `--accent`/`--focus` 指向品牌色 | `app/styles.css` `:root` | 01/02 |
| 业务色 Tailwind 工具类 | `@theme inline` 注册（brand-soft、ink、panel…） | `app/styles.css` | 01/02 |
| 图标按钮 + Tooltip | 共享组合 | `components/ui/IconButton.tsx` | 01 |
| 带标签选择器 | 共享组合 | `components/ui/SelectField.tsx` | 01（单测），03–06（业务） |

## 模块清单

| 模块 | 基础控件 | 来源 | 状态 |
| --- | --- | --- | --- |
| 全局主题与应用外壳 | 主题切换按钮、页面底色与文字 | HeroUI + 主题变量 | ✅ 01 |
| 项目侧栏 | 选择、刷新、新建、编辑、删除、进度、加载、错误 | HeroUI（Button/IconButton/Chip/Spinner/Alert/ProgressBar） | ✅ 01 |
| 项目弹窗 | Modal、Input、TextArea、NumberField、Button | HeroUI | ✅ 01 |
| 工作区 | Tabs、ProgressBar、Spinner、Card、Button | HeroUI | ✅ 02 |
| 路线创建 | 输入、文本域、数字输入、操作按钮 | HeroUI（TextField/TextArea/NumberField/FieldError/Button/Spinner） | ✅ 03 |
| 路线列表与节点详情 | 节点入口、状态按钮、笔记与生成操作 | HeroUI（Button ghost / ToggleButtonGroup / TextArea / Spinner） | ✅ 03 |
| 学习看板 | 刷新、导出、指标、热力图 | HeroUI（Card/Alert/Spinner/Button）+ 业务排版与 CSS 热力图 | ✅ 04 |
| 到期复习 | 刷新、查看答案、四档评分 | HeroUI（Card/Alert/Spinner/Button） | ✅ 04 |
| 查漏测验 | Select、Input、TextArea、选项、提交 | HeroUI（Select/ListBox/TextField/TextArea/Button/Alert） | ✅ 04 |
| 资料库 | Select、上传、刷新、删除确认 | HeroUI（TextField/Label/Input/Button/Spinner/Alert）+ 原生文件输入（已登记） | ✅ 05 |
| RAG 问答 | Select、Checkbox、TextArea、操作按钮 | HeroUI（Checkbox/TextField/TextArea/Disclosure/Button/Spinner） | ✅ 05 |
| 模型配置 | Select、Input、密码输入、操作按钮 | HeroUI（SelectField/TextField/Input/Button/Spinner/IconButton/Alert/Chip） | ✅ 06 |

## 原生元素例外登记

| 元素 | 位置 | 用途 | 理由 | 验证 |
| --- | --- | --- | --- | --- |
| `<html>` / `<body>` | `app/layout.tsx` | 主题类与文档底色 | 平台元素，主题状态必须落在文档根 | 01 |
| 内联初始化脚本 | `app/layout.tsx` | 首屏防主题闪烁 | 必须在 JS 包执行前读取存储 | 01 |
| `<form>`/`<main>`/`<aside>`/`<nav>`/`<section>`/`<article>`/`<header>` | 各处 | 语义结构与地标 | 布局语义，不是基础控件 | 01/02 |
| `<input type="file">` | 资料库 | 选择本地文件 | 浏览器原生文件语义，不具备可替换的 HeroUI 等价控件；要求与周围控件保持布局/焦点/主题一致 | ✅ 05（含焦点态截图） |
| 计数与统计文本 | 工作区、看板 | 业务内容排版 | 非交互内容 | 01/02 |
| HeroUI `Button` 上的布局性覆写 | `features/roadmap/RoadmapPanel.tsx:18`（`nodeEntryClassName`） | 整行卡片作为点击区 | 基础 `.button` 是胶囊形且带内边距（`@heroui/styles/dist/components/button.css:4` 的 `rounded-3xl px-4`），ghost 的悬停底色是 `var(--default)`（同文件 :115），必须用 `rounded-none` 与 `hover:bg-transparent` 中和；悬停反馈由外层 `.node-row` 卡片提供。仅允许这类形状/底色中和 + 布局类，不得手写完整控件皮肤 | 03/集成 |
| 项目卡片装饰色令牌 | `app/styles.css` `--project-1..5` | 每个项目一条装饰色带 | 装饰色只在样式表里定义一次并区分浅/深取值，组件里不再出现调色板类与 `dark:` 覆写；原 `from-emerald-400 …` 五组调色板类已删除 | 01/01 复验 |

## 迁移完成状态

12 个业务面板与全局外壳、项目弹窗、工作区已全部迁移到 HeroUI 控件（03/04/05/06 细节见各自 `records/*.md`）。

合并后全量复扫结果（大小写敏感，仅 `frontend/{features,app,components,lib}` 源码）：`<button>`/`<select>`/`<textarea>`/`<dialog>`/`role="tab"`/`type="checkbox"`/`type="radio"`/`contentEditable` 均 0 命中；仅剩资料库的文件选择 `<input>`（已登记例外）。详见 `records/07-integration-and-verification.md` 第 3 节。

`app/styles.css` 中已无调用方的基础控件皮肤已删除（114 条，见下文“死样式审计与执行结果”），清理后重扫仅剩三个动态拼接类名。

## 死样式审计与执行结果（07 已执行，输入为审计 agent 产出 + 主 agent 复核）

执行结果：用 `.scratch/heroui-integration/tools/clean_dead_css.py` 删除 104 条纯死规则，再人工删除 10 条混合规则（父选择器仍活、只有自身类名死），共 **114 条**；`git diff` 为 90 行删除、2 行合并（把同一条剩余活规则上提）。

删除后重新审计：**生产代码（`frontend/features|app|components|lib` 的 `.tsx`/`.ts`）中再无调用方的类只剩三个动态拼接名**：`job-blocked`（`RoadmapCreation.tsx:192` `` `content-job job-${status}` ``，后端 `learning_ext/application/jobs.py` 确实会置 `blocked`）、`node-mastered`/`node-weak`（`RoadmapPanel.tsx:46` `` `node-row node-${status}` ``）。它们必须保留。

易错点记录：审计若把测试/场景名、`data-testid`、记录文本一起当作调用方，会把已死类误判为活（例如 `rag-scope`、`quiz-form` 只在场景名里出现）；因此判定必须以生产源码为准，并对模板字符串按片段核查。`sr-only` 保留：它在 `ResourceLibraryPanel.tsx:127` 仍被使用（Tailwind 也有同名工具类，删掉也不影响，无必要冒险）。

审计方法：抽取全部 `className` token 集合与 CSS 类名求差，再对差集逐个做子串/动态拼接复查（模板字符串如 `` node-${status} `` 必须按片段查）。下表已由主 agent 抽检复核。

**确认无调用方，可直接删除**

| 类名 | 归属任务 | 复核证据 |
| --- | --- | --- |
| `sr-only` | 01 | **保留**：`ResourceLibraryPanel.tsx:127` 在用（Tailwind v4 也内置同名工具类，删掉无害但不必要），且它不属于“手写控件皮肤” |
| `icon-button` / `.icon-button.danger` | 01 | `components/ui/IconButton.tsx` 已用 HeroUI `Button`；`danger` 只作 `variant` 取值 |
| `text-action` | 01 | 0 命中 |
| `environment-note`（含 760px 断点内 3 条） | 01/03 | 0 命中 |
| `secondary-button`（含 `:disabled` 组合） | 01/03 | 0 命中，已由 `Button variant="secondary"` 取代 |
| `command-button`（含 `.resource-upload-form`/`.model-config-actions` 后代选择器、`:disabled` 组合） | 01/06 | 0 命中 |
| `danger-button`（含 `:hover`/`:disabled`） | 01 | 0 命中，已由 `Button variant="danger"` 取代 |
| `model-config-form` / `model-config-state` / `.model-config-state .ready` / `.missing` / `model-config-actions` / `model-config-message` / `.model-config-message.inline` / `.error` / `model-config-hint` / `model-profile-controls` / `icon-command` | 06 | 0 命中 |
| `node-open-button`（含 1100px/760px 断点内规则） | 03 | 0 命中，已被 `nodeEntryClassName` 的 Tailwind 类取代 |
| `detail-note` | 03 | 0 命中（场景 JSON 中仅是截图名，非类名） |
| `status-button` | 03 | 0 命中，已换成 HeroUI `ToggleButtonGroup` |
| `roadmap-form` / `refine-row` / `hour-input` | 03 | 0 命中，已被 `roadmap-create-form` / `roadmap-refine` 取代 |

**动态拼接，必须保留**：`node-mastered`/`node-weak`（`RoadmapPanel.tsx:46` `` `node-row node-${node.status}` ``）、`resource-row.completed`/`.failed`（`ResourceLibraryPanel.tsx:67`）、`job-blocked`（`RoadmapCreation.tsx:192`）、`quiz-option.active`（`QuizPanel.tsx:44`）、`rag-message.user`（`RagChatPanel.tsx:66`）、全部 `.status-control` 规则（`NodeStatusControl.tsx:22` 挂在 HeroUI `ToggleButtonGroup` 上）。

**待确认**：`command-layout` 被 `RagChatPanel`/`QuizPanel`/`ResourceLibraryPanel` 使用但 CSS 中无定义（可能是漏定义的空类，交由 04/05 处理）；`lib/api.ts` 中 13 个类型导出（`Progress`、`RoadmapNode`、`QuizQuestion`、`RagStreamEvent`…）仅文件内部使用、外部 0 引用，属 API 契约类型，倾向于保留并在 07 说明理由。

**保留决定（集成复核）**：`components/ui/SelectField.tsx:5` 的 `SelectOption` 保留导出。它是共享选择器的入参类型，调用方需要用它标注自己的 `options` 数组；经检索 04/05 工作区当前均未使用（0 命中），但删掉导出只会得到收益极小的内部收紧，不值得在并行开发期间制造冲突面。

## 接入与主题验收矩阵（逐模块填写实际结果）

| 模块 | 基础控件与内容 | 必须覆盖的主题与交互场景 | 验证结果 |
| --- | --- | --- | --- |
| 全局主题与应用外壳 | HeroUI 切换按钮（图标 + Tooltip） | 浅→深→浅、刷新恢复偏好、切换不丢项目与输入、Tooltip 跟随主题 | ✅ 01：jsdom 5 项 + 浏览器 `theme-preference-roundtrip` 3 组 + `tooltip-theme-consistency` 悬停双主题一组（`rail-tooltip-theme-*`）；重载后立即为深色且标签一致 |
| 项目侧栏 | 选择、刷新、新建、编辑、删除、进度、加载、错误 | 当前/普通/空列表/加载/错误/焦点、长标题、窄屏 | ✅ 01：`projects-workspace-and-dialogs` 8 组 + `project-delete-confirmation` 3 组 + `rail-empty-and-error-states` 2 组（空列表/读取失败）+ `layout-breakpoint-768/900` 行布局回归护栏 |
| 项目弹窗 | Modal、TextField、TextArea、NumberField、Button | 打开后切主题、遮罩与正文、校验、提交中禁用与关闭限制、确认词 | ✅ 01：`project-edit-dialog`/`narrow-edit-dialog`/`delete-dialog-*` + jsdom 焦点返回与 Escape 阻止 |
| 工作区 | Tabs、ProgressBar、Spinner、Card、Error+Retry | 鼠标与键盘切换、选中态、焦点、进度、零节点、加载/错误、详情保留、窄屏 | ✅ 02：3 场景 12 组截图 + jsdom 关联与键盘断言 |
| 路线创建 | Button/Spinner、TextField+Label+Input、TextArea+FieldError、NumberField+Group+Increment/DecrementButton | 预览、调整、保存、准备任务、失败重试与禁用态 | ✅ 03：4 场景 26 组双主题（含 900px 窄屏与 420px 外壳） |
| 路线列表与节点详情 | Button ghost 整行入口、ToggleButtonGroup 四态、TextArea+Button 笔记与动作 | 已选/禁用、Markdown 标题/列表/代码、参考链接、错误反馈 | ✅ 03：同上；❕ Markdown 表格与引用由 ✅ 07 补：`evidence/07/lesson-table-quote-code{,-narrow,-420}-{light,dark}.png` |
| 学习看板 | Card/Alert/Spinner/Button、业务排版与热力图 | 加载、错误、数据文本、热力图文字说明、导出、420×860 窄屏 | ✅ 04：3 场景 9 组双主题（含 `dashboard-420`） |
| 到期复习 | Card/Alert/Spinner/Button、正反面业务排版 | 正反面内容、评分、空队列、错误 | ✅ 04：2 场景 7 组双主题（`review-*`） |
| 查漏测验 | Select/ListBox 浮层、TextField+Label、TextArea、Button、Alert | 选择器浮层与长选项、已选答案、提交禁用、正确/错误反馈 | ✅ 04：2 场景 12 组双主题（`quiz-*`） |
| 资料库 | TextField+Label、Input type=file（已登记例外）、Button+Spinner、Alert、删除确认 | 文件输入例外、索引进度、失败、确认删除、浮层 | ✅ 05：1 场景 9 组双主题（`resources-*`） |
| RAG 问答 | Checkbox、TextField+TextArea、Disclosure 引用、Button+Spinner | 资料勾选、流式回答、引用、停止、重试、禁用态 | ✅ 05：3 场景 13 组双主题（`rag-*`） |
| 模型配置 | SelectField、TextField+Label+Input、Button+Spinner、IconButton+Tooltip | 档案选择浮层、密码输入、保存、连接测试、就绪状态、错误、780 与 420 窄屏 | ✅ 06：5 场景 15 组双主题（含 `model-config-420`） |
| 业务内容主题（集成级） | 不转成控件：`.lesson-content` 下标题/列表/表格/引用/代码/链接 | 表格与引用跟随主题、超长代码行横向滚动不撑破布局、420px 下正文可读且笔记可操作 | ✅ 07：2 场景 4 组双主题（`evidence/07/`） |

汇总：**01–07 共 35 个场景、276 张截图，全部 `passed`**（另一个 `evidence/06-regression-780/` 是刻意保留的失败快照，`controls-wheel-reachability/` 是断言自检的一通过一失败）。其中 **9 张由 `dom-swap` 生成**（弹窗/浮层打开时无法用真实控件切主题）、**5 张声明 `probeOverlays=false`**（浅色下恰好悬停到浮层，不能当浮层证据）；两者都在 `report.json` 与 `summary.md` 里集中列出。
