# 学习 Agent 架构文档

> 当前运行基线：Next.js 浏览器前端 + FastAPI API。开发入口为 `start.bat`，浏览器访问 `http://127.0.0.1:3000`；构建和桌面运行时由 FastAPI 同源托管 `frontend/out`。
>
> 本文档是仓库唯一的架构基线。架构描述以当前源码、依赖清单、启动脚本和打包脚本为准。

## 1. 架构总览

```text
开发模式
start.bat
  -> scripts/start_frontend_dev.py
     -> FastAPI API                 http://127.0.0.1:8000/api/v1/*
     -> Next.js 开发服务器          http://127.0.0.1:3000
        -> 浏览器工作台

构建/桌面模式
frontend: npm run build
  -> frontend/out/
  -> launcher.py
     -> Kotaemon venv 中的 uvicorn api.main:app
        -> FastAPI API + frontend/out 静态资源   http://127.0.0.1:8000/
           -> 系统浏览器，或 LE_DESKTOP=1 时的 PyWebView 窗口
```

所有用户界面都由同一个 Next.js 应用提供。PyWebView 只是可选的桌面窗口容器，不是另一套前端；Kotaemon 只作为后端基础设施和 RAG 适配底座运行。

### 1.1 开发模式

`start.bat` 在源码环境中调用 `scripts/start_frontend_dev.py`。脚本会启动两个子进程：

1. FastAPI 运行在 `127.0.0.1:8000`，通过 `LEARNING_DEV_MODE=1` 禁止挂载 `frontend/out`，只提供 `/api/v1` 接口。
2. Next.js 开发服务器运行在 `127.0.0.1:3000`，前端通过 `NEXT_PUBLIC_LEARNING_API_BASE` 请求 `http://127.0.0.1:8000/api/v1`。

这样开发浏览器始终使用当前源码，不会误读旧的静态构建产物。脚本会检查 Python、Node.js 和两个端口，并把服务输出写入 `logs/frontend-dev-api.log` 与 `logs/frontend-dev-next.log`。

### 1.2 构建和桌面模式

`frontend/next.config.ts` 使用 `output: "export"`，执行 `cd frontend && npm run build` 后生成 `frontend/out/`。非开发模式下，`api/main.py` 将该目录挂载到根路径 `/`，同时继续提供 `/api/v1`。

`launcher.py` 的启动流程如下：

1. 检查 `kotaemon/.venv/Scripts/python.exe` 和 `frontend/out/index.html`。
2. 从 8000 起寻找可用端口。
3. 以 Kotaemon venv 的 Python 子进程启动 `uvicorn api.main:app`。
4. 等待首页可访问后，默认调用系统浏览器打开 `http://127.0.0.1:<port>`。
5. 设置 `LE_DESKTOP=1` 时，尝试使用 PyWebView 创建窗口；PyWebView 不可用时回退到系统浏览器。

`build_exe.bat` 会先构建 Next.js 静态前端，再用 PyInstaller 打包 `launcher.py`。exe 本身不包含 Node.js，运行时依赖已经生成的 `frontend/out` 和便携版中的 Python/Kotaemon 环境。

## 2. 分层架构

```text
┌──────────────────────────────────────────────────────────────┐
│ 表现层：唯一的 Next.js / React 工作台                        │
│ frontend/app/page.tsx                                       │
│   ├── 项目列表与项目 CRUD                                    │
│   ├── 学习路线与节点详情                                     │
│   ├── 复习、测验、看板、资料、模型配置、RAG 问答              │
│   └── frontend/features/*                                    │
└──────────────────────────────┬───────────────────────────────┘
                               │ Fetch JSON / SSE
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ HTTP 接入层：FastAPI                                         │
│ api/main.py                                                  │
│   ├── 注册 /api/v1/* 路由                                    │
│   ├── CORS、请求 ID、异常转换                                │
│   └── 生产态挂载 frontend/out                                │
│ api/routers/*.py + api/schemas/*.py                          │
└──────────────────────────────┬───────────────────────────────┘
                               │ Session + DTO
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 应用层：learning_ext/application                              │
│ projects / roadmap / study / review / quiz / dashboard       │
│ resources / configuration / chat / jobs / export             │
│                                                              │
│ service 函数以 session: Session 作为首个参数                  │
└───────────────┬──────────────────────┬───────────────────────┘
                │                      │
                ▼                      ▼
┌─────────────────────┐      ┌─────────────────────────────────┐
│ 持久化与学习领域     │      │ Kotaemon 适配与基础设施          │
│ learning_ext/db      │      │ SQLite / SQLModel engine         │
│ FSRS v6              │      │ 文件存储与索引                    │
│ 掌握度、路线、测验   │      │ RAG IndexManager                  │
└──────────┬──────────┘      └──────────────┬──────────────────┘
           │                                │
           └──────────────┬─────────────────┘
                          ▼
                 SQLite + 文件/向量索引 + LLM Provider
```

`api/` 是 HTTP 适配层，不承载学习业务规则。`learning_ext/application/` 是客户端无关的应用用例层，统一组合领域服务、数据库查询、FSRS、LLM 和 RAG。浏览器只能通过 FastAPI 契约访问这些用例，不直接导入 Python 应用服务。

## 3. 前端架构

### 3.1 技术栈

| 层次 | 技术 | 当前实现 |
|---|---|---|
| Web 框架 | Next.js | `16.3.3`，App Router，静态导出 |
| UI 运行时 | React / React DOM | `19.2.8` |
| 开发语言 | TypeScript | `7.0.2`，严格模式，`tsc --noEmit` |
| UI 组件 | HeroUI | `@heroui/react`、`@heroui/styles` |
| 样式 | Tailwind CSS + 原生 CSS | Tailwind 4、PostCSS、`frontend/app/styles.css` |
| 图标与动画 | Lucide React、Framer Motion | 页面交互和图标使用 |
| Markdown | react-markdown + remark-gfm | Markdown 内容渲染，禁用原始 HTML |
| HTTP | 浏览器 Fetch API | `frontend/lib/api.ts` 类型化封装 |
| 流式通信 | Fetch `ReadableStream` + SSE 帧解析 | RAG 对话、资料上传进度 |
| 测试 | Vitest、Testing Library、jsdom | `npm run test` |
| 包管理 | npm | `package-lock.json` 锁定依赖 |

当前前端是单页工作台：根布局负责元数据和主题初始化，`app/page.tsx` 负责顶层项目选择与视图切换，具体能力按领域放在 `features/` 中。没有使用 React Router 或服务端组件获取业务数据；业务页面以 Client Component 和 React Hooks 驱动。

### 3.2 目录与职责

```text
frontend/
├── app/
│   ├── layout.tsx       # 根布局、元数据、主题 Provider
│   ├── page.tsx         # 页面组合根、项目选择和视图切换
│   └── styles.css       # 全局变量、布局、响应式和组件样式
├── features/
│   ├── projects/        # 项目列表、编辑/删除弹窗、项目目录 hook
│   ├── workspace/        # 项目工作区、状态更新和工作区 hook
│   ├── roadmap/          # 路线创建、路线面板、节点详情与状态
│   ├── review/           # FSRS 复习
│   ├── quiz/             # 测验生成和答题
│   ├── dashboard/        # 学习看板
│   ├── resources/        # 学习资料上传、索引和删除
│   ├── chat/             # RAG 流式问答
│   ├── configuration/    # LLM/RAG 模型配置
│   ├── markdown/         # Markdown 安全渲染
│   └── theme/            # 主题状态与切换
└── lib/
    ├── api.ts            # API DTO、JSON 请求和 SSE 解析
    └── errors.ts         # 前端错误格式化
```

`page.tsx` 只持有跨模块协调状态：当前视图和当前项目。项目目录状态由 `useProjectCatalog` 持有，当前项目工作区状态由 `useProjectWorkspace` 持有，节点详情由路线模块管理。跨模块刷新通过显式回调传递，不引入全局状态库。

### 3.3 API 和数据流

```text
React Client Components
  -> frontend/lib/api.ts
     -> JSON REST /api/v1/*
     -> SSE over POST /api/v1/*
        -> api/routers/*.py
           -> api/dependencies.py 创建 SQLModel Session
              -> learning_ext/application/*
                 -> SQLite / FSRS / LLM / Kotaemon RAG adapter
```

普通操作使用 JSON REST。RAG 问答和资料索引使用 `text/event-stream`，因为请求需要 POST body 或文件上传，前端直接读取 Fetch 响应流并解析 `event:` / `data:` 帧，没有使用 `EventSource`。

`frontend/lib/api.ts` 手工维护请求和响应 DTO，并通过 `ApiError` 统一携带 HTTP 状态、后端消息和 `x-request-id`。当前没有 OpenAPI 客户端代码生成；后端 schema 和前端 DTO 演进时需要同步修改并通过契约测试验证。

## 4. 后端和基础设施

### 4.1 FastAPI 接入层

`api/main.py` 创建 FastAPI 应用并注册以下业务路由：

- `projects`：项目 CRUD、路线、内容准备作业
- `nodes`：节点详情、内容、资源和状态
- `roadmaps`：路线预览、审核、调整和替换
- `reviews`：FSRS 到期卡片和复习提交
- `quizzes`：测验生成与答题
- `dashboard`：学习统计和导出
- `resources`：资料上传、索引状态和删除
- `chat`：RAG 流式问答
- `configuration`：LLM 与 RAG 模型档案和连通性

应用生命周期会初始化 `learning_ext`、恢复未完成的内容准备作业，并在退出时停止后台作业。请求中间件生成或传递 `x-request-id`，统一记录请求日志；领域异常转换为 400/404 JSON 响应。

### 4.2 learning_ext 应用层

`learning_ext/application/` 是唯一的业务编排入口，按用例划分为项目、路线、学习内容、复习、测验、看板、资料、聊天、配置、导出和后台作业模块。其特点是：

- 首个参数统一为 `session: Session`，便于测试和事务边界控制。
- HTTP 层只负责请求校验、依赖注入和响应模型转换。
- LLM 调用统一经 `learning_ext.llm.chat` / `chat_json`，配置来自本地 `.env` 和环境变量。
- RAG 通过 `learning_ext.adapters.kotaemon_rag.KotaemonRagAdapter` 隔离 Kotaemon API。
- 提示词放在对应领域模块的 `prompts.py` 或领域服务中，不由前端维护。

### 4.3 Kotaemon 底座边界

`kotaemon/` 是只读底座，不在其中加入学习产品逻辑。项目侧复用它提供的：

| 能力 | 代码边界 | 用途 |
|---|---|---|
| 数据库 engine | `ktem.db.engine.engine` | learning_ext 表与 Kotaemon 表共用 SQLite engine |
| 文件存储配置 | `KH_FILESTORAGE_PATH` | 上传资料和索引运行数据 |
| 文档索引 | `ktem.index.manager.IndexManager` | 创建、启动和删除 RAG 索引 |
| RAG 运行时 | `learning_ext/adapters/kotaemon_rag.py` | 将索引和检索能力适配为应用层契约 |

当前 `learning_ext.llm.client` 直接使用 OpenAI 兼容 SDK 和项目配置，不再把前端或业务应用绑定到 Kotaemon 的 Web UI。Kotaemon 的 RAG、数据库和文件存储能力仍然是后端基础设施。

## 5. 数据模型与存储

学习模型复用 Kotaemon 的 SQLModel engine，表名使用 `le_` 前缀以避免冲突。运行数据默认位于 `kotaemon/ktem_app_data/`，具体位置受 Kotaemon 配置影响。

| 表 | 说明 | 关键字段 |
|---|---|---|
| `le_project` | 学习项目 | topic, goal, weekly_hours, roadmap_json |
| `le_knode` | 知识路线节点 | code, title, stage, est_hours, difficulty, mastery, status |
| `le_kedge` | 知识依赖边 | source_id -> target_id |
| `le_card` | FSRS 复习卡片 | front, back, stability, difficulty, state, next_review |
| `le_reviewlog` | 复习记录 | card_id, rating, stability, difficulty |
| `le_quiz` | 测验 | project_id, quiz_type, scope_node_ids |
| `le_quiz_question` | 测验题目 | qtype, stem, options, answer, explanation |
| `le_quiz_attempt` | 答题记录 | question_id, user_answer, is_correct, feedback |
| `le_progress` | 掌握度时序 | node_id, metric, value, recorded_at |
| `le_task` | 实操任务 | title, description, task_type, status |
| `le_daily_report` | 学习日报 | content, study_minutes, cards_reviewed |

核心关系为：`User -> Project -> KnowledgeNode -> {Card, Quiz, Task}`。节点掌握度综合测验结果、FSRS 稳定性和学习状态等信号。知识节点可以关联 Kotaemon collection，用于限定资料检索范围。

## 6. 仓库结构

```text
learn-everything/
├── start.bat                         # 启动开发模式
├── scripts/start_frontend_dev.py     # 启动 FastAPI + Next.js
├── frontend/                         # 唯一产品前端
├── api/                              # FastAPI 路由、schema 和入口
├── learning_ext/                     # 学习业务、应用服务和 Kotaemon adapter
├── launcher.py                       # 构建/桌面启动器
├── build_exe.bat                     # 构建静态前端和 launcher.exe
├── pack_portable.bat                 # 组装便携版
├── kotaemon/                         # Kotaemon 只读底座和 Python 环境
│   ├── .env                          # 本地模型配置
│   ├── .venv/                        # Python 运行环境
│   └── ktem_app_data/                # 本地数据库、文件和索引数据
├── docs/ARCHITECTURE.md              # 唯一架构文档
└── logs/                             # 开发服务日志
```

## 7. 运行和开发约定

- 首次初始化：运行 `setup.bat`。
- 开发启动：运行 `start.bat`，或执行 `kotaemon\.venv\Scripts\python.exe scripts\start_frontend_dev.py`。
- 前端类型检查：`cd frontend && npm run typecheck`。
- 前端测试：`cd frontend && npm run test`。
- 前端生产构建：`cd frontend && npm run build`。
- 构建桌面 exe：运行 `build_exe.bat`。
- 组装便携版：运行 `pack_portable.bat`。
- 修改 `kotaemon/` 前先确认是否属于底座问题；学习产品功能应放在 `learning_ext/`、`api/` 和 `frontend/`。
- 本地模型配置放在 `kotaemon/.env`，不要提交真实密钥。
- 服务输出和启动诊断写入 `logs/`；运行数据写入 `kotaemon/ktem_app_data/`。

## 8. 验证与已知风险

当前前端提供 `npm run test`、`npm run typecheck` 和 `npm run build`。组件测试使用 Vitest、Testing Library 和 jsdom；后端/API 测试另按 Python 测试配置执行。浏览器和桌面运行仍需要在有完整依赖、模型配置和本地数据的环境中进行验收。

已知风险：

1. 前后端 DTO 目前手工同步，没有 OpenAPI 代码生成，接口变化可能造成类型漂移。
2. `frontend/app/page.tsx` 已收敛为组合根，但继续增加跨模块状态时仍需保持状态归属清晰。
3. `learning_ext.llm.client` 直接调用 OpenAI 兼容服务，真实供应商连通性取决于 `kotaemon/.env` 中的配置。
4. 首次启动会加载 Kotaemon、索引和数据库依赖，冷启动可能较慢；离线环境由启动脚本设置 Hugging Face 离线变量。
5. 当前数据库创建主要依赖 `SQLModel.metadata.create_all` 和兼容性补列逻辑，正式 schema 演进仍需补充迁移方案。

## 9. 阶段路线图

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 脚手架 | Kotaemon 底座、learning_ext、数据模型、Windows 运行方案 | ✅ 完成 |
| 1 路线闭环 | 路线生成、图谱可视化、节点状态机 | 🔜 进行中 |
| 2 认知巩固 | FSRS 复习 UI、AI 卡片提炼 | ⏳ 待做 |
| 3 查漏与看板 | 测验、错题本、热力图、日报 | ⏳ 待做 |
| 4 增强 | 费曼、苏格拉底、实操辅助、导出 | ⏳ 待做 |
| 5 演进 | 深化浏览器前端与 RAG 服务边界 | ⏳ 待做 |
