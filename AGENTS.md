# AGENTS.md - 开发代理指南

## 项目概述
学习 Agent：基于 Kotaemon RAG 底座 + FSRS 记忆算法的自建学习平台。
**Windows 桌面应用**，双击 exe 运行，PyWebView 包装窗口。

## 关键路径
- 学习特化代码: `learning_ext/`
- Kotaemon 底座(只读): `kotaemon/`
- 后端入口: `api/main.py`
- 桌面启动器: `launcher.py`
- 本地配置: `kotaemon/.env`
- 架构文档: `docs/ARCHITECTURE.md`

## Git 与远端（长期在 fork 上开发）

| Remote | 仓库 | 用途 |
| --- | --- | --- |
| `origin` | `Aeside1/learn-everything`（我们的 fork） | 所有分支、所有推送、所有 issue/PR |
| `upstream` | `redmaplewww/learn-everything`（上游） | 只 fetch；push URL 已设为 `DISABLED`，误推会直接失败 |

- `main` 跟踪 `origin/main`；一个 issue 一个分支：`feat/<issue>-<slug>` 或 `fix/<issue>-<slug>`。
- PR 默认目标是我们 fork 的 `main`；回贡上游是单独的显式步骤（届时需从 PR 里剔除 fork 专属文件，如 `.github/ISSUE_TEMPLATE`、`.github/pull_request_template.md`、`docs/agents/*`）。
- 同步上游：`git fetch upstream` 后 `git merge upstream/main`（不要改写已推送的 `main` 历史）。
- 除非明确要求，不要 `git push` / 发布 / 部署。

## 开发命令
```bash
# 首次初始化 (联网装依赖，5-15分钟)
setup.bat

# 启动 (开发模式，浏览器或 PyWebView 窗口)
start.bat
# 或直接: kotaemon\.venv\Scripts\python.exe scripts\start_frontend_dev.py

# 查看后端日志: 启动时控制台实时输出
# 数据落: kotaemon\ktem_app_data\

# 打包 exe
build_exe.bat      # 打 launcher.exe
pack_portable.bat  # 组装完整便携版

# 停止: 关闭桌面窗口或 Ctrl+C
```

## 代码约定
- 学习特化模块全部放 `learning_ext/`，不修改 `kotaemon/` 底座
- service 函数第一参数恒为 `session: Session`
- LLM 调用走 `learning_ext.llm.chat/chat_json`
- 新增界面功能: `frontend/features/` + `api/routers/` 契约
- 提示词放各模块 `prompts.py`
- 不写注释（除非复杂逻辑必要）

## 架构关键点
- **双 Python 进程**: launcher.exe (PyWebView) 用子进程跑 Kotaemon venv 的 python
- **路径**: `scripts/start_frontend_dev.py` 和 `launcher.py` 将项目根目录、`kotaemon/` 加入 `PYTHONPATH`
- **环境变量占位**: cohere/voyage/mistral 缺 key 会崩，learning_ext/__init__.py 注入占位
- **离线模式**: FastAPI 启动环境设置 `HF_HUB_OFFLINE=1`，避免访问 huggingface.co 超时

## 阶段路线
- [x] 阶段0: 脚手架 (Docker + 底座 + learning_ext 骨架 + 数据模型 + 路线Tab)
- [x] **切换: 改为 Windows 桌面 exe 方案** (launcher + PyWebView + PyInstaller)
- [ ] 阶段1: 路线闭环 (Agent调优 + 图谱可视化 + 节点状态机)
- [ ] 阶段2: 认知巩固 (FSRS复习UI + AI卡片提炼)
- [ ] 阶段3: 查漏+看板 (测验 + 错题本 + 热力图 + 日报)
- [ ] 阶段4: 增强 (费曼 + 苏格拉底 + 实操 + 导出)
- [x] 阶段5: Next.js 前端 + FastAPI API

## 已知问题
- LSP 报错(ktem/theflow/sqlmodel 未解析)是本机 IDE 没识别 kotaemon/.venv，代码在 venv 内运行，忽略
- 首次启动慢 (~30-60s)，因加载 chromadb/langchain 等重库
- 国内网络需设 HF_HUB_OFFLINE=1（FastAPI 启动脚本已默认设置）
- 学习路线等功能需配 LLM key 后在 Resources 页或 .env 配置

## Agent skills

### Issue tracker

Issues live in GitHub Issues on **our fork** `Aeside1/learn-everything`; use the `gh` CLI. Issues were enabled in repository settings (they used to be off, which made `gh issue create` fail). `gh repo set-default Aeside1/learn-everything` is already set for this checkout, but scripts and agents should still pass `--repo Aeside1/learn-everything` explicitly. Upstream `redmaplewww/learn-everything` is read-only for us — do not open or triage issues there.

Work files for a task live in `.scratch/<任务名>/`（`specs/`、`issues/`、`records/`、`evidence/`、`tools/`）alongside the code. See `docs/agents/issue-tracker.md` for the lifecycle, remotes, branch/PR default and upstream sync steps.

### Triage labels

Use the default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. They exist on the fork; `needs-info` is for issues that cannot be started until the reporter answers. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository with root `CONTEXT.md` and ADRs under `docs/adr/`. See `docs/agents/domain.md`.
