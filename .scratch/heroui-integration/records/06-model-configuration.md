# 06 验收记录：完成 HeroUI 模型档案配置

状态：**完成**（代码、用户行为测试、类型检查、静态构建、浏览器双主题验收全部通过）

唯一遗留：`frontend/app/styles.css` 中本任务已无调用方的手写控件皮肤删除（`frontend/app/**` 属主代理所有，本代理无写权限），已在第 7 节给出可直接应用的精确 diff。

## 1. 改动清单

| 文件 | 改动 |
| --- | --- |
| `frontend/features/configuration/ModelConfigurationPanel.tsx` | 整体重写：档案选择器改用共享 `SelectField`；名称/服务地址/模型名/API Key 改用 `TextField`+`Label`+`Input`(+`Description`)；新建/保存/测试连接用 HeroUI `Button`，删除用共享 `IconButton`（`danger-soft`）；就绪状态改用 `Chip`；面板级成功/错误改用 `Alert`/主题工具类；加载改用 `Spinner`；移除全部手写控件皮肤 class（`model-profile-controls`、`model-config-form`、`model-config-state`、`model-config-actions`、`model-config-hint`、`model-config-message`、`command-layout`），布局改用 Tailwind 工具类；新增进行中互斥标记与 `inFlight` 引用守卫（防重复提交）；连接测试按 `result.ok` 区分成功/失败反馈 |
| `frontend/tests/model-configuration.test.tsx`（新增） | 11 个用户行为测试，全部在 `vi.mock("../lib/api", …)` 处模拟后端，真实渲染 HeroUI |
| `frontend/tests/fixtures.ts` | 追加导出 `modelConfiguration`（虚构配置：LLM 一个已配置档案 + 一个长名称档案，RAG 空档案） |
| `frontend/tests/browser/scenarios/06-model-configuration.json`（新增） | 5 个双主题场景，28 张截图（14 组浅/深） |
| `.scratch/heroui-integration/records/06-model-configuration.md` | 本记录 |

未改动（按约定）：`frontend/lib/api.ts`、`frontend/tests/browser/stub_api.py`（现有 `/api/v1/model-configuration*` 路由已足够，未新增 `@route`）、`frontend/tests/browser/verify_theme.py`、`frontend/tests/setup.ts`、`frontend/app/**`、`frontend/components/ui/**`。配置请求契约（`getModelConfiguration`/`createModelProfile`/`saveModelProfile`/`activateModelProfile`/`deleteModelProfile`/`testModelProfile`）与删除流程（无新增确认协议）保持不变。

## 2. 控件来源清单（本任务范围）

| 位置 | 基础控件 | 来源 | 说明 |
| --- | --- | --- | --- |
| 活动档案选择器 | `Select` / `Label` / `Select.Trigger` / `Select.Value` / `Select.Indicator` / `Select.Popover` / `ListBox` / `ListBox.Item` | HeroUI（共享组合 `components/ui/SelectField.tsx`） | 长档案名称在浮层内换行（`whitespace-normal wrap-anywhere`），键盘可选；空档案时禁用并显示占位「暂无档案」 |
| 新档案名称 / 档案名称 / 对话模型 / 向量模型 / 服务地址 | `TextField` + `Label` + `Input` | HeroUI | 每个字段有显式标签；`Input` 提供 placeholder |
| 服务地址辅助说明 | `Description` | HeroUI | RAG 保留原文案「请填写基础地址（例如 https://api.example.com/v1），不要包含 /embeddings。」，经 `aria-describedby` 关联 |
| API Key | `TextField` + `Label` + `Input type="password" autoComplete="off"` + `Description` | HeroUI | 保持密码输入；保存后由 `applyStatus` 以服务端响应重置草稿（`api_key: ""`），不回显；辅助说明「密钥只保存在本地配置中，保存后不会再次显示。」 |
| 新建 / 测试连接 / 保存配置 | `Button`（`secondary` / `primary`）+ `Spinner` | HeroUI | 进行中在对应按钮内显示 `Spinner`，并禁用全部冲突操作 |
| 删除当前档案 | `Button`（图标） | HeroUI + 共享 `IconButton` | `variant="danger-soft"`，可访问名称「删除当前档案」+ Tooltip |
| 已就绪 / 未配置 | `Chip`（`success`/`warning` + `soft`） | HeroUI | 文案仍为「LLM 配置 已就绪」「RAG 向量模型配置 未配置」，状态不依赖颜色 |
| 密钥缺失提示 | 文本 + 主题工具类 `text-muted` | 业务排版 | 「还没有可用密钥，填写 API Key 后才能测试连接。」解释测试按钮为何禁用 |
| 读取中 | `Spinner` + `aria-busy` 容器 | HeroUI | 文案「正在读取配置状态」 |
| 面板级失败/成功 | `Alert`（`danger`，`role="alert"`）/ `role="status"` 文本块 | HeroUI + 主题工具类 | 失败保留原错误文案；成功用 `bg-brand-soft text-brand-ink` |
| 连接测试结果 | `role="status"` 文本块 + 图标 | 业务排版 + `bg-alert-soft/text-alert-ink`、`bg-brand-soft/text-brand-ink` | 成功/失败均有明确文字（含 HTTP 失败与 `ok:false` 两种） |

### 原生元素例外

| 元素 | 用途 | 理由 |
| --- | --- | --- |
| `<section>`（`aria-label="LLM 配置"` / `"RAG 向量模型配置"`） | 两类档案的区域地标与测试作用域 | 语义布局，不属于基础控件 |
| `<h3>`/`<h4>`/`<p>`/`<span>` | 标题、描述、就绪状态与结果文本 | 排版内容，不是交互控件 |
| 无原生 `button`/`input`/`select`/`textarea` | — | 本任务范围内已无原生基础控件 |

## 3. 用户行为测试（`frontend/tests/model-configuration.test.tsx`，11 个）

| 测试 | 覆盖 |
| --- | --- |
| 读取中显示忙碌提示，读取完成后分别显示已就绪与未配置 | 延迟读取 → `aria-busy` + 文案；完成后两类 `Chip` 文案；RAG 空档案提示与选择器禁用 |
| 读取失败时给出错误提示且不渲染配置表单 | `ApiError` → `role="alert"` + 原文案，表单不渲染 |
| 选择活动档案触发既有激活操作，浮层支持长档案名称 | 浮层选项（长名称）→ `activateModelProfile("llm","llm-backup")`；响应刷新表单与状态 |
| 新建档案使用输入的名称并进入未配置状态 | 空名称时「新建」禁用；`createModelProfile("llm","备考 LLM")`；未配置 Chip + 无密钥提示 + 测试按钮禁用 |
| 保存配置提交当前草稿，密钥使用密码输入且保存后不回显 | `type="password"` + `autocomplete=off`；`saveModelProfile` 收到完整草稿含密钥；保存后密码框为空、DOM 中不含密钥 |
| RAG 向量模型配置保留服务地址辅助说明与就绪状态 | RAG 活动档案场景：`向量模型` 标签、`/embeddings` 辅助说明、密钥提示、密码输入 |
| 连接测试使用当前草稿，成功与失败都有明确的文字反馈 | 草稿传给 `testModelProfile`；`ok:true`、`ok:false`、抛 `ApiError` 三种反馈 |
| 删除当前档案调用既有删除接口并使用危险样式按钮 | 可访问名称「删除当前档案」；`deleteModelProfile("llm","llm-default")`；删除后表单收起、状态回到未配置 |
| 操作进行中禁用可能冲突的操作并阻止重复提交 | 连续两次 `fireEvent.click` 只产生 1 次请求；保存/测试/删除/选择器/新建/输入框全部禁用（两类面板）；完成后恢复 |
| 主题切换保留两类草稿、活动档案与连接测试结果 | 深色切换后档案名称、新档案名称、就绪状态、连接测试结果与当前档案保持；`getModelConfiguration` 只调用一次 |
| 主题切换不中断进行中的保存请求 | 保存进行中切深色 → 请求完成、成功文案出现、主题仍为深色、请求只发一次 |

## 4. 浏览器双主题验收

```powershell
cd frontend
npx next build --webpack
& "C:\Users\32494\.pyenv\pyenv-win\versions\3.11.9\python.exe" tests\browser\verify_theme.py --scenarios tests\browser\scenarios\06-model-configuration.json --out ..\.scratch\heroui-integration\evidence\06 --port 8134
```

结果：**5 个场景全部通过，14 组共 28 张浅/深截图**，控制台错误 0、失败请求 0。证据：`.scratch/heroui-integration/evidence/06/`（`report.json`、`summary.md`、PNG）。

| 场景 | 覆盖 | 截图 |
| --- | --- | --- |
| `model-configuration-profiles-and-fields` | 就绪/未配置与空档案提示、完整表单、选择器浮层长档案名称、切换档案后未配置 + 无密钥提示 + 测试按钮禁用，末尾恢复默认档案 | 3 组 |
| `model-configuration-password-and-save` | 密码输入（掩码）+ 键盘焦点、保存成功文案、保存后密码框为空、按钮键盘焦点 | 3 组 |
| `model-configuration-connection-test-feedback` | 失败文案「连接失败：请检查服务地址与密钥。」与成功文案「连接成功，模型可用。」 | 2 组 |
| `model-configuration-busy-create-delete` | 8s 延迟下测试进行中 保存/删除/新建/选择器全部禁用（DOM `disabled` + 视觉变淡 + 按钮内 Spinner）、完成后恢复、新建档案、删除档案并恢复 | 3 组 |
| `model-configuration-narrow-and-long-name` | 780×1000 窄屏单列布局、窄屏浮层长档案名称换行、Escape 关闭浮层、宽屏补充 | 3 组 |

每个截图点自动执行 浅色 → 深色 → 浅色 往返，并在切换后重新校验该点声明的「必须保留」元素（含 `role=listbox`/`role=dialog` 浮层选项在两种主题下可见）；浮层计算样式在两种主题下发生变化，未出现「浮层未随主题变化」失败。

### 本轮浏览器验收发现并处理的问题

1. **场景内的状态顺序耦合**：验收替身 `MODEL_CONFIG` 在服务进程内跨场景保留（`reset` 只重置项目/节点）。在改动档案状态的两个场景末尾补上「切回本地默认 LLM」恢复步骤，使各场景既可按序执行也可单独执行。
2. **`get_by_role(name=…)` 子串匹配陷阱**：`新建` 会匹配「新建学习路线」、`档案名称` 会匹配「新档案名称」。场景中改用 `exact: true` 校验，避免断言落到错误控件上（该行为不影响实现，只影响场景写法）。
3. **≤760px 的应用外壳缺陷（既有，非本任务引入）**：`app/styles.css` 在 `max-width: 760px` 把 `.app-shell` 改为列布局，而侧栏仍是 `h-screen w-72`，外壳又是 `overflow-hidden`，因此窄屏下工作区被裁掉且无法滚动到达。本任务窄屏验收改用 780×1000（低于 `md` 断点、仍是单列）以取得有效证据，并把该缺陷作为共享文件改动需求上报（见第 7 节）。

## 5. 命令结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npx vitest run --no-cache` | 通过（9 文件 / 39 测试） |
| `npm run build` | **失败**：本工作区的 `frontend/node_modules` 是指向主检出目录的 junction，Turbopack 报 `Symlink [project]/node_modules is invalid, it points out of the filesystem root`（环境问题，与本任务代码无关） |
| `npx next build --webpack` | 通过（静态导出，`/` 与 `/_not-found`），浏览器验收使用该产物 |
| Playwright 场景（5 个） | 全部通过 |

## 6. 密钥处理

- 单元测试与浏览器验收只使用虚构密钥 `sk-fake-acceptance-0001` / `sk-fake-0001`。
- 密码输入在截图中以掩码呈现，未出现明文密钥；测试证据只断言「保存后输入框为空且 DOM 中不含该虚构密钥」，不记录任何真实密钥。

## 7. 未完成 / 限制

1. **`frontend/app/styles.css` 死规则未删除**（属主代理文件）。本任务组件已不再引用以下 class，可整段删除（`.model-config-panel`/`.model-config-sections`/`.model-config-section`/`.model-config-section-heading` 仍被使用，保留）：
   - 第 196 行中：`.model-profile-controls { … }`、`.model-profile-controls label { … }`、`.model-profile-controls input, .model-profile-controls select { … }`、`.model-config-hint { … }`、`.icon-command { margin: 0; }` → 整行改为只剩 `.model-config-section-heading … > div > p:last-child { color: var(--ink-soft); font-size: 13px; }`
   - 第 210–222 行（`.model-config-form` 起至 `.model-config-message.error`）全部删除
   - 第 300–301 行（`@media (max-width: 760px)` 内的 `.model-config-form`、`.model-profile-controls`）删除
2. **RAG「服务地址辅助说明」未进入浏览器证据**：验收替身的 RAG 分区无活动档案，而 `verify_theme.py` 的定位器只取同名控件的第一个匹配（即 LLM 分区），无法在浏览器里为 RAG 分区新建档案。该说明、`向量模型` 标签与 RAG 密码输入改由单元测试覆盖（见第 3 节）。
3. **窄屏 ≤760px 的应用外壳缺陷**：如上所述属既有问题，需要同时改 `frontend/app/styles.css` 与 `frontend/features/projects/ProjectRail.tsx`（均非本任务文件），本任务只上报。
4. 浏览器验收使用本地替身数据（规格允许在 API 客户端处模拟），未对接真实模型服务；未验证真实密钥校验失败的响应体差异。

## 集成后复验（主 agent，在集成 main 上执行）

合并到 main（`d6b60a8`，`fixtures.ts` 冲突由主 agent 手工保留 03 与 06 双方新增内容）后，用最终版验收工具重跑了本任务全部场景：

| 轮次 | 结果 | 说明 |
| --- | --- | --- |
| 首次复验 | 4 通过 / 1 失败 | `model-configuration-narrow-and-long-name`（780×1000）失败：选择器点击超时，日志为 `aside aria-label="项目列表" … intercepts pointer events` |
| 修复后复验 | 5 通过 | 失败快照存于 `evidence/06-regression-780/report.json`；修复提交 `3d4ff73` |

根因不是本任务代码：集成过程中侧栏一度被改为默认 `w-full`，在 761–1023px（外壳仍为横向布局）会盖住工作区。现已把外壳与侧栏统一到 760px 断点，并在任务 01 场景新增 768/900 两个断点场景作为回归护栏。修复后本任务 5 个场景全通过（14 组浅/深截图，`report.json` 全 `passed`），原先因该缺陷无法在 420px 交互的限制也随之解除（420px 交互由任务 01/03 场景覆盖）。
