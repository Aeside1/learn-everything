import type { IndexedResource, NodeDetail, ProjectRoadmap, ProjectSummary, ProjectWorkspace, WorkspaceNode } from "../lib/api";

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

export const secondWorkspaceNode: WorkspaceNode = {
  ...workspaceNode,
  id: 102,
  code: "1.2",
  title: "生命周期与借用检查器",
};

export const indexedResource: IndexedResource = {
  resource_id: 701,
  node_id: 101,
  title: "Rust 官方文档：所有权章节",
  rtype: "markdown",
  source: "ownership.md",
  status: "completed",
  message: null,
  collection_id: "collection-1",
  source_id: "source-1",
};

export const indexedResourceLong: IndexedResource = {
  ...indexedResource,
  resource_id: 702,
  title: "一份名称非常长的参考资料，用于验证资料标题在窄屏与长文本下的换行表现是否仍然可读",
  rtype: "pdf",
  source: "long-name.pdf",
  source_id: "source-2",
};

export const failedResource: IndexedResource = {
  resource_id: 703,
  node_id: 101,
  title: "索引失败的示例资料",
  rtype: "docx",
  source: "broken.docx",
  status: "failed",
  message: "解析失败：文档加密",
  collection_id: null,
  source_id: null,
};
