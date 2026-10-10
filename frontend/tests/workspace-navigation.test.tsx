import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Workspace } from "../features/workspace/Workspace";
import { getNodeDetail } from "../lib/api";
import { nodeDetail, roadmap, workspace } from "./fixtures";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, getNodeDetail: vi.fn(), generateNodeContent: vi.fn(), generateNodeResources: vi.fn(), generatePracticeLesson: vi.fn(), saveNodeNote: vi.fn() };
});

vi.mock("../features/dashboard/DashboardPanel", () => ({
  DashboardPanel: () => <div data-testid="dashboard-panel">学习概览面板</div>,
}));
vi.mock("../features/review/ReviewPanel", () => ({
  ReviewPanel: () => <div data-testid="review-panel">到期复习面板</div>,
}));
vi.mock("../features/chat/RagChatPanel", () => ({
  RagChatPanel: () => <div data-testid="rag-panel">RAG 问答面板</div>,
}));
vi.mock("../features/resources/ResourceLibraryPanel", () => ({
  ResourceLibraryPanel: () => <div data-testid="resources-panel">资源库面板</div>,
}));
vi.mock("../features/quiz/QuizPanel", () => ({
  QuizPanel: () => <div data-testid="quiz-panel">查漏测验面板</div>,
}));
vi.mock("../features/configuration/ModelConfigurationPanel", () => ({
  ModelConfigurationPanel: () => <div data-testid="models-panel">模型配置面板</div>,
}));

const baseProps = {
  state: "ready" as const,
  error: null,
  statusPendingId: null,
  onRetry: vi.fn(),
  onUpdateStatus: vi.fn().mockResolvedValue(true),
};

const fixturesWorkspace = { ...workspace, progress: { total: 4, done: 2, learning: 1, weak: 1, pending: 0, skipped: 0, pct: 50 } };
const fixturesRoadmap = roadmap;

describe("工作区进度与状态", () => {
  it("进度显示完成比例、总数与状态计数", () => {
    render(<Workspace {...baseProps} workspace={fixturesWorkspace} roadmap={fixturesRoadmap} />);

    const progressbar = screen.getByRole("progressbar", { name: "学习进度" });
    expect(progressbar.getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByText("50% 已完成")).toBeTruthy();
    expect(screen.getByLabelText("项目进度 2/4")).toBeTruthy();
    expect(screen.getByText("1 个学习中")).toBeTruthy();
    expect(screen.getByText("1 个待巩固")).toBeTruthy();
  });

  it("零知识点时给出可读说明而不是 0% 完成", () => {
    const emptyWorkspace = { ...fixturesWorkspace, progress: { total: 0, done: 0, learning: 0, pending: 0, weak: 0, skipped: 0, pct: 0 }, nodes: [] };
    render(<Workspace {...baseProps} workspace={emptyWorkspace} roadmap={null} />);

    expect(screen.getByText("暂无知识点，保存路线后开始学习")).toBeTruthy();
    expect(screen.getByLabelText("项目进度 0/0")).toBeTruthy();
  });

  it("读取中显示进度指示并标记忙碌", () => {
    render(<Workspace {...baseProps} state="loading" workspace={null} roadmap={null} />);

    expect(screen.getByLabelText("正在加载学习工作台")).toBeTruthy();
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
  });

  it("加载失败显示错误内容并支持重试", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<Workspace {...baseProps} state="error" error="无法连接本地学习服务，请确认 FastAPI 已启动。" workspace={null} roadmap={null} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("项目数据暂时不可用")).toBeTruthy();
    expect(screen.getByText("无法连接本地学习服务，请确认 FastAPI 已启动。")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "重新加载" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("没有选中项目时提示选择项目", () => {
    render(<Workspace {...baseProps} state="ready" workspace={null} roadmap={null} />);

    expect(screen.getByText("选择一个项目")).toBeTruthy();
  });

  it("离开路线标签再返回时保留当前节点详情", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    const user = userEvent.setup();
    render(<Workspace {...baseProps} workspace={fixturesWorkspace} roadmap={fixturesRoadmap} />);

    await user.click(screen.getByRole("tab", { name: "学习路线" }));
    await user.click(screen.getByRole("button", { name: "查看 所有权 的详细内容" }));
    await screen.findByText("LESSON DETAIL / 课程详情");

    await user.click(screen.getByRole("tab", { name: "查漏测验" }));
    await user.click(screen.getByRole("tab", { name: "学习路线" }));

    expect(screen.getByText("LESSON DETAIL / 课程详情")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "查看 所有权 的详细内容" })).toBeNull();
  });
});
