import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RoadmapPanel } from "../features/roadmap/RoadmapPanel";
import { ThemeProvider, useTheme } from "../features/theme/ThemeProvider";
import { generateNodeContent, getNodeDetail, saveNodeNote } from "../lib/api";
import { nodeDetail, richLessonDetail, roadmap, workspaceNode } from "./fixtures";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, getNodeDetail: vi.fn(), generateNodeContent: vi.fn(), generateNodeResources: vi.fn(), generatePracticeLesson: vi.fn(), saveNodeNote: vi.fn() };
});

const baseProps = { roadmap, nodes: [workspaceNode], statusPendingId: null, onUpdateStatus: vi.fn().mockResolvedValue(true) };

function statusRadio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLButtonElement;
}

async function openDetail(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "查看 所有权 的详细内容" }));
  await screen.findByText("LESSON DETAIL / 课程详情");
}

describe("RoadmapPanel", () => {
  it("从路线列表进入详情并返回", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    const user = userEvent.setup();
    render(<RoadmapPanel {...baseProps} />);
    await openDetail(user);
    await user.click(screen.getByRole("button", { name: "返回学习路线" }));
    expect(screen.getByRole("button", { name: "查看 所有权 的详细内容" })).toBeTruthy();
  });

  it("节点状态控件保留四个可访问状态并回传所选状态", async () => {
    const onUpdateStatus = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<RoadmapPanel {...baseProps} onUpdateStatus={onUpdateStatus} />);

    for (const label of ["待开始", "学习中", "已掌握", "需复习"]) {
      expect(statusRadio(label)).toBeTruthy();
    }
    expect(statusRadio("待开始").getAttribute("aria-checked")).toBe("true");
    expect(statusRadio("已掌握").getAttribute("aria-checked")).toBe("false");

    await user.click(statusRadio("已掌握"));
    expect(onUpdateStatus).toHaveBeenCalledWith(workspaceNode, "mastered");
  });

  it("状态提交中禁用全部状态按钮", () => {
    render(<RoadmapPanel {...baseProps} statusPendingId={workspaceNode.id} />);
    for (const label of ["待开始", "学习中", "已掌握", "需复习"]) {
      expect(statusRadio(label).disabled).toBe(true);
    }
  });

  it("详情状态更新失败时回滚乐观状态", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    const releaseRef: { release?: (value: boolean) => void } = {};
    const onUpdateStatus = vi.fn(() => new Promise<boolean>((resolve) => { releaseRef.release = resolve; }));
    const user = userEvent.setup();
    render(<RoadmapPanel {...baseProps} onUpdateStatus={onUpdateStatus} />);
    await openDetail(user);

    await user.click(statusRadio("已掌握"));
    expect(statusRadio("已掌握").getAttribute("aria-checked")).toBe("true");

    releaseRef.release?.(false);
    await waitFor(() => expect(statusRadio("待开始").getAttribute("aria-checked")).toBe("true"));
    expect(onUpdateStatus).toHaveBeenCalledWith(nodeDetail, "mastered");
  });

  it("详情生成失败时展示操作错误", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    vi.mocked(generateNodeContent).mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<RoadmapPanel {...baseProps} />);
    await openDetail(user);
    await user.click(screen.getByRole("button", { name: "生成课程" }));
    await screen.findByText("无法连接本地学习服务，请确认 FastAPI 已启动。");
  });

  it("生成课程期间显示状态文字并禁止冲突操作", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    const releaseRef: { release?: (value: Awaited<ReturnType<typeof generateNodeContent>>) => void } = {};
    vi.mocked(generateNodeContent).mockImplementation(() => new Promise((resolve) => { releaseRef.release = resolve; }));
    const user = userEvent.setup();
    render(<RoadmapPanel {...baseProps} />);
    await openDetail(user);

    await user.click(screen.getByRole("button", { name: "生成课程" }));

    expect(await screen.findByText("正在生成课程内容…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "生成课程" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "生成实操" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "拉取资料" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "保存笔记" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("textbox", { name: "学习笔记" }) as HTMLTextAreaElement).disabled).toBe(true);

    releaseRef.release?.({ node_id: 101, project_id: 1, status: "ready", detail: { ...nodeDetail, has_content: true } });
    await waitFor(() => expect((screen.getByRole("button", { name: "重新生成课程" }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByText("正在生成课程内容…")).toBeNull();
  });

  it("保存笔记提交当前草稿，失败时保留草稿并显示错误", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    vi.mocked(saveNodeNote).mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<RoadmapPanel {...baseProps} />);
    await openDetail(user);

    const note = screen.getByRole("textbox", { name: "学习笔记" }) as HTMLTextAreaElement;
    expect(note.value).toBe("原笔记");
    await user.clear(note);
    await user.type(note, "借用检查器笔记");
    await user.click(screen.getByRole("button", { name: "保存笔记" }));

    expect(saveNodeNote).toHaveBeenCalledWith(101, "借用检查器笔记");
    expect((await screen.findByRole("alert")).textContent).toContain("无法连接本地学习服务，请确认 FastAPI 已启动。");
    expect((screen.getByRole("textbox", { name: "学习笔记" }) as HTMLTextAreaElement).value).toBe("借用检查器笔记");
  });

  it("保存笔记成功后采用服务端返回的笔记", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    vi.mocked(saveNodeNote).mockResolvedValue({ node_id: 101, project_id: 1, note: { id: 1, content: "已保存的笔记", selection: "", updated_at: "" }, detail: { ...nodeDetail, note: { id: 1, content: "已保存的笔记", selection: "", updated_at: "" } } });
    const user = userEvent.setup();
    render(<RoadmapPanel {...baseProps} />);
    await openDetail(user);

    const note = screen.getByRole("textbox", { name: "学习笔记" }) as HTMLTextAreaElement;
    await user.clear(note);
    await user.type(note, "已保存的笔记");
    await user.click(screen.getByRole("button", { name: "保存笔记" }));

    await waitFor(() => expect((screen.getByRole("textbox", { name: "学习笔记" }) as HTMLTextAreaElement).value).toBe("已保存的笔记"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("课程与实操 Markdown 的标题、代码、表格、引用和资料链接保持可读结构", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(richLessonDetail);
    const user = userEvent.setup();
    const { container } = render(<RoadmapPanel {...baseProps} nodes={[{ ...workspaceNode, title: richLessonDetail.title, has_content: true }]} />);
    await user.click(screen.getByRole("button", { name: `查看 ${richLessonDetail.title} 的详细内容` }));
    await screen.findByText("LESSON DETAIL / 课程详情");

    expect(screen.getByRole("heading", { name: "所有权规则", level: 2 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "实操步骤", level: 3 })).toBeTruthy();
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getByText("可变借用与不可变借用并存")).toBeTruthy();
    expect(container.querySelector("blockquote")?.textContent).toContain("借用检查器在编译期拒绝悬垂引用与数据竞争。");
    expect(container.querySelector("pre")?.textContent).toContain("println!");
    const rustBookLinks = screen.getAllByRole("link", { name: /Rust Book/ });
    expect(rustBookLinks).toHaveLength(2);
    expect(rustBookLinks[0].getAttribute("href")).toContain("ch04-00-understanding-ownership");
    expect(screen.getByRole("link", { name: /一份名称很长的参考资料/ }).getAttribute("href")).toBe("https://example.test/long-reference");
  });

  it("切换主题保留当前节点详情与笔记草稿", async () => {
    vi.mocked(getNodeDetail).mockResolvedValue(nodeDetail);
    const themeRef: { apply?: (theme: "light" | "dark") => void } = {};
    function ThemeDriver() {
      const { setTheme } = useTheme();
      themeRef.apply = setTheme;
      return null;
    }
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDriver />
        <RoadmapPanel {...baseProps} />
      </ThemeProvider>
    );
    await openDetail(user);

    const note = screen.getByRole("textbox", { name: "学习笔记" }) as HTMLTextAreaElement;
    await user.clear(note);
    await user.type(note, "深色下的笔记草稿");

    const loadsBefore = vi.mocked(getNodeDetail).mock.calls.length;
    themeRef.apply?.("dark");

    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(screen.getByText("LESSON DETAIL / 课程详情")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "学习笔记" }) as HTMLTextAreaElement).value).toBe("深色下的笔记草稿");
    expect(vi.mocked(getNodeDetail).mock.calls.length).toBe(loadsBefore);
  });
});
