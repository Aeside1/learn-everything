# HeroUI 接入任务索引

规格：[HeroUI 接入与双主题验收](../../docs/specs/heroui-integration.md)。

本任务组按已确认的七项拆分生成，使用 Matt 的 to-tickets 本地任务格式。仓库配置的 GitHub Issues 当前关闭，因此本任务组临时保存在本地；没有修改全仓 issue tracker 配置、仓库设置或创建远程 issue。各任务的 ready-for-agent 是本地准备状态，不表示正在实施或已经完成；当前仅授权方案、规格和任务拆分，前端实施仍暂停。

| 编号 | 任务 | 直接阻塞项 |
| --- | --- | --- |
| 01 | [统一 HeroUI 主题与项目入口](issues/01-theme-and-projects.md) | 无 |
| 02 | [完成 HeroUI 工作区导航与进度](issues/02-workspace-navigation.md) | 01 |
| 03 | [完成 HeroUI 路线创建与节点学习](issues/03-roadmap-and-node-detail.md) | 02 |
| 04 | [完成 HeroUI 看板、复习与测验](issues/04-dashboard-review-and-quiz.md) | 02 |
| 05 | [完成 HeroUI 资料上传与 RAG 问答](issues/05-resources-and-rag-chat.md) | 02 |
| 06 | [完成 HeroUI 模型档案配置](issues/06-model-configuration.md) | 02 |
| 07 | [完成 HeroUI 全局验收与样式清理](issues/07-integration-and-verification.md) | 03、04、05、06 |

获得实施授权后，当前可启动的是 01。01 完成后启动 02；02 完成后，03–06 都可启动，彼此没有阻塞关系。多人并行修改共享主题或 CSS 时需要协调实际改动，依赖图不代表可以无冲突地修改同一个文件。07 等待全部业务迁移完成。

任务实施采用逐模块迁移：保留尚未迁移调用方需要的旧样式，每个任务独立通过类型检查、前端测试与静态构建。不能为了最终清理提前破坏其他面板。当前 12 个现有模块与 2 个新增共享组合中的未验证改动，需要在 01 建立基线时审阅归属并妥善整理。

每项任务都交付实际用户工作流、控件来源记录、浅色/深色浏览器验收与适当的行为测试。以 API 客户端为数据模拟入口，真实渲染 HeroUI；不改后端协议，也不以所有原生 HTML 都消失作为完成标准。
