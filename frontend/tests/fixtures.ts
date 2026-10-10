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

export const dashboard: Dashboard = {
  project_id: 1,
  projects: [{ label: "学习 Rust", id: 1 }],
  metrics: { total_nodes: 4, mastered_nodes: 1, avg_mastery: 0.42, week_minutes: 185, due_cards: 2, total_cards: 7 },
  status_counts: { pending: 1, learning: 1, mastered: 1, weak: 1 },
  heatmap: [
    { date: "2026-09-01", minutes: 0 },
    { date: "2026-09-02", minutes: 45 },
  ],
  latest_report: "今天完成了所有权章节的复习。",
};

export const reviewCardFirst: ReviewCard = {
  id: 501,
  node_id: 101,
  project_id: 1,
  front: "为什么所有权规则能在编译期防止 use-after-free？",
  back: "因为每个值只有一个所有者，所有权转移后原变量失效。",
  card_type: "concept",
  state: 1,
  reps: 3,
  next_review: "2026-09-25T09:00:00",
};

export const reviewCardNext: ReviewCard = {
  id: 502,
  node_id: 103,
  project_id: 1,
  front: "? 运算符在返回 Result 的函数中做了什么？",
  back: "遇到 Err 时提前返回该错误，遇到 Ok 时取出内部值继续执行。",
  card_type: "concept",
  state: 1,
  reps: 1,
  next_review: "2026-09-26T09:00:00",
};

export const dueCards: DueCards = { cards: [reviewCardFirst], project_id: 1 };

export const quizGeneration: QuizGeneration = {
  quiz_id: 401,
  project_id: 1,
  title: "所有权测验",
  quiz_type: "choice",
  questions: [
    { id: 901, node_id: 101, qtype: "choice", stem: "以下哪种写法可以在不转移所有权的前提下读取 String 的长度？", options: ["let n = s.len();", "let t = s; let n = t.len();"], difficulty: 2 },
    { id: 902, node_id: 101, qtype: "short", stem: "请用自己的话解释生命周期标注解决的核心问题。", options: [], difficulty: 3 },
  ],
};

export const quizAnswer: QuizAnswer = { attempt_id: 1001, question_id: 901, node_id: 101, is_correct: true, feedback: "回答正确：借用检查器只要求不可变借用。", mastery: 0.75 };

import type { Dashboard, DueCards, QuizAnswer, QuizGeneration, ReviewCard } from "../lib/api";
