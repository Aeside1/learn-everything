# 任务 07：集成、全局控件审查与最终验收

本记录由主 agent 编写，覆盖集成过程、跨模块回归的发现与修复、全局控件复查、死样式清理、内容主题证据补齐、以及最终验收命令与证据位置。

## 1. 集成过程

四个实现分支都基于 `973b084`（含任务 01+02），按顺序合并进 main：

| 顺序 | 分支 | 提交 | 合并提交 | 冲突 |
| --- | --- | --- | --- | --- |
| 1 | `feat/heroui-03` | `1e63063` | `74ab926` | 无 |
| 2 | `feat/heroui-06` | `ad75790` | `d6b60a8` | `frontend/tests/fixtures.ts` |
| 3 | `feat/heroui-04` | `174b380` | `9ef9b14` | `frontend/tests/fixtures.ts` |
| 4 | `feat/heroui-05` | `26789a7` | `1e269da` | `frontend/tests/fixtures.ts` |

`fixtures.ts` 每轮都冲突，原因是四个分支都在文件尾部追加自己的 fixture 并各自改动了顶部 import。处理方式是一律取并集：合并 import 类型列表（重复项去重），两侧新增的 fixture 全部保留（合并后 21 个导出）。第二次合并 05 时曾漏删一个 `<<<<<<< HEAD` 标记，随后全仓 `git grep` 扫描发现并 `--amend` 修正，当前的标记扫描为零命中。

## 2. 集成期间发现并修复的回归

### 2.1 我自己的窄屏修复引入 761–1023px 布局回归

任务 01 的窄屏修复把侧栏改成默认 `w-full`，但外壳只在 ≤760px 才转为纵向，因此 761–1023px 之间侧栏（`w-full`）会盖住工作区。现象是任务 06 的 780px 场景点击超时，日志为 `aside aria-label="项目列表" … intercepts pointer events`。失败快照保存在 `evidence/06-regression-780/report.json`。

修复（提交 `3d4ff73`）：外壳与侧栏统一到同一个 760px 断点 —— 外壳用 `max-[760px]:flex-col`，侧栏用 `h-screen w-72` + `max-[760px]:h-auto max-[760px]:w-full`，项目列表在窄屏 `max-h-[50vh]`。修复后 06 的 5 个场景全通过。

### 2.2 验收断言原本是空的

窄屏断言最初用 `scrollTo` + `expectInViewport`，实测在修复前的布局下也会"通过"：`scroll_into_view_if_needed` 能对 `overflow: hidden` 容器做程序化滚动，所以断言不能证明用户可达。

修复：新增 `wheelTo` 步骤——把鼠标移到视口内多个高度（60%/30%/85%），用真实滚轮以 120px 步进滚动直到目标进入视口，否则失败。并用一对控制页自证判别力：`tests/browser/controls/wheel-reachable.html`（可滚动）**通过**、`wheel-unreachable.html`（`overflow: hidden`）**失败**，证据在 `evidence/controls-wheel-reachability/`。README 已写明"改了可达性断言就必须重跑这对控制"。

### 2.3 弹窗深色截图并不能证明用户可在弹窗内切主题

Standards 评审指出弹窗打开时主题控件在遮罩后面，工具改用受控 DOM 切换。现在每张截图在 `report.json` 里记录 `switchMode`（`real-button` / `dom-swap` / `user-path`），`summary.md` 末尾集中列出 dom-swap 截图并注明其证明力边界。任务 01 场景补齐了真实用户路径的弹窗双主题证据：先开弹窗 → `screenshotHere`（本步不切换主题）；关闭 → 用真实控件切到深色 → 重开弹窗 → `screenshotHere`。

## 3. 全局控件复查

合并后对 `frontend/{features,app,components,lib}` 全量扫描原生交互元素，结果：

| 元素 | 命中 | 说明 |
| --- | --- | --- |
| `<button>` / `<select>` / `<textarea>` / `<dialog>` / `role="tab"` / `type="checkbox"` / `type="radio"` / `contentEditable` | 0 | 已全部由 HeroUI 承担 |
| `<input>` | 1 | `features/resources/ResourceLibraryPanel.tsx:87` 的文件选择输入，已在例外登记表登记（需要原生 `FileList` 与 `ref`） |

## 4. 死样式清理

工具：`.scratch/heroui-integration/tools/clean_dead_css.py`（按大括号深度切分规则，只删除"选择器里的类名全部无调用方"的规则，混合规则单独报出交人工判断）。

- 删除 104 条纯死规则 + 10 条混合规则，共 114 条；`git diff` 为 90 行删除、2 行合并。
- 删除后重新审计：生产代码中无调用方的类只剩 `job-blocked`、`node-mastered`、`node-weak` 三个动态拼接名，均确认可达（分别来自 `` `content-job job-${status}` `` 与 `` `node-row node-${status}` ``，`blocked` 是后端 `learning_ext/application/jobs.py` 的真实状态）。
- 审计方法要点（避免假阳性）：判定必须以生产源码为准；只看完整类名会把 `rag-scope`、`quiz-form` 这类"只出现在场景名/测试名里"的已死类误判为活；模板字符串必须按片段核查。
- 清理后 `npm run typecheck`、89 项测试、`npm run build` 全部通过。

## 5. 内容主题证据补齐（关闭任务 03 的缺口）

任务 03 的浏览器证据只覆盖标题/列表/代码/链接，Markdown 表格与引用仅有 jsdom 结构验证，因为验收替身的节点详情处理器不提供表格与引用内容。

补齐方式：`tests/browser/stub_api.py` 的节点 104 详情改为包含引用块、两列以上表格、以及一行超长 `async fn` 代码；新增场景 `tests/browser/scenarios/07-content-theming.json`，在浅/深两色下断言并截图表格文字（`调度策略`、`单线程执行器`）、引用文字与代码文字，并覆盖 900px 与 420×860（420px 用 `wheelTo` 验证笔记框可达）。

证据：`evidence/07/lesson-table-quote-code-{light,dark}.png`、`lesson-table-narrow-*`、`lesson-table-420-*`、`detail-regular-content-*`；2 个场景 4 组双主题截图全部 `passed`。人工查看浅/深两张确认：引用块走 `--brand-soft`、表头走 `--brand-soft` 且文字为 `--brand-ink`、长代码行在深色下同样横向裁切可滚动、面板未被撑破。

## 6. 验收命令与结果（集成后全量）

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npx vitest run --no-cache` | 通过（12 文件 / 89 测试）；见第 7 节的抖动说明 |
| `npm run build` | 通过（静态导出 `○`） |
| 浏览器双主题（01–07 场景文件） | 35 个场景全部通过（01–07 证据目录共 276 张截图） |

各模块证据数量：01 = 54 张（含 2 张单主题用户路径）、02 = 26、03 = 52、04 = 62、05 = 44、06 = 30、07 = 8。

## 7. 诚实的限制与未做项

1. **测试抖动（已观测一次，未复现）**：合并 04/05 后首次全量测试出现 `1 failed | 88 passed`，其后连续 4 次均为 89/89。当时未保存失败输出，因此**无法给出失败测试名**，这是流程失误；如实记录，不当作"通过"。
2. **`dom-swap` 截图**：01 的 5 张、04 的 1 张、05 的 1 张、06 的 2 张是在弹窗/浮层打开时用受控 DOM 切换主题生成的，只能证明浮层随主题变色，不能证明用户可在弹窗内切换主题；真实用户路径证据见第 2.3 节。
3. **悬停态**：没有逐点截图悬停样式，由 HeroUI 默认样式承担（各任务记录已注明）。
4. **未接真实后端/模型**：浏览器验收使用本地替身 API（仅在 API 客户端缝隙处模拟，符合规范），未验证真实 LLM、向量库、真实密钥校验失败的响应差异；SSE 用替身可控流验证。
5. **`system` 主题跟随操作系统**：仅按 `prefers-color-scheme` 逻辑实现与单元测试覆盖，未在真实系统主题切换下取证。
6. **任务 06 的 RAG 分区浏览器缺口**：替身 RAG 分区无活动档案，`verify_theme.py` 的定位器只取同名控件第一个匹配，因此 RAG 分区的服务地址说明、`向量模型` 标签与密码输入由 jsdom 测试覆盖（任务 06 记录第 2 节已说明）。
7. **`next.config.ts` 未加 `turbopack.root`**：worktree 内 `npm run build` 因 junction 的 `node_modules` 指向仓库根之外而报 Turbopack 符号链接错误（可用 `NEXT_PRIVATE_OUTPUT_TRACE_ROOT` 或 `--webpack` 绕过）。这是并行 worktree 的环境限制，主检出 `npm run build` 正常，因此不在仓库里写死本机路径。
8. **`lib/api.ts` 的 13 个类型导出与 `SelectOption`**：外部无引用但属 API 契约/共享组件入参类型，决定保留并在 `control-inventory.md` 说明理由。
9. **死样式清理范围**：只清理了 `app/styles.css`。`features/markdown/MarkdownContent.tsx` 与 `.lesson-content` 的业务排版样式按规范保留（业务内容不强行转成基础控件）。

## 8. 双轴评审后的修复（第二轮）

Spec 轴评审（只读 subagent）发现的问题与处理：

| 发现 | 类型 | 处理 |
| --- | --- | --- |
| 弹窗关闭后焦点返回用例不稳定（隔离重跑约 1/3 失败，也解释了集成阶段那次“不可复现”的抖动） | 真缺陷（测试时序） | `tests/project-dialogs.test.tsx` 改为 `waitFor` 等待焦点恢复（仍断言同一属性）；修复后全量 6 次 + 隔离 5 次共 11 次均通过 |
| Tooltip 只有浅色探针，且工具在“深色探针为空”时静默通过 | 真缺陷（证据可信度） | 工具改为探针数量不一致即失败；新增 `screenshotPair` 步骤（分步移动鼠标 + 轮询等待浮层，浅/深两次都重新悬停，中间用真实控件切主题）；新增场景 `tooltip-theme-consistency`（`evidence/01/rail-tooltip-theme-{light,dark}.png`） |
| 三张截图只在浅色下拓到浮层（`after-dialog-close`、`band-768-row-layout`、`dashboard-error`） | 记录不实风险 | 显式声明 `probeOverlays=false`，并在 `summary.md`/`report.json` 集中列出，不得引用为浮层证据 |
| 项目侧栏空列表与错误态无证据（issue 01 却已勾选） | 记录不足 | 替身新增 `empty_projects` 控制；新增场景 `rail-empty-and-error-states`（2 组双主题截图），并在 issue 01 里加注 |
| 04/06 缺 420×860 证据 | 记录不足 | 为 `dashboard-metrics-heatmap-report` 与 `model-configuration-narrow-and-long-name` 补 420×860 + `wheelTo`/`expectInViewport` 步骤（新截图 `dashboard-420`、`model-config-420`） |
| “长代码行横向滚动”无断言，仅目测 | 记录不实 | 新增 `expectScrollable` 步骤（断言 `scrollWidth - clientWidth > 2`），用在 07 场景的 `.lesson-content pre` 上 |
| `.rag-message details/summary` 是死规则（元素选择器，类名审计看不见） | 真缺陷（残留死样式） | 确认 `<details>/<summary>` 已被 HeroUI `Disclosure` 取代（全仓 0 命中）后删除 |
| `control-inventory.md` 内部矛盾（模块表仍写“待迁移”、文件输入“待验证”、与矩阵全 ✅ 冲突；`sr-only` 前后不一致） | 记录不足 | 已修正为迁移完成状态 + 实测数字 |

## 9. 环境层发现（影响可重复性，非产品缺陷）

1. **G: 盘间歇性写入失败**：多次出现 `OSError: [Errno 22] Invalid argument`，包括写 PNG 与写 `verify_theme.py` 源文件；同目录连续写 25 次 200KB 文件无法复现。因此验收工具对截图写出加了 3 次重试（仍失败则显式报错），并保留本节记录。
2. **两个残留 python 进程**（早前批次的验收进程未退出）与新一轮写入同一批 PNG，导致一次失败；清理后正常。并行跑验收前必须确认上一批已结束。
3. **修工具时自己引入的三个缺陷（已自查修复）**：`capture` 新增参数没同步进函数签名（TypeError）、参数名遮蔽了同名的 `probe_overlays()` 函数（bool not callable）、把“原子 reset”写成 dict 重排序后项目列表顺序变化导致默认项目变成项目 2、连带 768/900 断点场景失败。后者已回退为保序 reset，并用防御式 `_project()` 消除并发读空窗口。
