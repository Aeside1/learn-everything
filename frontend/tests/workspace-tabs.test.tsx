import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Workspace } from "../features/workspace/Workspace";
import { roadmap, workspace } from "./fixtures";

vi.mock("../features/dashboard/DashboardPanel", () => ({
  DashboardPanel: () => <div data-testid="dashboard-panel">学习概览面板</div>,
}));
vi.mock("../features/roadmap/RoadmapPanel", () => ({
  RoadmapPanel: () => <div data-testid="roadmap-panel">学习路线面板</div>,
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

describe("Workspace Tabs 切换交互", () => {
  it("点击不同的标签页能够正确切换对应的面板", async () => {
    const user = userEvent.setup();
    render(
      <Workspace
        workspace={workspace}
        roadmap={roadmap}
        state="ready"
        error={null}
        statusPendingId={null}
        onRetry={vi.fn()}
        onUpdateStatus={vi.fn().mockResolvedValue(true)}
      />
    );

    // 默认在 dashboard 面板
    expect(screen.getByTestId("dashboard-panel")).toBeTruthy();

    // 点击“学习路线”
    const roadmapTab = screen.getByRole("tab", { name: "学习路线" });
    await user.click(roadmapTab);
    expect(screen.getByTestId("roadmap-panel")).toBeTruthy();

    // 点击“到期复习”
    const reviewTab = screen.getByRole("tab", { name: "到期复习" });
    await user.click(reviewTab);
    expect(screen.getByTestId("review-panel")).toBeTruthy();

    // 点击“RAG 问答”
    const ragTab = screen.getByRole("tab", { name: "RAG 问答" });
    await user.click(ragTab);
    expect(screen.getByTestId("rag-panel")).toBeTruthy();

    // 点击“查漏测验”
    const quizTab = screen.getByRole("tab", { name: "查漏测验" });
    await user.click(quizTab);
    expect(screen.getByTestId("quiz-panel")).toBeTruthy();

    // 点击“模型配置”
    const modelsTab = screen.getByRole("tab", { name: "模型配置" });
    await user.click(modelsTab);
    expect(screen.getByTestId("models-panel")).toBeTruthy();
  });
});
