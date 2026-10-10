import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "../app/page";
import { RoadmapCreation } from "../features/roadmap/RoadmapCreation";
import { ThemeProvider } from "../features/theme/ThemeProvider";
import {
  cancelContentPreparation,
  createProject,
  getContentPreparation,
  getProjectRoadmap,
  getProjectWorkspace,
  listProjects,
  prepareProjectContent,
  previewRoadmap,
  refineRoadmap,
  retryContentPreparation,
} from "../lib/api";
import { contentPreparation, projectCreation, projectSummary, roadmap, roadmapPreview, workspace } from "./fixtures";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    listProjects: vi.fn(),
    getProjectRoadmap: vi.fn(),
    getProjectWorkspace: vi.fn(),
    previewRoadmap: vi.fn(),
    refineRoadmap: vi.fn(),
    createProject: vi.fn(),
    prepareProjectContent: vi.fn(),
    getContentPreparation: vi.fn(),
    cancelContentPreparation: vi.fn(),
    retryContentPreparation: vi.fn(),
  };
});

const pendingPoll = () => new Promise<typeof contentPreparation>(() => {});

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("选题"), "从零学习 Transformer");
  await user.type(screen.getByLabelText("学习背景"), "已有 Python 基础");
  await user.type(screen.getByLabelText("学习目标"), "能实现一个小型模型");
  const hours = screen.getByRole("textbox", { name: "每周投入时间" }) as HTMLInputElement;
  await user.clear(hours);
  await user.type(hours, "12");
}

describe("路线创建", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    vi.mocked(previewRoadmap).mockResolvedValue(roadmapPreview);
    vi.mocked(refineRoadmap).mockResolvedValue({ roadmap: { ...roadmapPreview.roadmap, summary: "Rust 从入门到并发实践（已调整）" } });
    vi.mocked(createProject).mockResolvedValue(projectCreation);
    vi.mocked(prepareProjectContent).mockResolvedValue(contentPreparation);
    vi.mocked(getContentPreparation).mockImplementation(pendingPoll);
    vi.mocked(cancelContentPreparation).mockResolvedValue({ ...contentPreparation, status: "cancelled", cancel_requested: true });
    vi.mocked(retryContentPreparation).mockResolvedValue({ ...contentPreparation, attempts: 2 });
  });

  it("预览路线、按调整指令重生成、保存项目并启动内容准备", async () => {
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<RoadmapCreation onCreated={onCreated} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "生成路线预览" }));

    expect(previewRoadmap).toHaveBeenCalledWith({
      topic: "从零学习 Transformer",
      background: "已有 Python 基础",
      goal: "能实现一个小型模型",
      weekly_hours: 12,
    });
    expect(await screen.findByText("Rust 从入门到并发实践")).toBeTruthy();
    expect(screen.getByText("88 分 · 结构合理")).toBeTruthy();
    expect(screen.getByText("1 个节点")).toBeTruthy();

    await user.type(screen.getByLabelText("调整指令"), "增加一个实操项目");
    await user.click(screen.getByRole("button", { name: "调整" }));

    expect(refineRoadmap).toHaveBeenCalledWith(roadmapPreview.roadmap, "增加一个实操项目");
    expect(await screen.findByText("Rust 从入门到并发实践（已调整）")).toBeTruthy();
    expect((screen.getByLabelText("调整指令") as HTMLInputElement).value).toBe("");

    await user.click(screen.getByRole("button", { name: "确认保存并开始准备" }));

    expect(createProject).toHaveBeenCalledWith({
      topic: "从零学习 Transformer",
      background: "已有 Python 基础",
      goal: "能实现一个小型模型",
      weekly_hours: 12,
      roadmap: { ...roadmapPreview.roadmap, summary: "Rust 从入门到并发实践（已调整）" },
    });
    expect(prepareProjectContent).toHaveBeenCalledWith(9);
    expect(await screen.findByText("课程内容正在准备")).toBeTruthy();
    expect(screen.getByText("已生成 2 节，待处理 1 节，失败 0 节，第 1 次尝试。")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "停止准备" }));
    expect(cancelContentPreparation).toHaveBeenCalledWith(9, 301);
    expect(await screen.findByText("课程内容准备已取消")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "重试未完成内容" }));
    expect(retryContentPreparation).toHaveBeenCalledWith(9, 301);
    expect(await screen.findByText("课程内容正在准备")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "查看新项目" }));
    expect(onCreated).toHaveBeenCalledWith(9);
  });

  it("生成预览期间禁用重复提交并显示状态文字", async () => {
    const releaseRef: { release?: (value: typeof roadmapPreview) => void } = {};
    vi.mocked(previewRoadmap).mockImplementation(() => new Promise((resolve) => { releaseRef.release = resolve; }));
    render(<RoadmapCreation onCreated={vi.fn()} />);
    const user = userEvent.setup();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "生成路线预览" }));

    const submit = screen.getByRole("button", { name: "正在生成" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    await user.click(submit);
    expect(previewRoadmap).toHaveBeenCalledTimes(1);

    releaseRef.release?.(roadmapPreview);
    expect(await screen.findByText("Rust 从入门到并发实践")).toBeTruthy();
  });

  it("预览生成失败时保留已填内容并显示可读错误", async () => {
    vi.mocked(previewRoadmap).mockRejectedValue(new Error("offline"));
    render(<RoadmapCreation onCreated={vi.fn()} />);
    const user = userEvent.setup();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "生成路线预览" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("本地学习服务不可用，请确认 FastAPI 已启动。");
    expect((screen.getByLabelText("选题") as HTMLInputElement).value).toBe("从零学习 Transformer");
    expect((screen.getByRole("textbox", { name: "每周投入时间" }) as HTMLInputElement).value).toBe("12");
    expect((screen.getByRole("button", { name: "生成路线预览" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("保留字段必填、长度与每周投入范围约束", async () => {
    render(<RoadmapCreation onCreated={vi.fn()} />);
    const user = userEvent.setup();

    const topic = screen.getByLabelText("选题") as HTMLInputElement;
    expect(topic.required).toBe(true);
    expect(topic.maxLength).toBe(300);
    expect((screen.getByLabelText("学习背景") as HTMLTextAreaElement).maxLength).toBe(4000);
    expect((screen.getByLabelText("学习目标") as HTMLTextAreaElement).maxLength).toBe(4000);

    const hours = screen.getByRole("textbox", { name: "每周投入时间" }) as HTMLInputElement;
    await user.clear(hours);
    await user.type(hours, "500");
    await user.tab();
    await waitFor(() => expect(hours.value).toBe("168"));

    await user.clear(hours);
    await user.type(hours, "0");
    await user.tab();
    await waitFor(() => expect(hours.value).toBe("1"));
  });

  it("切换主题保留创建表单与预览", async () => {
    vi.mocked(listProjects).mockResolvedValue([projectSummary]);
    vi.mocked(getProjectRoadmap).mockResolvedValue(roadmap);
    vi.mocked(getProjectWorkspace).mockResolvedValue(workspace);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>
    );

    await user.click(await screen.findByRole("button", { name: "新建学习路线" }));
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "生成路线预览" }));
    await screen.findByText("Rust 从入门到并发实践");

    await user.click(screen.getByRole("button", { name: "切换为深色主题" }));
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));

    expect((screen.getByLabelText("选题") as HTMLInputElement).value).toBe("从零学习 Transformer");
    expect((screen.getByRole("textbox", { name: "每周投入时间" }) as HTMLInputElement).value).toBe("12");
    expect(screen.getByText("Rust 从入门到并发实践")).toBeTruthy();
    expect(screen.getByRole("button", { name: "确认保存并开始准备" })).toBeTruthy();
    expect(previewRoadmap).toHaveBeenCalledTimes(1);
  });
});
