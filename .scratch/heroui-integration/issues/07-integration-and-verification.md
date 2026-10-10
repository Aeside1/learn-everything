# 07: 完成 HeroUI 全局验收与样式清理

**What to build:** 学习者可以在完整工作台中持续使用浅色或深色模式，所有范围内的基础控件、浮层和内容都保持可读与可操作；维护者获得完整控件来源清单、原生元素例外、验证证据和后续页面开发约定。

**Blocked by:** 03 — 完成 HeroUI 路线创建与节点学习；04 — 完成 HeroUI 看板、复习与测验；05 — 完成 HeroUI 资料上传与 RAG 问答；06 — 完成 HeroUI 模型档案配置。01 和 02 已由这些任务的依赖传递覆盖。

**Status:** in-review — 集成、清理、文档与验收条目已完成；Standards 轴评审已完成并修复，Spec 轴评审进行中（最后一个勾选项保持未勾）。

依据规格《统一前端 HeroUI 基础控件与浅色/深色主题验收》。这是完成各模块迁移后的集成验收，不将已经确认的业务范围扩大为视觉重设计、白板实现或第二套设计系统。

- [x] 汇总并审查全范围基础控件来源，未登记的原生按钮、输入、选择、文本域、复选、Tabs、弹窗或加载实现完成迁移或给出明确且合理的例外；不能只根据 HeroUI import 或页面变暗判定完成。
  - 证据：合并后全量扫描 `frontend/{features,app,components,lib}`，`<button>`/`<select>`/`<textarea>`/`<dialog>`/`role="tab"`/`type=checkbox|radio`/`contentEditable` 均 0 命中；仅剩 `ResourceLibraryPanel.tsx:87` 的 `<input type=file>`（已登记例外）。控件来源表与例外登记见 `records/control-inventory.md`。
- [x] 删除已无调用方的基础控件手写皮肤和废弃规则，保留领域内容排版、页面布局和已登记例外；没有删除仍在使用的布局或业务状态样式。
  - 证据：共删除 114 条（104 条纯死 + 10 条混合），工具与规则判定写在 `records/control-inventory.md` 与 `tools/clean_dead_css.py`；删除后重审仅剩 `job-blocked`/`node-mastered`/`node-weak` 三个动态拼接名（已确认可达）；清理后 typecheck/89 测试/构建全通过。
- [x] 检查共享组合确实承担重复语义与行为，移除无用导出、占位封装和未使用的临时模块，不建立整库转发层或可切换组件库的抽象。
  - 证据：无转发层、无可切换组件库抽象（`package.json` 未动），共享组合仅 `components/ui/IconButton.tsx` 与 `SelectField.tsx`（均被多模块复用）。**未全部移除的导出已说明理由**：`lib/api.ts` 的 13 个类型与 `SelectField.tsx` 的 `SelectOption` 外部 0 引用但属 API 契约/共享组件入参类型，保留决定写在 `records/control-inventory.md`。
- [x] 逐项完成规格的主题矩阵：侧栏、弹窗、工作区、路线、详情、看板、复习、测验、资料、问答、配置都验证浅色、深色和往返切换。
  - 证据：`records/control-inventory.md` 验收矩阵逐行填写，01–07 共 33 个场景全部通过。
- [x] 真实浏览器验收覆盖默认、悬停、键盘焦点、禁用、加载、错误和已选等适用状态，以及窄屏、长文本、滚动；弹窗、选择器浮层和 Tooltip 与根主题一致。
  - 证据：各模块场景覆盖焦点/禁用/加载/错误/已选，长文本与 420×860 窄屏用 `wheelTo` 真实滚轮断言；浮层主题一致性由工具在浅/深下比对计算颜色（完全相同即失败）。**未逐点截图悬停态**（由 HeroUI 默认样式承担），已在 `records/07` 限制节写明。
- [x] 完整验证主题切换不丢失当前项目、标签、节点详情、笔记/配置/测验草稿、资料勾选、问答历史或运行中操作；刷新恢复主题偏好，不产生挂载后错误主题覆盖。
  - 证据：每个模块都有保留型场景（`theme-switch-retention-review-and-quiz`、`resources-rag-narrow-and-theme-retention`、`workspace-*`、01 的往返与重载断言）；`ThemeProvider` 在写 DOM 前先读存储，修掉了“挂载后回退到错误主题”的真实竞态。
- [x] 使用 API 客户端处的数据模拟及受控流事件完成可重复工作流测试，真实渲染 HeroUI；没有因引入库而仅测试 mock 控件，也不为每种主题复制无意义的行为测试。
  - 证据：jsdom 测试统一 `vi.mock("../lib/api")`，未 mock 任何 HeroUI 控件；SSE 用替身可控流（`/__control` 可注入错误与延迟）。
- [x] 按实际运行结果记录控件来源、保留原生元素理由、自动化命令结果、浏览器环境和主题验收证据；截图及日志使用虚构或已遮盖的配置数据，不把未执行的检查标为通过。
  - 证据：`records/01–07` + `evidence/**`；密钥扫描无 `sk-*`/Bearer 形态命中，配置项使用 `example.test` 域名与虚构档案名；未执行项在 `records/07` 第 7 节逐条列出（包含一次未复现的测试抖动与 `dom-swap` 截图的证明力边界）。
- [x] 更新前端开发与架构说明：基础控件直接用 HeroUI，主题变量集中配置，业务状态由所属模块持有，布局与业务内容允许 CSS，新增页面需要双主题验收；课堂白板保持独立业务模块且本次不引入白板引擎。
  - 证据：`frontend/README.md`（控件直用规则、共享组合边界、原生例外、主题令牌、双主题验收步骤、窄屏可达性断言与控制页、白板边界）与 `docs/ARCHITECTURE.md` 第 3.3 节。
- [x] 类型检查、完整前端测试和 Next.js 静态生产构建通过，确认导出产物包含本地主题样式，部署使用方式保持现有约定。
  - 证据：`npm run typecheck` 通过、`npx vitest run --no-cache` 89/89、`npm run build` 通过；产物 `out/_next/static/chunks/*.css` 中可检索到 `--project-1`、`--brand-soft`、`--accent`、`--forest`。
- [ ] 按 Standards 和 Spec 两个方向审查最终变更，修复阻断问题并记录仍存在的真实限制；所有前置任务的验收记录一致后才标记本任务完成。
