# Learn-Everything 三项 Agent 化升级：产品规划与立项可行性研究

日期：2026-09-04  
范围：学习路线、测试题目、资料拉取三个能力升级为可执行（可调用工具、可分步、可恢复、可审计）的 Agent。  
约束：不修改 `kotaemon/` 底座；优先复用现有 `learning_ext/`、FastAPI、SQLite、Kotaemon RAG Gateway。

## 1. 结论摘要

建议立项，但不要把“三个 Agent”一次性做成开放式自主代理。采用“受限工作流 Agent”：LLM 只负责需要判断的步骤，工具、状态机、权限、预算和持久化由后端掌控。

推荐顺序：

1. 先建设共用 Agent 基础（execution、步骤事件、结构化输出校验、超时/取消/重试、人工审批）。
2. 再做学习路线 Agent：产品差异最大，能把静态路线升级为依据掌握度和时间约束持续调整的教练。
3. 接着做测试题 Agent：已有出题/批改链路，最适合验证“诊断→选题→批改→更新掌握度”的闭环。
4. 最后做资料拉取 Agent：外部网络、版权、恶意 URL 和引用可信度使其风险最高，应先限定官方域名和用户确认。

立项判断：

| 能力 | 用户价值 | 使用频率（预估） | Agent 适配度 | 技术可行性 | 主要风险 | 建议 |
|---|---|---|---|---:|---|---|
| 学习路线 Agent | 高：从一次性 DAG 变成动态学习计划 | 低频创建、每周/阶段性调整 | 高（需多步规划和状态） | 中 | 规划幻觉、破坏已有进度、长任务失败 | MVP 采用“分析→提案→用户确认→替换/追加” |
| 测试题 Agent | 高：针对薄弱点即时诊断和调难度 | 高频：每次学习后/每日 | 高（诊断循环天然多步） | 高 | 题目事实错误、评分不一致、掌握度误更新 | 先做项目内节点范围和固定题型，保留人工复核 |
| 资料拉取 Agent | 中高：减少找资料和整理引用时间 | 中频：新节点首次打开或按需刷新 | 中高（工具调用多，但可先工作流化） | 中低 | SSRF、来源质量、版权、页面不可抓取 | 先做白名单搜索/抓取、逐条引用和失败可重试 |

## 2. 当前系统基线（已实现事实）

以下结论来自仓库代码和文档，不是推断：

- 运行链路是 Next.js → FastAPI `/api/v1` → `learning_ext.application`/领域服务 → SQLite、LLM facade、Kotaemon RAG；`kotaemon/` 被定义为只读底座（见 `docs/ARCHITECTURE.md`、`learning_ext/README.md`）。
- 路线目前已支持 `generate_roadmap`、`audit_and_rewrite_roadmap`、`refine_roadmap`，均通过 `learning_ext.llm.chat_json` 单次调用完成；保存时写入 `LearningProject`、`KnowledgeNode`、`KnowledgeEdge`。
- 路线替换是高影响操作：`replace_project_roadmap` 明确要求确认，并会清除节点、笔记、资料、复习和测验数据，然后启动内容准备作业。
- 测验已有 AI 出题和 AI 批改：`learning_ext/quiz/service.py` 生成 choice/fill/short/practice 题，提交答案后调用 `update_mastery` 更新节点掌握度；题目范围由调用方传入节点 ID。
- 教学内容准备已有可持久化后台作业：`learning_ext/application/jobs.py` 记录 generated/failed/pending、支持取消、重试和服务重启恢复。
- `docs/TODOs.md` 的 Feature 6 明确记录了当前任务治理阻塞：路线 preview/refine 发生在项目创建前，而现有 `le_task` 强制关联项目，无法可靠保存预览任务或支持重启恢复；路线、审计、课程、资料、复习和测验的统一异步任务生命周期尚未完成。这是 Agent 化前必须先解决的基础设施问题。
- 资料能力目前分成两条：用户文件通过 `api/routers/resources.py` 上传并流式索引到 Kotaemon；AI 资料由 `learning_ext/notes/service.py` 让 LLM 推荐最多 6 个 URL，再用 `requests.get` 抓取 PDF/HTML 并保存预览。当前 URL 校验只保证 HTTP/HTTPS 和存在域名，没有 Agent 级来源评分、引用链和域名白名单。
- `learning_ext.llm.client` 统一走 OpenAI 兼容 Chat Completions，`chat_json` 主要依赖正则剥离 Markdown 后 `json.loads`；尚未提供工具调用循环、JSON Schema 校验、token/步骤预算或统一执行追踪。

## 2.1 现有“生成”逻辑：先分清四种不同流程

当前系统中的“生成”不是一个统一的 Agent 流程，而是四类相互独立的 LLM 用例。它们都复用 `learning_ext.llm`，但触发时机、输入、输出和写库方式不同。

### A. 学习路线生成：先预览，后确认保存

```text
RoadmapCreation.tsx
  -> POST /api/v1/roadmaps/preview
     -> application.generate_roadmap_preview()
        -> path_generator.generate_roadmap()
           -> chat_json(路线初稿)
        -> audit_and_rewrite_roadmap()
           -> chat_json(审计并重写)
  <- roadmap + audit（此时不写数据库）

用户输入调整意见
  -> POST /api/v1/roadmaps/refine
     -> refine_roadmap_preview()
        -> chat_json(按意见重写整条路线)
  <- 新 roadmap（仍不写数据库）

用户点击确认保存
  -> POST /api/v1/projects
     -> application.create_project()
        -> save_roadmap()
           -> LearningProject
           -> KnowledgeNode
           -> KnowledgeEdge
        -> generate_env_checklist()
           -> chat()，生成环境清单并写入 env Task
  -> POST /api/v1/projects/{id}/content-preparation
     -> 首批节点同步生成
     -> 剩余节点进入后台 Task
```

这里有两个容易混淆的“描述”：路线节点最初的 `description` 只是路线中的知识点定位，通常很短；保存项目后，内容准备作业才会把它替换成完整课程 Markdown。因此“路线生成完成”不等于“课程内容已经生成完成”。

路线保存是高影响写入：替换既有路线前必须确认，并会清理关联节点、笔记、资料、复习和测验数据。路线调整目前会直接替换预览 JSON，调整后没有自动再次审计，这是后续 Agent 化必须补上的校验点。

### B. 节点课程与实操生成：按节点单独生成，可跳过或强制重生成

```text
节点详情点击“生成课程”
  -> POST /api/v1/nodes/{node_id}/content
     -> application.generate_node_content()
        -> 若已有有效 description 且 force=false：返回 skipped
        -> progress.generate_node_summary_to_db()
           -> 独立 Session 读取 node/project/env Task
           -> generate_node_summary()
              -> chat()，要求输出 2000-4000 字 Markdown 教材
           -> 回写 KnowledgeNode.description
           -> 若节点被判定为实践密集：继续生成 practice Task
```

课程提示词要求固定章节、代码/命令、误区、自测和衔接内容；它是一次大文本生成，不会调用检索工具，也不会逐步验证代码是否真的可运行。实操课程是另一次独立 `chat()`，结果写入 `le_task`，默认状态为 `pending`。

项目创建后的内容准备作业会按节点逐个调用上述逻辑：首批节点同步处理，其余节点在 daemon 线程中处理；每处理一个节点就把 `generated_node_ids`、`failed_node_ids`、`pending_node_ids` 写回 Task。取消、重试和服务重启恢复针对的是这个作业，不是 LLM 内部正在执行的单次请求。

### C. 测试题生成与批改：生成一组题，再逐题闭环

```text
QuizPanel.tsx
  -> POST /api/v1/projects/{id}/quizzes
     -> application.generate_quiz()
        -> quiz.service.generate_quiz()
           -> 读取指定 KnowledgeNode
           -> chat_json(生成 choice/fill/short/practice JSON 数组)
           -> 创建 Quiz + QuizQuestion
  <- 题目列表

用户提交单题答案
  -> POST /api/v1/projects/{id}/quizzes/questions/{qid}/answer
     -> application.submit_quiz_answer()
        -> quiz.service.grade_answer()
           -> chat_json(判断对错和反馈)
           -> 创建 QuizAttempt
           -> update_mastery()
              -> 回写 KnowledgeNode.mastery
  <- 对错、反馈、当前掌握度
```

当前出题范围由前端明确传入节点 ID，默认是一个节点；系统不会自动读取所有薄弱节点来规划整套测验。题目生成后只做基本字段兜底：如果模型返回的 `node_id` 不在允许范围，会按节点顺序回填；没有独立的答案一致性、重复题和事实正确性检查。批改结果会直接影响掌握度，因此 Agent 化时必须把评分置信度、复核和回滚作为一等状态。

### D. 参考资料生成：LLM 推荐 URL，代码负责抓取

```text
节点详情点击“拉取资料”
  -> POST /api/v1/nodes/{node_id}/resources
     -> application.generate_node_resources()
        -> notes.generate_resources()
           -> chat_json(最多 6 个资料候选 URL)
           -> 对每个 URL 调 fetch_resource_content()
              -> requests.get(timeout=18, allow_redirects=True)
              -> HTML/PDF 正文抽取
           -> save_resources_to_db()
              -> 删除该节点旧的 AI 资料
              -> 写入 NodeResource
  <- 资料列表与预览文本
```

这条路径目前是“生成候选 + 同步抓取”的串行流程，不是搜索 Agent：模型自己在答案里猜 URL，系统没有调用搜索工具、没有来源评分、没有证据片段与课程主张的严格绑定，也没有域名白名单。用户上传文件则是另一条路径：文件先落本地，再通过 `KotaemonRagGateway.index_documents()` 流式索引；它不等于 AI 资料推荐。

### 2.2 四类流程的共同模式与边界

| 维度 | 路线 | 课程/实操 | 测试题 | 资料 |
|---|---|---|---|---|
| 触发 | 创建项目或手动调整 | 节点详情/项目准备作业 | 用户手动选节点 | 节点详情手动拉取 |
| LLM 形式 | `chat_json`，路线初稿+审计+调整 | `chat` 长 Markdown | `chat_json` 出题/批改 | `chat_json` 候选 URL |
| 当前是否分步 Agent | 否，固定函数串联 | 否，单节点函数 | 否，生成和批改分离 | 否，推荐后代码抓取 |
| 是否写库 | 预览不写；确认后写 | 写 Node/Task | 写 Quiz/Question/Attempt/掌握度 | 替换 AI NodeResource |
| 异步能力 | 路线预览同步；内容准备异步 | 作业异步，单节点接口同步 | 同步 | 同步 |
| 人工确认 | 保存路线时有 | 生成前无审批 | 提交答案即影响掌握度 | 抓取并替换 AI 资料前无逐条审批 |

因此，Agent 化的本质不是“把 `chat_json()` 改名成 Agent”，而是在这些固定函数之间增加：状态读取、工具选择、循环执行、结果校验、人工审批、可恢复执行和证据记录。

## 3. 产品价值与用户场景

### 3.1 学习路线 Agent

**目标用户问题**：用户不知道从哪里开始；学习时间、背景和目标变化后，原路线失效；完成测验或课程后，系统没有把证据转化为下一步行动。

**Agent 化价值**：

- 首次建路：通过追问澄清目标、先验、时间和交付物，生成可解释的路线提案。
- 持续调整：读取节点状态、掌握度、测验/复习记录和学习时长，识别阻塞节点，提出“跳过、拆分、补前置、增加实践、调整顺序”等变更。
- 计划执行：把下一步拆成可执行任务，依据每周预算安排学习量；每次只提交提案，不直接破坏现有路线。
- 可解释反馈：展示“为什么调整”（例如某节点连续两次测验错误、前置掌握度不足）。

**MVP 验收指标（建议）**：路线提案采纳率、用户从提案到下一次学习的转化率、节点完成率、因路线调整导致的数据回滚次数、每次提案平均 LLM 成本/时延。

### 3.2 测试题 Agent

**目标用户问题**：固定 5 题无法覆盖薄弱点；题目难度与学习阶段不匹配；批改只返回对错，不能指导下一步。

**Agent 化价值**：

- 诊断选题：综合 `mastery`、最近错误、FSRS 状态和依赖关系，决定测哪些节点、各出几题。
- 动态难度：首题失败则降低难度/补前置，连续正确则提升难度或切换 practice 题。
- 反馈闭环：批改后生成错因标签、补救讲解和下一题/下一节点建议，并把证据写入掌握度与学习记录。
- 题目质量门：生成后先做结构校验、答案一致性检查和重复题检测，再入库。

**MVP 验收指标（建议）**：题目 schema 通过率、人工抽检正确率、评分与人工评分一致率、诊断后薄弱节点掌握度提升、单次测验成本和时延。

### 3.3 资料拉取 Agent

**目标用户问题**：课程中的概念缺少可靠出处；用户需要自己搜索、筛选、下载和整理；网页经常登录、脚本渲染或格式不兼容。

**Agent 化价值**：

- 资料规划：从课程章节提取“需要证据的主张”，为每个主张搜索官方文档、论文、标准或项目原始仓库。
- 证据绑定：保存 URL、标题、抓取时间、片段和“支撑哪一段课程”的映射，而不是只有一段摘要。
- 质量排序：优先官方/标准/论文原文，去重并标记无法访问、正文过短、疑似登录墙等失败原因。
- RAG 联动：用户确认后才索引到节点集合，课程问答可返回来源引用。

**MVP 验收指标（建议）**：有效来源率、引用可打开率、主张-证据匹配人工评分、重复/失效 URL 比例、抓取失败可恢复率。

## 4. 技术可行性与一手资料依据

### 4.1 工具调用和结构化输出已经是成熟模式

- OpenAI Agents 官方总览将 Agent 定义为可规划、调用工具、跨专家协作并保留状态以完成多步工作的应用，并把 agent loop、持久状态、guardrails 和 human review 作为独立构件：[Agents guide](https://platform.openai.com/docs/guides/agents)。
- OpenAI 官方文档说明 Structured Outputs 可让模型响应遵循提供的 JSON Schema，适合路线、题目、执行计划等强契约输出：[Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs)。
- Anthropic 官方工具文档将 tool use 定义为模型调用应用提供的函数；开启 `strict: true` 可保证工具调用参数符合 schema，并且应用仍负责实际执行和返回结果：[Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)。

**对本项目的含义（建议）**：保留 `learning_ext.llm` 作为供应商 facade，但新增统一的 Agent tool schema 和本地 Pydantic 校验；不能只依赖 prompt 中的“只返回 JSON”。

### 4.2 资料拉取需要带引用的搜索/抓取工具

- OpenAI 官方文档说明 Web search 可访问互联网并返回带来源引用的答案：[Web search](https://developers.openai.com/api/docs/guides/tools-web-search)。
- Anthropic 官方文档列出 Web search（实时搜索并带 citations）和 Web fetch（抓取网页/PDF）服务器工具：[Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)、[Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)。
- OpenAI Retrieval 官方文档说明 Retrieval API 以 vector stores 作为数据索引并提供语义搜索：[Retrieval](https://developers.openai.com/api/docs/guides/retrieval)。

**对本项目的含义（建议）**：第一阶段不把外部搜索直接暴露给模型。由后端实现 `search_sources`、`fetch_source`、`extract_evidence` 三个受限工具，强制返回 URL、抓取状态、片段和时间戳，再由 Agent 组织结果。

### 4.3 长流程需要持久化、人工介入和可观测性

- LangGraph 官方文档把 durable execution、streaming、human-in-the-loop、persistence 和在同一图中混合确定性步骤/Agent 步骤列为核心能力：[LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)。
- OpenAI 官方 Evals 文档建议用代表性测试数据、明确 grader 和迭代分析来验证 LLM 应用；同时页面标注 Evals 平台将在 2026 年进入只读/下线过渡，因此项目应保留本地可运行评测集：[Working with evals](https://developers.openai.com/api/docs/guides/evals)。
- Anthropic 的测试设计文档建议先定义具体、可衡量的成功标准，再覆盖正常、边界和罕见输入，并分别评估准确性、上下文利用、延迟、成本和用户反馈：[Define success criteria and develop tests](https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests)。

**对本项目的含义（建议）**：先复用现有 `Task` 作业的取消/重试/恢复思路，增加统一 `AgentExecution`、`AgentStepEvent` 和审批状态；是否引入 LangGraph 应在 MVP 压测后决定，不应为了“Agent”标签直接替换现有应用服务。

### 4.4 URL 抓取必须处理 SSRF

- OWASP SSRF 防护指南指出，服务端根据用户提供的 URL 发起请求时需要做严格验证和网络访问控制：[Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)。

**对本项目的含义（必须）**：资料 Agent 至少实施域名白名单/用户确认、禁止内网和回环地址、限制重定向、响应大小/超时、内容类型和下载目录；当前 `requests.get` 实现不足以直接承载开放式 Agent 抓取。

### 4.5 检索策略应从可控工作流开始

LangChain 官方检索文档区分 2-step RAG（简单、可预测、低延迟）与 Agentic RAG（由 LLM 决定何时/如何检索，灵活但延迟和控制不稳定），并给出含验证步骤的 Hybrid 方案：[Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)。对本项目，资料拉取 Agent 的 MVP 应采用 2-step/Hybrid：后端先执行白名单搜索和抓取，Agent 只做证据选择与整理；待引用准确率和成本达标后再开放 Agent 自主决定检索次数。

## 5. 推荐目标架构（不改 Kotaemon 底座）

```text
Agent API (FastAPI)
  -> Agent Orchestrator (learning_ext/agent/)
       -> State Store (SQLite: execution/steps/approvals)
       -> Tool Gateway (project/roadmap/quiz/RAG/search/fetch)
       -> LLM facade (learning_ext.llm)
       -> Domain services (现有 roadmap/quiz/notes/progress)
```

每次执行至少记录：`execution_id`、用户/项目、输入快照、当前步骤、工具调用参数摘要、模型/提示词版本、token/时延、输出校验结果、错误、审批和最终写入对象。工具分为：

- 只读：读取项目、节点、掌握度、课程内容、已有资料。
- 提案：生成路线差异、题目草稿、资料候选，不写核心数据。
- 写入：保存路线/题目/资料索引，必须经过确定性校验；高风险写入（替换路线、删除/批量索引）必须人工确认。

### 5.1 统一运行时对象边界（建议命名）

为避免三个 Agent 各自发明任务格式，建议统一以下四类对象（可先落 SQLite，后续再换队列/工作流引擎）：

| 对象 | 职责 | 最小字段 | 不负责什么 |
|---|---|---|---|
| `AgentRun` | 一次用户可见的完整执行及生命周期 | `run_id`、`agent_type`、`user_id`、`project_id/node_id`、输入快照、状态、预算、结果引用、错误、时间戳 | 不直接承载领域业务规则 |
| `AgentStep` | Run 内可重试、可恢复的逻辑步骤 | `step_id`、`run_id`、序号、类型（plan/tool/validate/approval/commit）、输入/输出摘要、状态、attempt、耗时 | 不绕过 Tool Gateway 写数据库 |
| `AgentTool` | 后端注册的能力契约和权限边界 | 名称、版本、JSON Schema、读写级别、超时、幂等策略、审计分类 | 不让模型获得任意 Python/文件系统/网络权限 |
| `AgentEvent` | 向 UI、日志和评测输出不可变事件 | `event_id`、`run_id`、`step_id`、事件类型、脱敏 payload、发生时间 | 不作为唯一状态来源（状态以 Run/Step 持久化为准） |

推荐状态流：`queued → running → waiting_approval → running → succeeded/failed/cancelled`。每次工具调用都先校验 schema、项目/用户归属和预算，再执行；写入步骤使用幂等键，重复重试不得产生重复题目或重复资料记录。

## 6. 分阶段实施建议

### 阶段 0：共用地基（1 个迭代）

- 定义 `AgentExecution`、`AgentStep`、`AgentApproval` 数据结构和状态机：queued/running/waiting_approval/succeeded/failed/cancelled。
- 统一 JSON Schema/Pydantic 校验、步骤预算（最大步数、最大 token、最大耗时）和幂等键。
- 复用现有 SSE/后台作业模式，提供事件流、取消、重试、恢复和审计日志。
- 建立离线评测夹具：路线完整性、题目 schema/答案一致性、资料 URL 有效性和引用匹配。

### 阶段 1：路线 Agent MVP

- 工具：`read_learning_state`、`propose_roadmap_patch`、`validate_roadmap`、`request_approval`、`apply_roadmap_patch`。
- 只允许增量 patch（新增/拆分/调整顺序/标记阻塞），默认不删除历史节点；替换整条路线沿用现有确认机制。
- 提案中必须给出证据节点和影响范围；用户确认后才写入并触发内容准备作业。

### 阶段 2：测试题 Agent MVP

- 工具：`select_diagnostic_scope`、`generate_questions`、`validate_questions`、`grade_answer`、`recommend_remediation`。
- 先支持项目内节点和四种现有题型；动态难度只改变下一题，不自动修改路线。
- 将评分置信度、错因标签和人工复核入口写入答题记录，掌握度更新设置上下限和回滚策略。

### 阶段 3：资料 Agent MVP

- 工具：`search_sources`（白名单域名）、`fetch_source`（SSRF 防护）、`extract_evidence`、`deduplicate_sources`、`propose_resource_links`、`index_after_approval`。
- 结果必须保留来源 URL、标题、抓取时间、证据片段、支撑章节和失败状态；不能只保存 LLM 摘要。
- 首批域名建议限定 Python/MDN/官方项目文档、arXiv/DOI 等可审计来源；扩展域名需配置变更和测试。

## 7. 关键风险与决策门

| 风险 | 触发条件 | 防护/决策门 |
|---|---|---|
| 幻觉或错误规划 | 路线引用不存在前置、题目答案不一致 | schema + 图约束 + 二次审计 + 人工确认 |
| 数据破坏 | Agent 直接替换路线/删除资料 | 仅 patch、事务、审批短语、备份快照 |
| 外部抓取安全 | 任意 URL、重定向到内网、超大响应 | SSRF 防护、白名单、DNS/IP 校验、限额 |
| 成本/时延失控 | 多轮工具调用或并发抓取 | 步数/token/时间预算、并发上限、缓存 |
| 不可复现 | 模型/提示词变化导致结果漂移 | 记录模型和 prompt 版本，固定评测集 |
| 用户不信任 | 只给结论不给理由和出处 | 展示步骤、证据、引用和可撤销操作 |

若阶段 0 无法提供可查询的执行记录、取消/恢复和确定性校验，则不应进入三个 Agent 的生产试用；若资料 Agent 无法通过 SSRF 和引用可打开率门槛，应暂缓开放互联网抓取，只支持用户上传资料。

## 8. 已实现、推断、建议和未验证边界

- **已实现**：路线生成/审计/调整与保存；测验出题/批改/掌握度更新；用户文件 RAG 索引；AI 资料推荐和基础 PDF/HTML 抓取；内容准备作业取消、重试、恢复（均有仓库代码依据）。
- **推断**：以上能力可作为 Agent 工具，但需要新增执行状态、工具契约和审计层；现有单次 `chat_json` 不能直接视为 Agent runtime。
- **建议**：采用受限工作流 Agent、提案优先、人工审批、高风险写入隔离；先路线、后测验、再资料。
- **未验证**：当前部署使用的具体 LLM 是否支持原生 tool calling/strict schema；Kotaemon 版本和现有 RAG Gateway 是否能提供稳定的来源片段/引用 ID；真实用户数据下的成本、时延、题目质量和路线采纳率；互联网抓取的版权政策与企业网络策略。这些需在阶段 0 的兼容性 Spike 和离线评测中实测。
