import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "../app/page";
import { ProjectEditDialog } from "../features/projects/ProjectEditDialog";
import { ProjectRail } from "../features/projects/ProjectRail";
import { ThemeProvider, useTheme } from "../features/theme/ThemeProvider";
import { getDashboard, getProjectRoadmap, getProjectWorkspace, listProjects } from "../lib/api";
import { projectSummary, roadmap, workspace } from "./fixtures";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, listProjects: vi.fn(), getProjectRoadmap: vi.fn(), getProjectWorkspace: vi.fn(), getDashboard: vi.fn() };
});

const jsProject = { ...projectSummary, id: 2, title: "JS 学习", topic: "学习 JS" };
const emptyDashboard = { project_id: 1, projects: [], metrics: { total_nodes: 1, mastered_nodes: 0, avg_mastery: 0, week_minutes: 0, due_cards: 0, total_cards: 0 }, status_counts: { pending: 1 }, heatmap: [], latest_report: "" };

function renderRail() {
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <ProjectRail
        projects={[projectSummary]}
        selectedId={1}
        state="ready"
        error={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    </ThemeProvider>
  );
  return user;
}

function rootThemeState() {
  return {
    dark: document.documentElement.classList.contains("dark"),
    attribute: document.documentElement.getAttribute("data-theme"),
  };
}

describe("浅色/深色主题切换", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
  });

  it("切换按钮同时驱动根主题状态、可访问名称与偏好持久化", async () => {
    const user = renderRail();
    expect(await screen.findByRole("button", { name: "切换为深色主题" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "切换为深色主题" }));
    await waitFor(() => expect(rootThemeState()).toEqual({ dark: true, attribute: "dark" }));
    expect(localStorage.getItem("learn_everything_theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "切换为浅色主题" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "切换为浅色主题" }));
    await waitFor(() => expect(rootThemeState()).toEqual({ dark: false, attribute: "light" }));
    expect(localStorage.getItem("learn_everything_theme")).toBe("light");
    expect(screen.getByRole("button", { name: "切换为深色主题" })).toBeTruthy();
  });

  it("重新加载后按已保存主题呈现", async () => {
    localStorage.setItem("learn_everything_theme", "dark");
    renderRail();
    await waitFor(() => expect(rootThemeState()).toEqual({ dark: true, attribute: "dark" }));
    expect(screen.getByRole("button", { name: "切换为浅色主题" })).toBeTruthy();
  });

  it("存储不可用时界面仍可切换", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    const user = renderRail();
    await user.click(await screen.findByRole("button", { name: "切换为深色主题" }));
    await waitFor(() => expect(rootThemeState()).toEqual({ dark: true, attribute: "dark" }));
    setItem.mockRestore();
  });

  it("主题切换不重置当前项目和已选标签", async () => {
    vi.mocked(listProjects).mockResolvedValue([projectSummary, jsProject]);
    vi.mocked(getProjectRoadmap).mockImplementation(async (projectId) => ({ ...roadmap, project_id: projectId }));
    vi.mocked(getProjectWorkspace).mockImplementation(async (projectId) => ({ ...workspace, project: { ...workspace.project, id: projectId, title: projectId === 2 ? "JS 学习" : "学习 Rust" } }));
    vi.mocked(getDashboard).mockResolvedValue(emptyDashboard);

    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>
    );
    await screen.findByRole("heading", { name: "学习 Rust", level: 2 });
    await user.click(screen.getByRole("button", { name: "JS 学习 学习 JS 0/1 已完成" }));
    await screen.findByRole("heading", { name: "JS 学习", level: 2 });
    await user.click(screen.getByRole("tab", { name: "到期复习" }));

    await user.click(screen.getByRole("button", { name: "切换为深色主题" }));

    await waitFor(() => expect(rootThemeState()).toEqual({ dark: true, attribute: "dark" }));
    expect(screen.getByRole("heading", { name: "JS 学习", level: 2 })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "到期复习" }).getAttribute("aria-selected")).toBe("true");
    expect(getProjectWorkspace).toHaveBeenCalledTimes(2);
  });

  it("弹窗打开时切换主题保留未提交草稿", async () => {
    let applyTheme: ((theme: "light" | "dark") => void) | null = null;
    function ThemeDriver() {
      const { setTheme } = useTheme();
      applyTheme = setTheme;
      return null;
    }
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDriver />
        <ProjectEditDialog
          project={workspace.project}
          saving={false}
          error={null}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </ThemeProvider>
    );

    await user.clear(screen.getByDisplayValue("学习 Rust"));
    await user.type(screen.getByLabelText("项目名称"), "Rust 深色草稿");

    act(() => applyTheme?.("dark"));

    await waitFor(() => expect(rootThemeState()).toEqual({ dark: true, attribute: "dark" }));
    expect(screen.getByDisplayValue("Rust 深色草稿")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "编辑学习项目" })).toBeTruthy();
  });
});
