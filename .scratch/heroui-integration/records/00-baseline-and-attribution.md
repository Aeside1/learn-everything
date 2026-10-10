# 00 基线、快照与改动归属

日期：2026-10-10（本机工作区）
起点提交：`9184c28 docs: 合并前端架构文档并移除双轨描述`（分支 `main`）

## 1. 工作区快照

实施前工作区包含前一 session 留下的未提交改动。快照保存在 `.scratch/heroui-integration/snapshot/`：

| 文件 | 内容 |
| --- | --- |
| `snapshot/tracked-changes.patch` | `git diff` 的完整补丁（12 个已跟踪文件） |
| `snapshot/untracked/frontend/components/ui/IconButton.tsx` | 新增共享组合组件原件 |
| `snapshot/untracked/frontend/components/ui/SelectField.tsx` | 新增共享组合组件原件 |
| `snapshot/stash.txt` | `git stash create` 记录的提交对象（额外恢复手段） |

恢复方式：`git apply .scratch/heroui-integration/snapshot/tracked-changes.patch`，再把 `snapshot/untracked/` 下的两个文件复制回 `frontend/components/ui/`。没有执行整仓回退，也没有覆盖其他未提交工作。

## 2. 未提交改动归属审阅

前一 session 的改动全部属于本 spec 范围，归属如下（无无关改动）：

| 文件 | 归属任务 | 审阅结论 |
| --- | --- | --- |
| `features/projects/ProjectRail.tsx` | 01 | 标签已换成 `Button`，但仍带手写皮肤 class 与非法 `title` 属性；主体逻辑可保留，渲染需重写 |
| `features/workspace/Workspace.tsx` | 02 | 已换成 `Tabs` 复合组件，但 `Progress` 包装被削掉 color/size 参数、`Tabs.Panel` 强制挂载写法未验证；需重做 |
| `features/roadmap/RoadmapCreation.tsx` | 03 | 表单控件换成 HeroUI，但 `label` 仍手写、按钮带手写 class；需重做 |
| `features/roadmap/RoadmapPanel.tsx` | 03 | 节点入口换成 `Button`，但沿用 `.node-open-button` 手写皮肤；需重做 |
| `features/roadmap/NodeDetailPanel.tsx` | 03 | 文本域/按钮换成 HeroUI，保留手写 class；需重做 |
| `features/roadmap/NodeStatusControl.tsx` | 03 | 状态按钮换成 `Button` + 手写 `.status-button`；需重做 |
| `features/dashboard/DashboardPanel.tsx` | 04 | 刷新与导出入口换成 `Button`，业务内容仍为手写 CSS；需重做 |
| `features/review/ReviewPanel.tsx` | 04 | 评分按钮换成 `Button` + 手写 `.review-actions button` 皮肤；需重做 |
| `features/quiz/QuizPanel.tsx` | 04 | 仅数量输入与部分按钮替换，`select` 仍为原生；需重做 |
| `features/resources/ResourceLibraryPanel.tsx` | 05 | 刷新/上传/删除换成 `Button`，知识点选择仍为原生 `select`；需重做 |
| `features/chat/RagChatPanel.tsx` | 05 | 输入与操作按钮换成 HeroUI，资料勾选仍为原生 `checkbox`；需重做 |
| `features/configuration/ModelConfigurationPanel.tsx` | 06 | 输入换成 HeroUI `Input`，档案选择仍为原生 `select`；需重做 |
| `components/ui/IconButton.tsx` | 01（共享） | 保留：带 Tooltip 的图标按钮在多个模块重复出现 |
| `components/ui/SelectField.tsx` | 01（共享） | 保留：带 Label 与长文本截断的选择器在多个模块重复出现 |

这些改动不构成任何任务的完成结果。它们作为起点保留在分支上，由对应任务重写并验证。

## 3. 基线问题与修复

修复前基线（含上述未提交改动）：

| 检查 | 结果 | 原因 |
| --- | --- | --- |
| `npm run typecheck` | 失败（7 处） | HeroUI `Button` 不接受 `title` 属性（react-aria `ButtonProps` 只允许 `GlobalDOMAttributes`），临时改动在 4 个文件里传了 `title` |
| `npm run test` | 失败（3/9） | jsdom 缺少 `ResizeObserver`，HeroUI `ScrollShadow` 抛 `ReferenceError` |
| `npm run build` | 未运行 | 已被 typecheck 阻塞 |

修复（公共测试配置与最小可编译修正，均由主 agent 完成）：

1. `tests/setup.ts` 补齐 jsdom 缺失的 `ResizeObserver`、`IntersectionObserver`、`matchMedia` 兜底实现。这是 HeroUI（React Aria）在 jsdom 下渲染的最小公共依赖。
2. 把 4 个文件里 HeroUI `Button` 上的 `title` 换成 `aria-label`（图标按钮保留可访问名称；有可见文字的按钮直接去掉冗余 `title`）。

修复后基线（`main`）：`npm run typecheck` 通过，`npm run test` 9/9 通过，`npm run build` 通过。

## 4. 尚不构成完成的部分

- 修复后的控件只是“能编译、能渲染”，没有完成规格要求的控件来源审查、手写皮肤清理和双主题验证。
- 12 个业务模块中仍有大量原生 `select`/`textarea`/`checkbox`/手写按钮皮肤，等待任务 03–06 处理。
- `app/styles.css` 仍以硬编码浅色值为主，未接入主题变量；任务 01 统一处理。
