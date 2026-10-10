# 02 验收记录：完成 HeroUI 工作区导航与进度

状态：**完成**（用户行为测试、类型检查、静态构建、浏览器双主题验收全部通过）

## 1. 改动清单

| 文件 | 改动 |
| --- | --- |
| `frontend/features/workspace/Workspace.tsx` | 手写 tablist/tabpanel/焦点逻辑整体替换为 HeroUI `Tabs`（`Tabs.ListContainer` + `Tabs.List` + `Tabs.Tab` + `Tabs.Indicator` + `Tabs.Panel`）；进度改用 HeroUI `ProgressBar` 复合组件；外壳配色从 `dark:zinc-*` 覆写改为主题变量（`text-muted`/`border-foreground`/`text-emerald-*` 仅保留品牌强调色） |
| `frontend/features/workspace/WorkspaceStatus.tsx` | 读取中/失败/未选项目三态改用 HeroUI `Card`/`Spinner`/`Button` + 主题变量；失败态加 `role="alert"` 并保留原错误文案与重试回调 |
| `frontend/app/styles.css` | 删除已无调用方的 `.workspace-tab-panel` 及其子选择器；新增 `@theme inline` 注册业务色为 Tailwind 工具类（`bg-brand-soft`/`text-ink` 等）；把 HeroUI 的 `--accent`/`--focus` 集中指向品牌色，避免逐页面覆写控件配色 |
| `frontend/tests/workspace-tabs.test.tsx` | 重写：默认选中、鼠标切换、键盘（方向键/Home/End）、标签与面板可访问关联、未选中面板不渲染 |
| `frontend/tests/workspace-navigation.test.tsx`（新增） | 进度数值与状态计数、零知识点文案、读取中、加载失败 + 重试、未选项目、离开路线再返回保留节点详情 |

## 2. 控件来源清单（本任务范围）

| 位置 | 基础控件 | 来源 | 说明 |
| --- | --- | --- | --- |
| 工作区标签切换 | Tabs / Tabs.ListContainer / Tabs.List / Tabs.Tab / Tabs.Indicator | HeroUI | 选中态、焦点、键盘导航、`aria-controls`/`aria-labelledby` 由库生成 |
| 工作区面板 | Tabs.Panel | HeroUI | 路线面板显式 `shouldForceMount` + `data-[inert]:hidden` |
| 项目进度条 | ProgressBar / Output / Track / Fill | HeroUI | `color="success"`、`size="sm"`，百分比文字用 `ProgressBarOutput` |
| 读取中 | Spinner | HeroUI | `aria-label` + 容器 `aria-busy` |
| 加载失败 | Card / CardTitle / CardDescription / Button | HeroUI | `role="alert"`，重试按钮为 HeroUI `Button primary` |
| 未选项目 | Card / CardTitle / CardDescription | HeroUI | 虚线边框空态 |
| 完成节点计数（`2 / 4`） | 纯文本 + `aria-label="项目进度 2/4"` | 业务排版 | 不是控件，保持原信息结构 |

### 原生元素例外

| 元素 | 用途 | 理由 |
| --- | --- | --- |
| `<main>`/`<header>`/`<section>` | 页面结构与地标 | 语义布局 |
| 计数文本与状态计数 | 业务内容 | 排版内容而非可交互控件 |

工作区内已无原生 `button`；其余面板的原生控件由任务 03–06 处理。

## 3. 用户行为测试

| 测试 | 覆盖 |
| --- | --- |
| `workspace-tabs.test.tsx` | 默认「学习概览」选中；点击 6 个标签分别渲染正确面板；`aria-selected` 唯一；面板 `aria-labelledby` 指向对应 tab；键盘 `ArrowRight`/`ArrowLeft`/`Home`/`End` 切换；路线面板保持挂载、未访问面板不渲染 |
| `workspace-navigation.test.tsx` | 进度 `aria-valuenow=50` 与「50% 已完成」；零知识点时显示「暂无知识点，保存路线后开始学习」；读取中 `aria-busy` + Spinner；失败态 `role=alert` + 原错误文案 + 重试回调；未选项目空态；进入路线详情 → 切到测验 → 切回路线，详情状态保留 |

## 4. 浏览器双主题验收

```powershell
npm run build
python tests/browser/verify_theme.py --scenarios tests/browser/scenarios/02-workspace-navigation.json --out ..\.scratch\heroui-integration\evidence\02
```

结果：3 个场景全部通过，12 组双主题截图（证据在 `.scratch/heroui-integration/evidence/02/`）。

| 场景 | 覆盖 | 截图 |
| --- | --- | --- |
| `workspace-tabs-progress-detail` | 默认选中与进度、标签悬停、标签键盘焦点、切到路线、进入节点详情、切走再切回保持详情、返回列表 | 6 组 |
| `workspace-keyboard-narrow-long-title` | 方向键/Home/End 切换与选中态、窄屏 420×860 标签可滚动、切换到长标题项目 | 3 组 |
| `workspace-loading-and-error` | 读取中（延迟 1200ms）、加载失败 + 错误文案、`重新加载` 恢复 | 3 组 |

每个截图点仍执行 浅色 → 深色 → 浅色 往返并复验「必须保留」元素；本任务场景额外验证了 `aria-selected` 在主题切换后不变化。

## 5. 命令结果

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run test` | 通过（8 文件 / 28 测试） |
| `npm run build` | 通过 |
| Playwright 场景（3 个） | 全部通过 |

## 6. 限制

- 窄屏下标签通过 `Tabs.ListContainer` 的横向滚动 + 滚动按钮访问，未做标签换行；这是 HeroUI 的默认行为，浏览器截图可确认无裁切。
- 未验证超长标签文本（当前 6 个标签均为短词），长文本风险由任务 03–06 的选择器/长标题场景覆盖。
