# 06: 完成 HeroUI 模型档案配置

**What to build:** 学习者在两种主题下管理 LLM 和 RAG 模型档案，选择活动档案、填写服务地址与密钥、保存配置、测试连接和删除档案；每次操作都有一致、明确的忙碌与结果反馈。

**Blocked by:** 02 — 完成 HeroUI 工作区导航与进度。

**Status:** done — 9/9 条目已勾选；双主题证据 `evidence/06/`（5 场景 15 组）全部通过，集成后复验（含 780px 回归）与失败快照见 `evidence/06-regression-780/`。

依据规格《统一前端 HeroUI 基础控件与浅色/深色主题验收》。本任务依赖统一主题与工作区，保持现有模型档案生命周期和请求契约，不添加新的删除确认业务协议。

- [x] 两类模型档案的选择器、名称、服务地址、模型名、密码输入和新建/保存/连接测试/删除按钮使用 HeroUI，具有明确标签及图标操作名称。
- [x] 活动档案选择仍触发既有应用操作；新建、保存、删除后的表单和状态按照现有响应刷新，档案长名称与空档案场景清楚可辨。
- [x] 保留服务地址辅助说明和密钥配置提示；密钥使用密码输入且保存后不重新回显，不在日志、测试证据或截图中暴露真实密钥。
- [x] 操作进行时禁用可能冲突的操作，防止重复提交；连接测试仍使用当前草稿及已有密钥规则，成功和失败都有明确文字反馈。
- [x] 已就绪/未配置、读取中、错误、测试结果及辅助文字适配两种主题，状态不只依赖颜色区分。
- [x] 主题切换不重置两类配置草稿、新档案名称、活动档案或连接测试结果，不中断进行中的保存/测试请求。
- [x] 在 API 客户端处模拟配置返回，真实渲染 HeroUI，验证读取、活动档案选择、新建、保存、连接测试与失败反馈、删除及操作禁用，使用虚构密钥数据。
- [x] 完成真实浏览器浅色、深色和往返切换验收，包括选择器浮层、密码输入、焦点、长名称、窄屏、操作进行中及错误反馈，记录证据。
- [x] 更新控件来源与双主题记录，清理本任务已无调用方的表单及按钮皮肤；类型检查、完整前端测试和静态生产构建通过，配置协议不变。
  - 完成情况（任务 07 执行）：`app/styles.css` 中 `.model-config-form`/`.model-config-state`（含 `.ready`/`.missing`）/`.model-config-actions`/`.model-config-message`（含 `.inline`/`.error`）/`.model-config-hint`/`.model-profile-controls`/`.icon-command` 共 20 余条规则已删除（含 760px 断点内的两条）；控件来源与例外已写入 `records/control-inventory.md`；`npm run typecheck`、89 项测试、`npm run build` 均通过；`lib/api.ts` 与模型配置协议未改。
  - 记录、类型检查、完整前端测试、静态构建均已完成；本任务组件已不再引用 `.model-profile-controls`/`.model-config-form`/`.model-config-state`/`.model-config-actions`/`.model-config-hint`/`.model-config-message`/`.icon-command`，但删除 `frontend/app/styles.css` 中的对应规则属主代理文件，本代理无写权限，精确 diff 见 `records/06-model-configuration.md` 第 7 节。该规则删除应用后本项即可勾选。

**验收记录：** `.scratch/heroui-integration/records/06-model-configuration.md`（含控件来源、原生例外、命令结果、证据路径与限制）
