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

function renderWorkspace() {
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
  return user;
}

describe("Workspace Tabs 切换交互", () => {
  it("默认进入学习概览，点击标签切换对应面板", async () => {
    const user = renderWorkspace();

    expect(screen.getByTestId("dashboard-panel")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "学习概览" }).getAttribute("aria-selected")).toBe("true");

    await user.click(screen.getByRole("tab", { name: "学习路线" }));
    expect(screen.getByTestId("roadmap-panel")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "到期复习" }));
    expect(screen.getByTestId("review-panel")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "RAG 问答" }));
    expect(screen.getByTestId("rag-panel")).toBeTruthy();
    expect(screen.getByTestId("resources-panel")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "查漏测验" }));
    expect(screen.getByTestId("quiz-panel")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "模型配置" }));
    expect(screen.getByTestId("models-panel")).toBeTruthy();
  });

  it("标签与面板具备可访问关联，且只选中一个", async () => {
    renderWorkspace();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    expect(tabs.filter((tab) => tab.getAttribute("aria-selected") === "true")).toHaveLength(1);

    const panel = screen.getByRole("tabpanel");
    const labelledBy = panel.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const label = document.getElementById(labelledBy!);
    expect(label?.getAttribute("role")).toBe("tab");
    expect(label?.textContent).toBe("学习概览");
  });

  it("键盘方向键可以切换标签", async () => {
    const user = renderWorkspace();

    screen.getByRole("tab", { name: "学习概览" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "学习路线" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("roadmap-panel")).toBeTruthy();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "到期复习" }).getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "学习路线" }).getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "模型配置" }).getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "学习概览" }).getAttribute("aria-selected")).toBe("true");
  });

  it("路线标签之外的面板不参与渲染，路线面板保持挂载以保留详情状态", () => {
    renderWorkspace();

    expect(screen.getByTestId("roadmap-panel")).toBeTruthy();
    expect(screen.queryByTestId("review-panel")).toBeNull();
    expect(screen.queryByTestId("quiz-panel")).toBeNull();
  });
});
