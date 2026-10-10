import type { ContentPreparation, NodeDetail, ProjectCreation, ProjectRoadmap, ProjectSummary, ProjectWorkspace, RoadmapPreview } from "../lib/api";

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

export const richLessonMarkdown = [
  "## 所有权规则",
  "",
  "Rust 的每个值在同一时间只有一个所有者，所有权离开作用域时值被释放。",
  "",
  "> 借用检查器在编译期拒绝悬垂引用与数据竞争。",
  "",
  "| 场景 | 是否允许 |",
  "| --- | --- |",
  "| 多个不可变借用同时存在 | 允许 |",
  "| 可变借用与不可变借用并存 | 禁止 |",
  "",
  "```rust",
  "fn main() {",
  '    let s = String::from("ownership");',
  '    println!("{}", s.len());',
  "}",
  "```",
  "",
  "参考 [Rust Book](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。",
].join("\n");

export const richLessonDetail: NodeDetail = {
  ...nodeDetail,
  title: "所有权与借用检查器：一个用于验证窄屏换行与长内容滚动的知识点标题",
  has_content: true,
  description: richLessonMarkdown,
  practice: {
    id: 801,
    title: "所有权实操",
    description: ["### 实操步骤", "", "1. 阅读示例代码", "2. 运行测试", "", "| 输入 | 期望 |", "| --- | --- |", "| 移动后使用 | 编译错误 |"].join("\n"),
    status: "ready",
  },
  resources: [
    { id: 901, title: "Rust Book", url: "https://doc.rust-lang.org/book/", rtype: "web", description: "官方文档", preview: "", source: "manual" },
    { id: 902, title: "一份名称很长的参考资料，用于验证长标题在窄屏下的换行表现", url: "https://example.test/long-reference", rtype: "pdf", description: "", preview: "", source: "upload" },
  ],
};

export const roadmapPreview: RoadmapPreview = {
  roadmap: { summary: "Rust 从入门到并发实践", stages: [{ name: "基础" }], nodes: [{ ...workspaceNode, prerequisites: [] }] },
  audit: { score: 88, verdict: "结构合理", problems: [], changes: ["补充了并发章节"] },
};

export const contentPreparation: ContentPreparation = {
  job_id: 301,
  project_id: 9,
  generated_node_ids: [101, 102],
  failed_node_ids: [],
  pending_node_ids: [103],
  status: "doing",
  attempts: 1,
  error: null,
  cancel_requested: false,
};

export const projectCreation: ProjectCreation = {
  project_id: 9,
  title: "从零学习 Transformer",
  node_count: 3,
  environment_status: "ready",
  environment_error: null,
};
