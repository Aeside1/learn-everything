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
| 路线创建 | 输入、文本域、数字输入、操作按钮 | 待迁移（当前为原生 input/textarea/button + 手写皮肤） | ⏳ 03 |
| 路线列表与节点详情 | 节点入口、状态按钮、笔记与生成操作 | 待迁移（部分 HeroUI 标签 + 手写皮肤） | ⏳ 03 |
| 学习看板 | 刷新、导出、指标、热力图 | 待迁移 | ⏳ 04 |
| 到期复习 | 刷新、查看答案、四档评分 | 待迁移（部分 HeroUI 标签 + 手写皮肤） | ⏳ 04 |
| 查漏测验 | Select、Input、TextArea、选项、提交 | 待迁移（原生 select + 手写皮肤） | ⏳ 04 |
| 资料库 | Select、上传、刷新、删除确认 | 待迁移（原生 select/input + 手写皮肤） | ⏳ 05 |
| RAG 问答 | Select、Checkbox、TextArea、操作按钮 | 待迁移（原生 select/checkbox + 手写皮肤） | ⏳ 05 |
| 模型配置 | Select、Input、密码输入、操作按钮 | 待迁移（原生 select + 手写皮肤） | ⏳ 06 |

## 原生元素例外登记

| 元素 | 位置 | 用途 | 理由 | 验证 |
| --- | --- | --- | --- | --- |
| `<html>` / `<body>` | `app/layout.tsx` | 主题类与文档底色 | 平台元素，主题状态必须落在文档根 | 01 |
| 内联初始化脚本 | `app/layout.tsx` | 首屏防主题闪烁 | 必须在 JS 包执行前读取存储 | 01 |
| `<form>`/`<main>`/`<aside>`/`<nav>`/`<section>`/`<article>`/`<header>` | 各处 | 语义结构与地标 | 布局语义，不是基础控件 | 01/02 |
| `<input type="file">` | 资料库 | 选择本地文件 | 浏览器原生文件语义，不具备可替换的 HeroUI 等价控件；要求与周围控件保持布局/焦点/主题一致 | 05（待验证） |
| 计数与统计文本 | 工作区、看板 | 业务内容排版 | 非交互内容 | 01/02 |

## 尚未迁移（不得视为完成）

- 12 个业务面板中原生 `select`/`textarea`/`checkbox`/手写按钮皮肤：见上表 ⏳ 03–06。
- `app/styles.css` 中仍保留尚未迁移调用方的控件皮肤规则；只有确认无调用方后才删除（07）。

## 接入与主题验收矩阵（逐模块填写实际结果）

| 模块 | 基础控件与内容 | 必须覆盖的主题与交互场景 | 验证结果 |
| --- | --- | --- | --- |
| 全局主题与应用外壳 | HeroUI 切换按钮（图标 + Tooltip） | 浅→深→浅、刷新恢复偏好、切换不丢项目与输入 | ✅ 01：jsdom 5 项 + 浏览器 `theme-preference-roundtrip` 3 组截图；重载后立即为深色且标签一致 |
| 项目侧栏 | 选择、刷新、新建、编辑、删除、进度、加载、错误 | 当前/普通/空列表/加载/错误/焦点、长标题、窄屏 | ✅ 01：`projects-workspace-and-dialogs` 7 组 + `project-delete-confirmation` 3 组 |
| 项目弹窗 | Modal、TextField、TextArea、NumberField、Button | 打开后切主题、遮罩与正文、校验、提交中禁用与关闭限制、确认词 | ✅ 01：`project-edit-dialog`/`narrow-edit-dialog`/`delete-dialog-*` + jsdom 焦点返回与 Escape 阻止 |
| 工作区 | Tabs、ProgressBar、Spinner、Card、Error+Retry | 鼠标与键盘切换、选中态、焦点、进度、零节点、加载/错误、详情保留、窄屏 | ✅ 02：3 场景 12 组截图 + jsdom 关联与键盘断言 |
| 路线创建 | 见任务 03 记录 | 预览、调整、保存、准备任务、失败重试与禁用态 | ⏳ 03 |
| 路线列表与节点详情 | 见任务 03 记录 | 已选/禁用、Markdown、代码、表格、参考链接、错误反馈 | ⏳ 03 |
| 学习看板 | 见任务 04 记录 | 加载、错误、数据文本、热力图文字说明 | ⏳ 04 |
| 到期复习 | 见任务 04 记录 | 正反面内容、评分、空队列、错误 | ⏳ 04 |
| 查漏测验 | 见任务 04 记录 | 选择器浮层与长选项、已选答案、提交禁用、正确/错误反馈 | ⏳ 04 |
| 资料库 | 见任务 05 记录 | 文件输入例外、索引进度、失败、确认删除、浮层 | ⏳ 05 |
| RAG 问答 | 见任务 05 记录 | 资料勾选、流式回答、引用、停止、重试、禁用态 | ⏳ 05 |
| 模型配置 | 见任务 06 记录 | 档案选择浮层、密码输入、保存、连接测试、就绪状态、错误 | ⏳ 06 |
