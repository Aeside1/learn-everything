import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelConfigurationPanel } from "../features/configuration/ModelConfigurationPanel";
import { ThemeProvider, useTheme } from "../features/theme/ThemeProvider";
import {
  activateModelProfile,
  ApiError,
  createModelProfile,
  deleteModelProfile,
  getModelConfiguration,
  saveModelProfile,
  testModelProfile,
  type ModelConfiguration,
} from "../lib/api";
import { modelConfiguration } from "./fixtures";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getModelConfiguration: vi.fn(),
    createModelProfile: vi.fn(),
    saveModelProfile: vi.fn(),
    activateModelProfile: vi.fn(),
    deleteModelProfile: vi.fn(),
    testModelProfile: vi.fn(),
  };
});

const FAKE_KEY = "sk-fake-0001";

const llmRegion = () => screen.getByRole("region", { name: "LLM 配置" });
const ragRegion = () => screen.getByRole("region", { name: "RAG 向量模型配置" });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

function passwordInput() {
  return within(llmRegion()).getByLabelText("API Key") as HTMLInputElement;
}

describe("模型配置面板", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    vi.mocked(getModelConfiguration).mockResolvedValue(modelConfiguration);
  });

  it("读取中显示忙碌提示，读取完成后分别显示已就绪与未配置", async () => {
    const pending = deferred<ModelConfiguration>();
    vi.mocked(getModelConfiguration).mockReturnValue(pending.promise);

    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );

    expect(screen.getByText("正在读取配置状态")).toBeTruthy();
    expect(screen.getByText("正在读取配置状态").parentElement?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByLabelText("正在读取模型配置")).toBeTruthy();

    await act(async () => {
      pending.resolve(modelConfiguration);
      await pending.promise;
    });

    expect(await screen.findByText("LLM 配置 已就绪")).toBeTruthy();
    expect(screen.getByText("RAG 向量模型配置 未配置")).toBeTruthy();
    expect(within(ragRegion()).getByText("还没有 RAG 档案，填写名称后点击「新建」。")).toBeTruthy();
    expect((within(ragRegion()).getByRole("button", { name: /活动档案/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("读取失败时给出错误提示且不渲染配置表单", async () => {
    vi.mocked(getModelConfiguration).mockRejectedValue(new ApiError(503, "验收模拟的服务端错误"));

    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("验收模拟的服务端错误")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "LLM 配置" })).toBeNull();
  });

  it("选择活动档案触发既有激活操作，浮层支持长档案名称", async () => {
    const user = userEvent.setup();
    vi.mocked(activateModelProfile).mockResolvedValue({
      ...modelConfiguration,
      llm: {
        active_profile_id: "llm-backup",
        active_profile_name: "备用档案：一个很长的档案名称用于验证选择器浮层内的换行与选中回传",
        base_url: "https://backup.example.test/v1",
        model: "example-backup-model",
        api_key_configured: false,
        ready: false,
      },
    });
    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    await user.click(within(llmRegion()).getByRole("button", { name: /活动档案/ }));
    await user.click(await screen.findByRole("option", { name: /备用档案：一个很长的档案名称/ }));

    expect(activateModelProfile).toHaveBeenCalledWith("llm", "llm-backup");
    expect(await screen.findByText("LLM 档案已切换并应用。")).toBeTruthy();
    expect((within(llmRegion()).getByLabelText("对话模型") as HTMLInputElement).value).toBe("example-backup-model");
    expect(within(llmRegion()).getByText("LLM 配置 未配置")).toBeTruthy();
  });

  it("新建档案使用输入的名称并进入未配置状态", async () => {
    const user = userEvent.setup();
    const created: ModelConfiguration = {
      ...modelConfiguration,
      llm: { active_profile_id: "llm-3", active_profile_name: "备考 LLM", base_url: "", model: "", api_key_configured: false, ready: false },
      llm_profiles: [...modelConfiguration.llm_profiles, { id: "llm-3", name: "备考 LLM", base_url: "", model: "", api_key_configured: false }],
    };
    vi.mocked(createModelProfile).mockResolvedValue(created);
    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    const newName = within(llmRegion()).getByLabelText("新档案名称");
    await user.clear(newName);
    expect((within(llmRegion()).getByRole("button", { name: "新建" }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(newName, "备考 LLM");
    await user.click(within(llmRegion()).getByRole("button", { name: "新建" }));

    expect(createModelProfile).toHaveBeenCalledWith("llm", "备考 LLM");
    expect(await screen.findByText("已新建 LLM 档案，请填写并保存配置。")).toBeTruthy();
    expect((within(llmRegion()).getByLabelText("档案名称") as HTMLInputElement).value).toBe("备考 LLM");
    expect(within(llmRegion()).getByText("LLM 配置 未配置")).toBeTruthy();
    expect(within(llmRegion()).getByText("还没有可用密钥，填写 API Key 后才能测试连接。")).toBeTruthy();
    expect((within(llmRegion()).getByRole("button", { name: "测试连接" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("保存配置提交当前草稿，密钥使用密码输入且保存后不回显", async () => {
    const user = userEvent.setup();
    vi.mocked(saveModelProfile).mockResolvedValue({
      ...modelConfiguration,
      llm: { ...modelConfiguration.llm, base_url: "https://llm.example.test/v2" },
    });
    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    expect(passwordInput().type).toBe("password");
    expect(passwordInput().getAttribute("autocomplete")).toBe("off");

    const baseUrl = within(llmRegion()).getByLabelText("服务地址");
    await user.clear(baseUrl);
    await user.type(baseUrl, "https://llm.example.test/v2");
    await user.type(passwordInput(), FAKE_KEY);
    await user.click(within(llmRegion()).getByRole("button", { name: "保存配置" }));

    expect(saveModelProfile).toHaveBeenCalledWith("llm", "llm-default", {
      name: "默认 LLM 档案",
      base_url: "https://llm.example.test/v2",
      api_key: FAKE_KEY,
      model: "example-chat-model",
    });
    expect(await screen.findByText("LLM 配置已保存，密钥不会再次显示。")).toBeTruthy();
    expect(passwordInput().value).toBe("");
    expect(document.body.innerHTML).not.toContain(FAKE_KEY);
    expect(screen.getByText("LLM 配置 已就绪")).toBeTruthy();
  });

  it("RAG 向量模型配置保留服务地址辅助说明与就绪状态", async () => {
    vi.mocked(getModelConfiguration).mockResolvedValue({
      ...modelConfiguration,
      rag: {
        active_profile_id: "rag-default",
        active_profile_name: "本地向量模型",
        base_url: "https://rag.example.test/v1",
        model: "example-embedding-model",
        api_key_configured: true,
        ready: true,
      },
      rag_profiles: [{ id: "rag-default", name: "本地向量模型", base_url: "https://rag.example.test/v1", model: "example-embedding-model", api_key_configured: true }],
    });
    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );

    expect(await screen.findByText("RAG 向量模型配置 已就绪")).toBeTruthy();
    const rag = within(ragRegion());
    expect((rag.getByLabelText("向量模型") as HTMLInputElement).value).toBe("example-embedding-model");
    expect(rag.getByText("请填写基础地址（例如 https://api.example.com/v1），不要包含 /embeddings。")).toBeTruthy();
    expect(rag.getByText("密钥只保存在本地配置中，保存后不会再次显示。")).toBeTruthy();
    expect((rag.getByLabelText("API Key") as HTMLInputElement).type).toBe("password");
  });

  it("连接测试使用当前草稿，成功与失败都有明确的文字反馈", async () => {
    const user = userEvent.setup();
    vi.mocked(testModelProfile).mockResolvedValue({ ok: true, message: "连接成功，模型可用。" });
    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    await user.click(within(llmRegion()).getByRole("button", { name: "测试连接" }));
    expect(testModelProfile).toHaveBeenCalledWith("llm", expect.objectContaining({ base_url: "https://llm.example.test/v1" }), "llm-default");
    expect(await screen.findByText("连接成功，模型可用。")).toBeTruthy();

    vi.mocked(testModelProfile).mockResolvedValue({ ok: false, message: "连接失败：请检查服务地址与密钥。" });
    await user.click(within(llmRegion()).getByRole("button", { name: "测试连接" }));
    expect(await screen.findByText("连接失败：请检查服务地址与密钥。")).toBeTruthy();

    vi.mocked(testModelProfile).mockRejectedValue(new ApiError(503, "模型服务暂时不可用"));
    await user.click(within(llmRegion()).getByRole("button", { name: "测试连接" }));
    expect(await screen.findByText("模型服务暂时不可用")).toBeTruthy();
    expect(within(llmRegion()).getByRole("status")).toBeTruthy();
  });

  it("删除当前档案调用既有删除接口并使用危险样式按钮", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteModelProfile).mockResolvedValue({
      ...modelConfiguration,
      llm: {
        active_profile_id: null,
        active_profile_name: null,
        base_url: "",
        model: "",
        api_key_configured: false,
        ready: false,
      },
      llm_profiles: [modelConfiguration.llm_profiles[1]],
    });
    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    const remove = within(llmRegion()).getByRole("button", { name: "删除当前档案" });
    expect(remove.getAttribute("aria-label")).toBe("删除当前档案");
    await user.click(remove);

    expect(deleteModelProfile).toHaveBeenCalledWith("llm", "llm-default");
    expect(await screen.findByText("LLM 档案已删除。")).toBeTruthy();
    expect(within(llmRegion()).queryByLabelText("档案名称")).toBeNull();
    expect(within(llmRegion()).getByText("LLM 配置 未配置")).toBeTruthy();
  });

  it("操作进行中禁用可能冲突的操作并阻止重复提交", async () => {
    const user = userEvent.setup();
    const pending = deferred<ModelConfiguration>();
    vi.mocked(saveModelProfile).mockReturnValue(pending.promise);
    render(
      <ThemeProvider>
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    const save = within(llmRegion()).getByRole("button", { name: "保存配置" });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(saveModelProfile).toHaveBeenCalledTimes(1));

    await waitFor(() => expect((within(llmRegion()).getByRole("button", { name: "保存配置" }) as HTMLButtonElement).disabled).toBe(true));
    expect((within(llmRegion()).getByRole("button", { name: "测试连接" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(llmRegion()).getByRole("button", { name: "删除当前档案" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(llmRegion()).getByRole("button", { name: /活动档案/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(llmRegion()).getByRole("button", { name: "新建" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(llmRegion()).getByLabelText("API Key") as HTMLInputElement).disabled).toBe(true);
    expect((within(ragRegion()).getByRole("button", { name: "新建" }) as HTMLButtonElement).disabled).toBe(true);

    await user.click(within(llmRegion()).getByRole("button", { name: "保存配置" }));
    expect(saveModelProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(modelConfiguration);
      await pending.promise;
    });

    expect(await screen.findByText("LLM 配置已保存，密钥不会再次显示。")).toBeTruthy();
    await waitFor(() => expect((within(llmRegion()).getByRole("button", { name: "保存配置" }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("主题切换保留两类草稿、活动档案与连接测试结果", async () => {
    let applyTheme: ((theme: "light" | "dark") => void) | null = null;
    function ThemeDriver() {
      const { setTheme } = useTheme();
      applyTheme = setTheme;
      return null;
    }
    const user = userEvent.setup();
    vi.mocked(testModelProfile).mockResolvedValue({ ok: true, message: "连接成功，模型可用。" });
    render(
      <ThemeProvider>
        <ThemeDriver />
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    const profileName = within(llmRegion()).getByLabelText("档案名称");
    await user.clear(profileName);
    await user.type(profileName, "深色草稿档案");
    const ragNewName = within(ragRegion()).getByLabelText("新档案名称");
    await user.clear(ragNewName);
    await user.type(ragNewName, "深色新 RAG 档案");
    await user.click(within(llmRegion()).getByRole("button", { name: "测试连接" }));
    await screen.findByText("连接成功，模型可用。");

    act(() => applyTheme?.("dark"));

    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect((within(llmRegion()).getByLabelText("档案名称") as HTMLInputElement).value).toBe("深色草稿档案");
    expect((within(ragRegion()).getByLabelText("新档案名称") as HTMLInputElement).value).toBe("深色新 RAG 档案");
    expect(screen.getByText("LLM 配置 已就绪")).toBeTruthy();
    expect(screen.getByText("连接成功，模型可用。")).toBeTruthy();
    expect(within(llmRegion()).getByRole("button", { name: /活动档案/ }).textContent).toContain("默认 LLM 档案");
    expect(getModelConfiguration).toHaveBeenCalledTimes(1);
  });

  it("主题切换不中断进行中的保存请求", async () => {
    let applyTheme: ((theme: "light" | "dark") => void) | null = null;
    function ThemeDriver() {
      const { setTheme } = useTheme();
      applyTheme = setTheme;
      return null;
    }
    const pending = deferred<ModelConfiguration>();
    vi.mocked(saveModelProfile).mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDriver />
        <ModelConfigurationPanel />
      </ThemeProvider>
    );
    await screen.findByText("LLM 配置 已就绪");

    await user.click(within(llmRegion()).getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(saveModelProfile).toHaveBeenCalledTimes(1));

    act(() => applyTheme?.("dark"));
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));

    await act(async () => {
      pending.resolve(modelConfiguration);
      await pending.promise;
    });

    expect(await screen.findByText("LLM 配置已保存，密钥不会再次显示。")).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(saveModelProfile).toHaveBeenCalledTimes(1);
  });
});
