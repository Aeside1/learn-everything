import type { NodeDetail, ProjectRoadmap, ProjectSummary, ProjectWorkspace } from "../lib/api";

export const workspaceNode = {
  id: 101,
  code: "1.1",
  title: "所有权",
  description: "学习 Rust 的所有权模型。",
  stage: "基础",
  status: "pending",
  mastery: 0,
  est_hours: 2,
  difficulty: 2,
  has_content: false,
  learnable: true,
  resources: [],
};

export const workspace: ProjectWorkspace = {
  project: { id: 1, title: "学习 Rust", topic: "Rust", background: "", goal: "", weekly_hours: 8, status: "active", created_at: "", updated_at: "" },
  progress: { total: 1, done: 0, learning: 0, pending: 1, weak: 0, skipped: 0, pct: 0 },
  environment: { description: "", status: "ready" },
  nodes: [workspaceNode],
};

export const roadmap: ProjectRoadmap = {
  project_id: 1,
  summary: "Rust 路线",
  stages: [{ name: "基础" }],
  nodes: [{ ...workspaceNode, prerequisites: [] }],
};

export const projectSummary: ProjectSummary = {
  id: 1,
  title: "学习 Rust",
  topic: "Rust",
  status: "active",
  progress: workspace.progress,
  created_at: "",
};

export const nodeDetail: NodeDetail = {
  ...workspaceNode,
  practice: null,
  note: { id: 1, content: "原笔记", selection: "", updated_at: "" },
  resources: [],
};
import type { ModelConfiguration } from "../lib/api";

export const modelConfiguration: ModelConfiguration = {
  llm: {
    active_profile_id: "llm-default",
    active_profile_name: "默认 LLM 档案",
    base_url: "https://llm.example.test/v1",
    model: "example-chat-model",
    api_key_configured: true,
    ready: true,
  },
  rag: {
    active_profile_id: null,
    active_profile_name: null,
    base_url: "",
    model: "",
    api_key_configured: false,
    ready: false,
  },
  llm_profiles: [
    { id: "llm-default", name: "默认 LLM 档案", base_url: "https://llm.example.test/v1", model: "example-chat-model", api_key_configured: true },
    { id: "llm-backup", name: "备用档案：一个很长的档案名称用于验证选择器浮层内的换行与选中回传", base_url: "https://backup.example.test/v1", model: "example-backup-model", api_key_configured: false },
  ],
  rag_profiles: [],
};
