import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RagChatPanel } from "../features/chat/RagChatPanel";
import { ResourceLibraryPanel } from "../features/resources/ResourceLibraryPanel";
import { ThemeProvider, useTheme } from "../features/theme/ThemeProvider";
import {
  ApiError,
  deleteNodeResource,
  getResourceDeletionPreview,
  listNodeResources,
  streamRagChat,
  streamResourceUpload,
  type RagStreamEvent,
  type ResourceUploadEvent,
} from "../lib/api";
import { failedResource, indexedResource, indexedResourceLong, secondWorkspaceNode, workspaceNode } from "./fixtures";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    listNodeResources: vi.fn(),
    streamResourceUpload: vi.fn(),
    getResourceDeletionPreview: vi.fn(),
    deleteNodeResource: vi.fn(),
    streamRagChat: vi.fn(),
  };
});

const nodes = [workspaceNode, secondWorkspaceNode];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function uploadStream() {
  let emit: ((event: ResourceUploadEvent) => void) | null = null;
  const pending = deferred<void>();
  vi.mocked(streamResourceUpload).mockImplementation((_nodeId, _file, onEvent) => {
    emit = onEvent;
    return pending.promise;
  });
  return {
    push: (event: Partial<ResourceUploadEvent> & { kind: ResourceUploadEvent["kind"] }) => act(() => {
      emit?.({ resource_id: 704, node_id: 101, collection_id: "collection-1", message: null, source_id: null, ...event });
    }),
    finish: () => act(() => { pending.resolve(); }),
    fail: (error: unknown) => act(() => { pending.reject(error); }),
  };
}

function ragStream() {
  const payloads: Array<Parameters<typeof streamRagChat>[0]> = [];
  const signals: AbortSignal[] = [];
  let emit: ((event: RagStreamEvent) => void) | null = null;
  const pending = deferred<void>();
  vi.mocked(streamRagChat).mockImplementation((payload, signal, onEvent) => {
    payloads.push(payload);
    signals.push(signal);
    emit = onEvent;
    return pending.promise;
  });
  return {
    payloads,
    signals,
    push: (event: Partial<RagStreamEvent> & { kind: RagStreamEvent["kind"] }) => act(() => {
      emit?.({ text: null, excerpts: [], metadata: {}, ...event });
    }),
    finish: () => act(() => { pending.resolve(); }),
    fail: (error: unknown) => act(() => { pending.reject(error); }),
  };
}

function abortableRagStream() {
  vi.mocked(streamRagChat).mockImplementation((_payload, signal, onEvent) => new Promise<void>((_resolve, reject) => {
    onEvent({ kind: "answer_delta", text: "部分回答", excerpts: [], metadata: {} });
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
}

describe("资料库", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listNodeResources).mockResolvedValue([indexedResource]);
    vi.mocked(getResourceDeletionPreview).mockResolvedValue({ resource: indexedResource, confirmation_phrase: "删除 701", index_delete_required: true });
  });

  it("选择文件后上传，逐步显示索引进度并刷新资料列表", async () => {
    const stream = uploadStream();
    const user = userEvent.setup();
    render(<ResourceLibraryPanel nodes={nodes} />);
    await screen.findByText("Rust 官方文档：所有权章节");

    const file = new File(["资料正文"], "ownership.md", { type: "text/markdown" });
    const fileInput = screen.getByLabelText("本地文件") as HTMLInputElement;
    expect(fileInput.getAttribute("accept")).toBe(".txt,.md,.pdf,.docx,.html");
    await user.upload(fileInput, file);
    await user.click(screen.getByRole("button", { name: "上传并索引" }));

    await waitFor(() => expect(streamResourceUpload).toHaveBeenCalledTimes(1));
    expect(vi.mocked(streamResourceUpload).mock.calls[0][0]).toBe(101);
    expect(vi.mocked(streamResourceUpload).mock.calls[0][1]).toBe(file);

    stream.push({ kind: "started", message: "正在解析文档" });
    expect(await screen.findByText("正在解析文档")).toBeTruthy();

    const submit = screen.getByRole("button", { name: "上传并索引" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect((screen.getByLabelText("本地文件") as HTMLInputElement).disabled).toBe(true);
    const nodeTrigger = screen.getByRole("button", { name: /知识点/ });
    expect(nodeTrigger.hasAttribute("disabled") || nodeTrigger.getAttribute("aria-disabled") === "true").toBe(true);
    await user.click(submit);
    expect(streamResourceUpload).toHaveBeenCalledTimes(1);

    stream.push({ kind: "progress", message: "已切分 12 个片段" });
    expect(await screen.findByText("已切分 12 个片段")).toBeTruthy();

    stream.finish();
    await waitFor(() => expect(listNodeResources).toHaveBeenCalledTimes(2));
    await waitFor(() => expect((screen.getByRole("button", { name: "上传并索引" }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByLabelText("本地文件") as HTMLInputElement).value).toBe("");
  });

  it("上传失败显示明确错误并允许重试", async () => {
    const stream = uploadStream();
    const user = userEvent.setup();
    render(<ResourceLibraryPanel nodes={nodes} />);
    await screen.findByText("Rust 官方文档：所有权章节");
    await user.upload(screen.getByLabelText("本地文件"), new File(["正文"], "ownership.md", { type: "text/markdown" }));
    await user.click(screen.getByRole("button", { name: "上传并索引" }));
    await waitFor(() => expect(streamResourceUpload).toHaveBeenCalledTimes(1));

    stream.fail(new ApiError(500, "索引服务不可用"));
    expect(await screen.findByText("索引服务不可用")).toBeTruthy();

    await waitFor(() => expect((screen.getByRole("button", { name: "上传并索引" }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole("button", { name: "上传并索引" }));
    await waitFor(() => expect(streamResourceUpload).toHaveBeenCalledTimes(2));
  });

  it("未选择文件时给出提示且不发起上传", async () => {
    vi.mocked(streamResourceUpload).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResourceLibraryPanel nodes={nodes} />);
    await screen.findByText("Rust 官方文档：所有权章节");
    await user.click(screen.getByRole("button", { name: "上传并索引" }));
    expect(await screen.findByText("请选择一个知识点和资料文件")).toBeTruthy();
    expect(streamResourceUpload).not.toHaveBeenCalled();
  });

  it("删除只在精确匹配后端确认词后可提交，失败保留输入与错误", async () => {
    vi.mocked(deleteNodeResource).mockRejectedValue(new ApiError(400, "确认词不正确"));
    const user = userEvent.setup();
    render(<ResourceLibraryPanel nodes={nodes} />);
    await screen.findByText("Rust 官方文档：所有权章节");

    await user.click(screen.getByRole("button", { name: "删除 Rust 官方文档：所有权章节" }));
    expect(await screen.findByText("输入“删除 701”确认删除该资料索引。")).toBeTruthy();

    const confirmButton = () => screen.getByRole("button", { name: "确认删除" }) as HTMLButtonElement;
    const phraseInput = () => screen.getByLabelText("删除确认词") as HTMLInputElement;
    expect(confirmButton().disabled).toBe(true);

    await user.type(phraseInput(), "删除 70");
    expect(confirmButton().disabled).toBe(true);
    await user.clear(phraseInput());
    await user.type(phraseInput(), "删除 701");
    expect(confirmButton().disabled).toBe(false);

    await user.click(confirmButton());
    expect(await screen.findByText("确认词不正确")).toBeTruthy();
    expect(deleteNodeResource).toHaveBeenCalledWith(101, 701, "删除 701");
    expect(phraseInput().value).toBe("删除 701");
    await waitFor(() => expect(confirmButton().disabled).toBe(false));
  });

  it("删除提交中禁止重复确认或取消", async () => {
    const deleting = deferred<{ resource_id: number; index_deleted: boolean }>();
    vi.mocked(deleteNodeResource).mockReturnValue(deleting.promise);
    const user = userEvent.setup();
    render(<ResourceLibraryPanel nodes={nodes} />);
    await screen.findByText("Rust 官方文档：所有权章节");
    await user.click(screen.getByRole("button", { name: "删除 Rust 官方文档：所有权章节" }));
    await user.type(await screen.findByLabelText("删除确认词"), "删除 701");
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect((screen.getByRole("button", { name: "取消" }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole("button", { name: "确认删除" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("删除确认词") as HTMLInputElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(deleteNodeResource).toHaveBeenCalledTimes(1);

    deleting.resolve({ resource_id: 701, index_deleted: true });
    await waitFor(() => expect(listNodeResources).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/确认删除该资料索引/)).toBeNull());
  });

  it("删除准备失败时显示错误且不进入确认", async () => {
    vi.mocked(getResourceDeletionPreview).mockRejectedValue(new ApiError(503, "无法准备删除资料"));
    const user = userEvent.setup();
    render(<ResourceLibraryPanel nodes={nodes} />);
    await screen.findByText("Rust 官方文档：所有权章节");
    await user.click(screen.getByRole("button", { name: "删除 Rust 官方文档：所有权章节" }));
    expect(await screen.findByText("无法准备删除资料")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "确认删除" })).toBeNull();
  });
});

describe("RAG 问答", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listNodeResources).mockResolvedValue([indexedResource, indexedResourceLong, failedResource]);
  });

  async function renderPanel() {
    const user = userEvent.setup();
    render(<RagChatPanel nodes={nodes} />);
    await screen.findByRole("checkbox", { name: indexedResource.title });
    return user;
  }

  it("默认勾选同集合的已索引资料，并只把已选资料作为提问范围", async () => {
    const stream = ragStream();
    const user = await renderPanel();

    const failed = screen.queryByRole("checkbox", { name: failedResource.title });
    expect(failed).toBeNull();
    const longCheckbox = screen.getByRole("checkbox", { name: indexedResourceLong.title }) as HTMLInputElement;
    expect((screen.getByRole("checkbox", { name: indexedResource.title }) as HTMLInputElement).checked).toBe(true);
    expect(longCheckbox.checked).toBe(true);

    await user.click(longCheckbox);
    expect(longCheckbox.checked).toBe(false);

    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));

    await waitFor(() => expect(streamRagChat).toHaveBeenCalledTimes(1));
    expect(stream.payloads[0].collection_id).toBe("collection-1");
    expect(stream.payloads[0].message).toBe("所有权规则是什么");
    expect(stream.payloads[0].file_ids).toEqual(["source-1"]);
    expect(stream.payloads[0].history).toEqual([]);
    expect(typeof stream.payloads[0].conversation_id).toBe("string");
  });

  it("流式回答逐步呈现并附带引用", async () => {
    const stream = ragStream();
    const user = await renderPanel();
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));
    await waitFor(() => expect(streamRagChat).toHaveBeenCalledTimes(1));

    stream.push({ kind: "evidence", excerpts: [{ source_id: "source-1", text: "所有权规则在编译期检查。", score: 0.8, metadata: { file_name: "ownership.md" } }] });
    stream.push({ kind: "answer_delta", text: "Rust 通过" });
    expect(await screen.findByText("Rust 通过")).toBeTruthy();
    expect(screen.queryByText("Rust 通过所有权与借用在编译期排除悬垂引用。")).toBeNull();

    stream.push({ kind: "answer_delta", text: "所有权与借用" });
    stream.push({ kind: "answer_delta", text: "在编译期排除悬垂引用。" });
    expect(await screen.findByText("Rust 通过所有权与借用在编译期排除悬垂引用。")).toBeTruthy();
    expect(screen.getByText("所有权规则在编译期检查。")).toBeTruthy();

    const citation = screen.getByRole("button", { name: "ownership.md" });
    expect(citation.getAttribute("aria-expanded")).toBe("false");
    await user.click(citation);
    expect(citation.getAttribute("aria-expanded")).toBe("true");

    stream.finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "提问" })).toBeTruthy());
    expect((screen.getByLabelText("问题") as HTMLTextAreaElement).value).toBe("");
  });

  it("未选中任何资料时提问给出反馈且不发起请求", async () => {
    const user = await renderPanel();
    await user.click(screen.getByRole("checkbox", { name: indexedResource.title }));
    await user.click(screen.getByRole("checkbox", { name: indexedResourceLong.title }));
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));

    expect(await screen.findByText("请选择至少一份已完成索引的资料后再提问")).toBeTruthy();
    expect(streamRagChat).not.toHaveBeenCalled();
    expect((screen.getByLabelText("问题") as HTMLTextAreaElement).value).toBe("所有权规则是什么");
  });

  it("没有可问答资料时禁用提问并提示先上传", async () => {
    vi.mocked(listNodeResources).mockResolvedValue([failedResource]);
    render(<RagChatPanel nodes={nodes} />);
    expect(await screen.findByText("请先在资料库上传并完成索引。")).toBeTruthy();
    expect((screen.getByRole("button", { name: "提问" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("范围读取失败时给出明确提示", async () => {
    vi.mocked(listNodeResources).mockRejectedValue(new ApiError(503, "服务暂不可用"));
    render(<RagChatPanel nodes={nodes} />);
    expect(await screen.findByText("服务暂不可用")).toBeTruthy();
    expect(screen.getByText("请先在资料库上传并完成索引。")).toBeTruthy();
  });

  it("停止中断当前请求并保留已到达的回答", async () => {
    abortableRagStream();
    const user = await renderPanel();
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));

    expect(await screen.findByText("部分回答")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "停止" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "提问" })).toBeTruthy());
    expect(screen.getByText("部分回答")).toBeTruthy();
    expect(screen.queryByText("知识问答连接中断")).toBeNull();
  });

  it("重试沿用上次问题且不改写问题草稿", async () => {
    const stream = ragStream();
    const user = await renderPanel();
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));
    await waitFor(() => expect(streamRagChat).toHaveBeenCalledTimes(1));
    stream.push({ kind: "answer_delta", text: "第一次回答" });
    stream.finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "重试上一问题" })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "重试上一问题" }));
    await waitFor(() => expect(streamRagChat).toHaveBeenCalledTimes(2));
    expect(stream.payloads[1].message).toBe("所有权规则是什么");
    expect(stream.payloads[1].history).toEqual([
      { role: "user", content: "所有权规则是什么" },
      { role: "assistant", content: "第一次回答" },
    ]);
    expect((screen.getByLabelText("问题") as HTMLTextAreaElement).value).toBe("");
  });

  it("问答进行中禁用知识点、资料勾选与问题输入", async () => {
    const stream = ragStream();
    const user = await renderPanel();
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));
    await waitFor(() => expect(streamRagChat).toHaveBeenCalledTimes(1));

    const nodeTrigger = screen.getByRole("button", { name: /知识点/ });
    expect(nodeTrigger.hasAttribute("disabled") || nodeTrigger.getAttribute("aria-disabled") === "true").toBe(true);
    expect((screen.getByRole("checkbox", { name: indexedResource.title }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("问题") as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "停止" }) as HTMLButtonElement).disabled).toBe(false);

    stream.finish();
    await waitFor(() => expect((screen.getByLabelText("问题") as HTMLTextAreaElement).disabled).toBe(false));
  });

  it("问答事件返回错误时显示后端错误文字", async () => {
    const stream = ragStream();
    const user = await renderPanel();
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));
    await waitFor(() => expect(streamRagChat).toHaveBeenCalledTimes(1));
    stream.push({ kind: "error", text: "检索服务超时" });
    expect(await screen.findByText("检索服务超时")).toBeTruthy();
  });
});

describe("主题切换时的资料与问答状态", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    vi.mocked(listNodeResources).mockResolvedValue([indexedResource, indexedResourceLong, failedResource]);
  });

  function renderBoth() {
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
        <ResourceLibraryPanel nodes={nodes} />
        <RagChatPanel nodes={nodes} />
      </ThemeProvider>
    );
    return { user, switchTheme: (theme: "light" | "dark") => act(() => applyTheme?.(theme)) };
  }

  it("切换主题保留待上传文件、资料勾选与问题草稿", async () => {
    const { user, switchTheme } = renderBoth();
    await screen.findByRole("button", { name: "删除 Rust 官方文档：所有权章节" });
    const file = new File(["正文"], "ownership.md", { type: "text/markdown" });
    await user.upload(screen.getByLabelText("本地文件"), file);
    await user.click(screen.getByRole("checkbox", { name: indexedResourceLong.title }));
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");

    switchTheme("dark");
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));

    const fileInput = screen.getByLabelText("本地文件") as HTMLInputElement;
    expect(fileInput.files?.[0]?.name).toBe("ownership.md");
    expect((screen.getByRole("checkbox", { name: indexedResource.title }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: indexedResourceLong.title }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("问题") as HTMLTextAreaElement).value).toBe("所有权规则是什么");

    switchTheme("light");
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(false));
    expect((screen.getByLabelText("问题") as HTMLTextAreaElement).value).toBe("所有权规则是什么");
  });

  it("回答进行中切换主题不重启请求也不中断流式输出", async () => {
    const stream = ragStream();
    const { user, switchTheme } = renderBoth();
    await screen.findByRole("checkbox", { name: indexedResource.title });
    await user.type(screen.getByLabelText("问题"), "所有权规则是什么");
    await user.click(screen.getByRole("button", { name: "提问" }));
    await waitFor(() => expect(streamRagChat).toHaveBeenCalledTimes(1));

    stream.push({ kind: "answer_delta", text: "Rust 通过" });
    stream.push({ kind: "evidence", excerpts: [{ source_id: "source-1", text: "所有权规则在编译期检查。", score: 0.8, metadata: { file_name: "ownership.md" } }] });
    switchTheme("dark");
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(stream.signals[0].aborted).toBe(false);

    stream.push({ kind: "answer_delta", text: "所有权与借用" });
    expect(await screen.findByText("Rust 通过所有权与借用")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ownership.md" })).toBeTruthy();
    stream.finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "重试上一问题" })).toBeTruthy());
    expect(streamRagChat).toHaveBeenCalledTimes(1);
  });
});
