# 05 验收记录：完成 HeroUI 资料上传与 RAG 问答

状态：**完成**（用户行为测试、类型检查、静态构建、浏览器双主题验收全部通过；`app/styles.css` 中已无调用方的控件规则以精确 diff 形式提交主代理执行，因该文件不在本任务所有权内）

依据规格《统一前端 HeroUI 基础控件与浅色/深色主题验收》。保持资料上传与问答的现有 REST、SSE 与数据契约，未修改 `lib/api.ts`、后端路由或 SSE 协议。

## 1. 改动清单

| 文件 | 改动 |
| --- | --- |
| `frontend/features/resources/ResourceLibraryPanel.tsx` | 知识点改为共享 `SelectField`；刷新/删除改为 `IconButton`（HeroUI `Button` + `Tooltip`）；上传改为 HeroUI `Button primary` + `Spinner`；删除确认输入改为 `TextField`/`Label`/`Input`，确认为 `Button danger`、取消为 `Button secondary`；读取中改用 `Spinner`，错误改用 `Alert`；文件选择保留原生 `<input type="file">`（登记例外，补可见标签、等高、焦点环、禁用态）；上传/删除期间禁用重复提交与知识点切换；移除全部手写控件皮肤 class（`resource-upload-form`、`resource-delete-confirm`、`resource-progress`、`resource-row`、`resource-list`、`resource-error`），布局改用 Tailwind 工具类与主题工具类 |
| `frontend/features/chat/RagChatPanel.tsx` | 知识点改为共享 `SelectField`；资料勾选改为 HeroUI `Checkbox`（`Checkbox.Content`/`Control`/`Indicator` 复合用法），长标题换行且可键盘访问；问题改为 `TextField`/`Label`/`TextArea`；提问/停止改为 HeroUI `Button`，重试上一问改为 `IconButton`；错误改用 `Alert` + `Button ghost` 重试；引用折叠由原生 `<details>` 迁移为 HeroUI `Disclosure`（可展开、可键盘访问、浮层/内容随主题变化）；移除 `rag-scope`、`rag-source-list`、`rag-composer`、`rag-error` 手写皮肤，保留 `rag-transcript`/`rag-message`/`rag-empty` 业务排版 |
| `frontend/tests/resources-rag-chat.test.tsx`（新增） | 17 个用户行为测试（API 客户端处模拟 REST/SSE，真实渲染 HeroUI） |
| `frontend/tests/fixtures.ts` | 仅在文件末尾追加 `secondWorkspaceNode`、`indexedResource`、`indexedResourceLong`、`failedResource`；未修改既有导出 |
| `frontend/tests/browser/scenarios/05-resources-and-rag-chat.json`（新增） | 4 个双主题浏览器场景（详见第 4 节） |
| `.scratch/heroui-integration/evidence/05/`（新增） | 44 张浅色/深色截图 + `report.json` + `summary.md` |

`lib/api.ts`、`frontend/app/**`、`frontend/components/ui/**`、`frontend/tests/setup.ts`、`package.json`、`tests/browser/verify_theme.py`、`tests/browser/stub_api.py` 均未改动。`stub_api.py` 无需新增端点：上传进度、RAG 增量回答、删除预览/删除、失败注入（`setApiError`）与延迟注入（`setApiDelay`）已由既有处理器覆盖；同一路径若追加同 pattern 的新路由会被既有处理器先匹配，因此按“不修改既有处理器/常量”的约束未添加。

## 2. 控件来源清单（本任务范围）

| 位置 | 基础控件 | 来源 | 说明 |
| --- | --- | --- | --- |
| 资料库知识点选择 | `Select` + `Label` + `Select.Trigger/Value/Indicator` + `Popover` + `ListBox` | HeroUI，经共享 `SelectField` | 长知识点标题在浮层内换行；禁用态不可展开；选中值随节点保持 |
| 资料库刷新 | `Button`（图标）+ `Tooltip` | HeroUI，经共享 `IconButton` | `aria-label="刷新资料"`；读取中或上传/删除中禁用 |
| 资料库上传 | `Button primary` + `Spinner` | HeroUI | 上传中显示 `Spinner` 并禁用重复提交 |
| 资料库本地文件 | 原生 `<input type="file">` + `<label htmlFor>` | **原生例外**（见第 3 节） | 标签、焦点环、禁用态与相邻控件等高 |
| 资料库读取中 | `Spinner` | HeroUI | `aria-label="正在读取资料"` |
| 资料库错误 | `Alert` / `Alert.Indicator` / `Alert.Content` / `Alert.Description` | HeroUI | 保留原错误文字（`ApiError.message`）与重试能力 |
| 资料库索引进度 | 布局容器 + 主题工具类 `bg-brand-soft`/`text-brand-ink`/`border-l-accent` | 业务排版 | 逐条累积 SSE 进度文案，取消按钮；不再使用 `.resource-progress` 皮肤 |
| 资料列表行 | `article` 布局容器 + 主题工具类 | 业务排版 | 状态用左边框（`border-l-accent`/`border-l-danger`/`border-l-warning`）区分，长标题截断并保留完整 `title` |
| 删除确认输入 | `TextField` + `Label`（`sr-only`）+ `Input` | HeroUI | 仅精确匹配后端确认词才可提交 |
| 确认删除 / 取消 | `Button danger` / `Button secondary` + `Spinner` | HeroUI | 提交中两者与输入框同时禁用，禁止重复确认或取消 |
| RAG 知识点选择 | `SelectField`（同上） | HeroUI | 问答进行中禁用 |
| RAG 资料勾选 | `Checkbox` / `Checkbox.Content` / `Checkbox.Control` / `Checkbox.Indicator` | HeroUI | 复合用法：Control 位于 Content 内（输入框由 `Checkbox.Content` 渲染），长标题换行，键盘 Space 可切换 |
| RAG 范围读取中 | `Spinner` | HeroUI | `aria-label="正在读取资料"` |
| RAG 范围提示/空态 | 文案 + 布局容器 | 业务排版 | 「请先在资料库上传并完成索引。」 |
| RAG 会话记录 | `article` / `p` + 主题工具类 | 业务排版 | 增量文本与「正在检索资料...」占位保持原样 |
| RAG 引用展开 | `Disclosure` / `Heading` / `Trigger` / `Indicator` / `Content` / `Body` | HeroUI | 取代原生 `<details>`/`<summary>`；触发器为 `role=button` + `aria-expanded`，可点击与键盘操作 |
| RAG 错误 | `Alert` + `Button ghost`（重试） | HeroUI | 保留后端错误文字与重试上一问 |
| RAG 问题 | `TextField` + `Label` + `TextArea` | HeroUI | 可访问名称为「问题」，问答进行中禁用 |
| RAG 提问 / 停止 | `Button primary` / `Button secondary` | HeroUI | 停止调用现有 `AbortController.abort()` |
| RAG 重试上一问题 | `Button`（图标）+ `Tooltip` | HeroUI，经共享 `IconButton` | 沿用 `latestQuestion`，问答进行中不显示 |

## 3. 原生元素例外

| 元素 | 用途 | 理由与补偿措施 |
| --- | --- | --- |
| `<input type="file">`（资料库「本地文件」） | 选择本地文件并提交给现有 `streamResourceUpload` | 文件选择依赖浏览器原生语义：操作系统文件对话框、`accept` 过滤、浏览器安全策略禁止脚本设置 `value`、无法用 HeroUI 控件等价表达。补偿：显式 `<label htmlFor>` 可见标签（浏览器可访问名即「本地文件」，标签关联已由自动化 `setFiles` 验证）；`h-10` 与相邻 HeroUI 选择器/按钮等高；`border-border`/`bg-field`/`text-foreground` 与 HeroUI 输入框同源配色；`focus-visible:focus-ring`（HeroUI 官方焦点环工具类）提供与按钮一致的键盘焦点；`disabled:status-disabled` 复现 HeroUI 禁用态；上传中选择器、文件输入与上传按钮同时禁用；`file:` 伪元素使用品牌柔色 `bg-brand-soft`/`text-brand-ink`，无逐元素 `dark:` 覆盖。证据：`resources-native-file-input-focus-{light,dark}.png`（浅色/深色焦点环）、`resources-upload-in-flight-{light,dark}.png`（上传中禁用）。 |
| `<section>` / `<article>` / `<div>` / `<strong>` / `<p>` / `<span>` | 面板结构、消息气泡与业务排版 | 语义布局与文本内容，不是基础控件；配色走主题工具类 |
| `<main>` / `<header>` / `<aside>` / `<nav>` / `<h3>` | 页面与面板地标 | 语义结构，任务 01/02 已登记 |

本任务范围内不再有原生 `button`、`input`（除文件输入）、`textarea`、`select`、手写复选或原生 `<details>`。

## 4. 用户行为测试（jsdom）

`frontend/tests/resources-rag-chat.test.tsx`，17 个测试，全部在 `vi.mock("../lib/api", …)` 的 API 客户端处模拟上传与问答事件（含可控 SSE 事件、成功/失败/中断），真实渲染 HeroUI 控件。

| 用例 | 覆盖 |
| --- | --- |
| 选择文件后上传，逐步显示索引进度并刷新资料列表 | `accept` 保留；上传入参 `(nodeId, file, onEvent)`；进度文案累积；上传中上传按钮/文件输入/知识点选择同时禁用且重复点击不重复调用；完成后清空文件输入并重新读取列表 |
| 上传失败显示明确错误并允许重试 | `ApiError(500)` 文案展示，按钮恢复可用，可再次提交 |
| 未选择文件时给出提示且不发起上传 | 「请选择一个知识点和资料文件」 |
| 删除只在精确匹配后端确认词后可提交，失败保留输入与错误 | 确认词 `删除 701`：错误值禁用、精确值启用；失败保留输入与错误并恢复可重试 |
| 删除提交中禁止重复确认或取消 | 确认/取消/输入框同时禁用，重复点击不重复提交，成功后关闭确认并刷新 |
| 删除准备失败时显示错误且不进入确认 | `getResourceDeletionPreview` 失败路径 |
| 默认勾选同集合的已索引资料，并只把已选资料作为提问范围 | 集合规则（首个 completed 资料的 `collection_id`）；失败资料不出现；取消勾选后 `file_ids=["source-1"]`、`history=[]`、`conversation_id` 为字符串 |
| 流式回答逐步呈现并附带引用 | 增量文本先部分后完整；引用标题与摘录；`Disclosure` 触发器 `aria-expanded` 由 false → true |
| 未选中任何资料时提问给出反馈且不发起请求 | 「请选择至少一份已完成索引的资料后再提问」；草稿保留；未调用 `streamRagChat` |
| 没有可问答资料时禁用提问并提示先上传 | 提问按钮禁用 + 「请先在资料库上传并完成索引。」 |
| 范围读取失败时给出明确提示 | `ApiError(503)` 文案 |
| 停止中断当前请求并保留已到达的回答 | `AbortController` 触发 `AbortError`，不显示连接中断错误，已到达文本保留 |
| 重试沿用上次问题且不改写问题草稿 | 第二次调用 message 与 history 正确，草稿仍为空（首次提问后已清空） |
| 问答进行中禁用知识点、资料勾选与问题输入 | 三处禁用 + 停止可用 |
| 问答事件返回错误时显示后端错误文字 | SSE `kind=error` 文案 |
| 切换主题保留待上传文件、资料勾选与问题草稿 | 深色切换后文件仍在、勾选不变、草稿不变；切回浅色仍保留 |
| 回答进行中切换主题不重启请求也不中断流式输出 | 切换后信号未 abort，增量继续拼接，引用仍在，`streamRagChat` 只调用一次 |

## 5. 浏览器双主题验收

命令（工作树 `frontend/`）：

```powershell
npx next build --webpack
& "C:\Users\32494\.pyenv\pyenv-win\versions\3.11.9\python.exe" tests\browser\verify_theme.py --scenarios tests\browser\scenarios\05-resources-and-rag-chat.json --out ..\.scratch\heroui-integration\evidence\05 --port 8133
```

结果：**4 个场景全部通过，22 组双主题截图（44 张 PNG），控制台错误 0**。证据目录 `.scratch/heroui-integration/evidence/05/`（`report.json` 含每步状态、浮层配色探针、切换方式、失败请求记录）。

| 场景 | 覆盖 | 截图 |
| --- | --- | --- |
| `resources-select-upload-and-delete` | 资料库默认态与长资料名、原生文件输入键盘焦点、知识点切换、选择器浮层（含超长选项）、上传进行中（含主题切换）、第二次上传的索引进度、删除确认不可提交/可提交、确认后关闭并刷新 | 9 组 |
| `rag-scope-ask-stream-and-citation` | 资料勾选默认态、长标题复选框键盘焦点、键盘 Space 取消勾选、提问范围、回答进行中（含主题切换）、流式回答、引用标题与展开 | 5 组 |
| `rag-stop-and-retry` | 停止中断请求、错误/重试入口、重试沿用上次问题并得到完整回答 | 2 组 |
| `resources-rag-narrow-and-theme-retention` | 900×900 窄主区下的资料库与问答布局、长标题勾选换行、键盘焦点、主题切换保留知识点/勾选/草稿、窄屏流式回答、420×860 应用外壳 | 6 组 |

每个截图点仍执行 浅色 → 深色 → 浅色 往返，并在切换后复验该点声明的「必须保留」元素。选择器浮层截图点的切换方式为 `dom-swap`（HeroUI `Select` 浮层以 `role=dialog` 呈现，`set_theme` 走受控主题路径），因此浮层在两种主题下都保持打开并被探针记录（`report.json` 中该点 overlays `light=2 / dark=2`，颜色随主题变化）；其余截图点均由真实 HeroUI 主题按钮完成切换（`real-button`）。

失败请求说明：`report.json` 的 `failedRequests` 仅包含 SSE POST 的 `net::ERR_ABORTED`。其中停止场景为预期的主动中断；其余为 Chromium 在 SSE 结束帧之后结束读取时的正常标记（每条完成的 SSE 各记一条，与场景数一致的 2/1/2/1 分布吻合），无 REST 失败、无控制台错误。

### 本轮验收发现并修复的真实问题

1. **复选框点击命中**：HeroUI 的 `Checkbox` 输入是 1×1 视觉隐藏元素且被 `Checkbox.Control` 覆盖，指针点击被判为「被遮挡」。场景改用 `focus` + `Space` 切换，顺带成为键盘可访问性证据（`rag-checkbox-keyboard-focus`、`narrow-long-title-checkbox-focus`）。
2. **截图点切换主题会移动焦点**：`set_theme` 的真实按钮路径点击侧栏主题按钮，焦点随之离开控件。场景在焦点截图之后重新 `focus` 再按 `Space`。
3. **文案选择器误命中隐藏面板**：学习路线面板 `shouldForceMount`，其隐藏标题会被 `get_by_text` 首选命中。断言改用仅出现在回答中的完整句子。
4. **选择器浮层与主题切换的顺序**：浮层打开时主题按钮被模态遮罩拦截（点击 4s 超时），必须走受控主题路径；因此浮层截图放在与该点断言一致的位置，且随后以 `reload`（而非 Escape）确定性关闭浮层，避免浮层残留遮挡后续点击。

## 6. 命令结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npx vitest run --no-cache` | 通过（9 文件 / 45 测试，其中本任务 17 个） |
| `npm run build` | **失败**（Turbopack：`Symlink [project]/node_modules is invalid, it points out of the filesystem root`）。`frontend/node_modules` 在本工作树是指向主检出的 junction，Turbopack 拒绝解析工作树外的软链接。已在**改动前**的干净树上用 `git stash` 复现同样失败，确认与本任务代码无关。 |
| `npx next build --webpack` | 通过（静态导出，路由 `/` 与 `/_not-found`） |
| 浏览器场景（4 个） | 全部通过，22 组双主题截图 |

## 7. 未完成 / 限制

- **`frontend/app/styles.css` 的死规则删除未执行**：该文件不在本任务所有权内，本任务只移除了对它们的调用。第 8 节给出精确 diff，需主代理执行。
- **420×860 窄屏只能验证应用外壳**：`.app-shell` 在 ≤760px 变为纵向，而项目侧栏固定 `h-screen`，主区被推到视口外且 `html/body { overflow: hidden }` 无法滚动（420×860 截图只显示侧栏）。该布局自 HeroUI 迁移前的提交 `8b4dd32` 即存在，非本任务引入，但会影响真实用户与后续窄屏验收，第 8 节给出修复建议。
- **1280×900 下主区高于视口**：同样受 `html/body overflow:hidden` + `.app-shell overflow:hidden` 影响，用户无法滚动到「资料问答」底部；Playwright 可通过程序化 `scrollIntoViewIfNeeded` 完成断言，因此本任务场景仍能跑通，但这是既有外壳问题（`frontend/app/page.tsx` + `app/styles.css`），未在本任务修复。
- 浏览器验收使用本地替身服务（`stub_api.py` 虚构数据），未对接真实 FastAPI 与真实模型；删除成功后替身不实际移除资料，因此「删除后列表刷新」只验证了前端重新读取行为。
- 「范围读取中」与「上传/删除失败」只在 jsdom 覆盖（浏览器场景通过 `setApiDelay` 覆盖了上传进行中，通过停止覆盖了问答中断）；未在浏览器注入上传/删除失败（`setApiError` 已具备能力，本轮未纳入场景）。
- 主题切换对「正在进行的上传」的验证方式为：上传请求进行中由截图点完成浅→深→浅往返，并断言上传按钮/文件输入仍处于禁用态、随后上传成功完成；未逐帧核对 SSE 进度文案的深色对比度（截图可见）。

## 8. 共享文件改动请求（不在本任务所有权内，需主代理执行）

### 8.1 `frontend/app/styles.css`：删除已无调用方的控件皮肤规则

本任务已确认以下 class 在整仓（`app`、`components`、`features`、`lib`、`tests`）内不再有调用方，可整段删除：

```diff
-.resource-library-panel { display: grid; gap: 14px; margin-top: 30px; padding-top: 24px; border-top: 2px solid var(--ink); }   ← 保留（布局面板，仍在使用）
-.resource-upload-form { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(220px, 1fr) auto; gap: 10px; align-items: end; }
-.resource-upload-form label { display: grid; gap: 6px; color: var(--ink-soft); font-size: 12px; font-weight: 800; }
-.resource-upload-form input, .resource-upload-form select, .resource-delete-confirm input { width: 100%; padding: 9px; color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 3px; font: inherit; }
-.resource-upload-form .command-button { margin: 0; }
-.resource-progress { display: grid; gap: 5px; padding: 13px; color: var(--brand-soft-ink); background: var(--brand-soft); border-left: 4px solid var(--forest); font-size: 13px; }
-.resource-list { display: grid; gap: 8px; }
-.resource-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 13px; background: var(--panel); border: 1px solid var(--line); border-left: 4px solid var(--amber); }
-.resource-row.completed { border-left-color: var(--forest); }.resource-row.failed { border-left-color: var(--coral); }
-.resource-row > div:first-child { display: grid; gap: 4px; }.resource-row strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.resource-row span, .resource-row p { margin: 0; color: var(--ink-soft); font-size: 12px; }.resource-row p { color: var(--alert-ink); }
-.icon-button.danger { color: var(--alert-ink); background: var(--alert-soft); }.icon-button.danger:hover { background: color-mix(in oklab, var(--coral) 30%, var(--surface)); }
-.resource-delete-confirm { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px solid var(--line); }.resource-delete-confirm span { grid-column: 1 / -1; color: var(--alert-ink); }
-.resource-error { display: flex; align-items: center; gap: 8px; padding: 11px 13px; color: var(--alert-ink); background: var(--alert-soft); border-left: 4px solid var(--coral); font-size: 13px; }
-.rag-scope { display: grid; ... }.rag-scope > label, .rag-source-list { ... }.rag-scope select, .rag-composer textarea { ... }.rag-source-list { ... }.rag-source-list > span { ... }.rag-source-list label { ... }.rag-source-list small { ... }
-.rag-error { display: flex; align-items: center; gap: 8px; padding: 11px 13px; color: var(--alert-ink); background: var(--alert-soft); border-left: 4px solid var(--coral); font-size: 13px; }
-.rag-composer { display: grid; gap: 9px; }.rag-composer textarea { min-height: 92px; resize: vertical; }.rag-composer > div { display: flex; align-items: center; justify-content: end; gap: 8px; }.rag-composer .icon-button { width: 36px; height: 36px; }
-.rag-message details { padding-top: 7px; color: var(--ink-soft); font-size: 12px; }.rag-message summary { color: var(--brand-ink); cursor: pointer; font-weight: 800; }
```

保留（仍被本任务或其他模块使用）：`.resource-library-panel`、`.rag-chat-panel`、`.rag-transcript`、`.rag-empty`、`.rag-message`、`.rag-message.user/strong/p`、`.section-heading`、`.eyebrow`、`.spin`（其余模块仍用）、`.icon-button`（`.icon-button` 本体在整仓已无调用方，但 `.danger-button`/`.command-button`/`.secondary-button`/`.icon-command`/`.text-action` 目前同样无调用方——这些属于其他面板任务，请在其完成后一起删除）。

### 8.2 窄屏与高内容外壳修复建议（`frontend/app/page.tsx` / `frontend/app/styles.css`）

现状：`html`/`body` 为 `height: 100%; overflow: hidden`，`.app-shell` 为 `h-screen overflow-hidden`，主区没有自己的滚动容器；`.app-shell` 在 `max-width: 760px` 改为 `flex-direction: column`，但项目侧栏为 `h-screen`。

```diff
/* frontend/app/styles.css */
-@media (max-width: 760px) { .app-shell { flex-direction: column; } ... }
+@media (max-width: 760px) {
+  .app-shell { flex-direction: column; }
+  .app-shell > aside { height: auto; max-height: 45vh; flex-shrink: 0; }
+}
```

并在主区启用自身滚动（二者取其一，推荐第 1 种）：

```diff
/* frontend/app/page.tsx：让工作台主区成为滚动容器 */
-        <Workspace ... />
+        <Workspace ... />   /* Workspace.tsx 的 <main> 追加 "flex-1 overflow-y-auto" */
```

```diff
/* 或最小改动：给主区容器加滚动 */
-      <div className="app-shell flex h-screen w-full overflow-hidden bg-background text-foreground">
+      <div className="app-shell flex h-screen w-full overflow-hidden bg-background text-foreground [&>*:last-child]:min-h-0 [&>*:last-child]:overflow-y-auto">
```

（`Workspace.tsx` 属于任务 02 所有权；`app/**` 属于主代理。二者任一改动即可让 1280×900 下的资料问答与 ≤760px 窄屏内容可达。）

## 9. 与规格完成标准的对应

| 完成标准 | 状态 |
| --- | --- |
| 1 全局主题切换入口 | 由任务 01 完成，本任务复用 |
| 2 每种基础控件有明确 HeroUI 来源，原生元素登记理由 | 见第 2、3 节 |
| 3 各模块浅色/深色/往返验收，浮层与当前主题一致 | 第 5 节，选择器浮层两种主题均记录探针 |
| 4 默认/悬停/聚焦/禁用/加载/错误/选中状态可辨 | 截图覆盖焦点、禁用、上传中、错误态；悬停由 HeroUI 默认样式承担（未逐点截图） |
| 5 主题切换不重置项目、标签、笔记草稿、表单输入、问答记录或中断进行中操作 | 本任务 jsdom + 浏览器场景覆盖资料/问答侧；其他模块由各自任务覆盖 |
| 6 无为基础控件保留的重复手写皮肤或废弃控件规则 | 本任务文件内已清零；`app/styles.css` 死规则删除见第 8.1 节（待主代理执行） |
| 7 用户行为测试、类型检查、静态构建与真实浏览器验收通过，附控件来源与双主题证据 | 第 4、5、6 节 |
