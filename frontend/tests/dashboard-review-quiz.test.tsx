import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPanel } from "../features/dashboard/DashboardPanel";
import { QuizPanel } from "../features/quiz/QuizPanel";
import { ReviewPanel } from "../features/review/ReviewPanel";
import { ThemeProvider, useTheme } from "../features/theme/ThemeProvider";
import {
  apiUrl,
  generateQuiz,
  getDashboard,
  getDueCards,
  submitQuizAnswer,
  submitReview,
  type ReviewSubmission,
  type WorkspaceNode,
} from "../lib/api";
import { dashboard, dueCards, quizAnswer, quizGeneration, reviewCardFirst, reviewCardNext, workspaceNode } from "./fixtures";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    apiUrl: vi.fn(actual.apiUrl),
    getDashboard: vi.fn(),
    getDueCards: vi.fn(),
    submitReview: vi.fn(),
    generateQuiz: vi.fn(),
    submitQuizAnswer: vi.fn(),
  };
});

const longNode: WorkspaceNode = {
  ...workspaceNode,
  id: 104,
  code: "2.1",
  title: "异步运行时与并发任务调度：一个足够长的知识点标题用于验证浮层内的换行",
};

const offline = "无法连接本地学习服务，请确认 FastAPI 已启动。";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

let applyTheme: ((theme: "light" | "dark") => void) | null = null;

function ThemeDriver() {
  const { setTheme } = useTheme();
  applyTheme = setTheme;
  return null;
}

function renderWithTheme(node: ReactNode) {
  return render(<ThemeProvider><ThemeDriver />{node}</ThemeProvider>);
}

function isDisabled(role: string, name: string | RegExp) {
  return (screen.getByRole(role, { name }) as HTMLButtonElement).disabled;
}

function stepButton(direction: "增加" | "减少") {
  return screen.getAllByRole("button")
    .find((button) => button.getAttribute("aria-label") === `${direction}题目数量`)!;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  applyTheme = null;
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
});

describe("学习看板", () => {
  it("读取成功后显示指标、状态分布、热力图文字说明与日报", async () => {
    vi.mocked(getDashboard).mockResolvedValue(dashboard);
    render(<DashboardPanel projectId={1} />);

    expect(await screen.findByText("185")).toBeTruthy();
    expect(screen.getByText("知识点")).toBeTruthy();
    expect(screen.getByText("近 7 天分钟")).toBeTruthy();
    expect(screen.getAllByText("已掌握")).toHaveLength(2);
    expect(screen.getByText("42%")).toBeTruthy();
    expect(screen.getByText("待开始")).toBeTruthy();
    expect(screen.getByText("需复习")).toBeTruthy();
    expect(screen.getByLabelText("2026-09-02 学习 45 分钟")).toBeTruthy();
    expect(screen.getByTitle("2026-09-02：45 分钟")).toBeTruthy();
    expect(screen.getByLabelText("2026-09-01 学习 0 分钟")).toBeTruthy();
    expect(screen.getByText(/格子内数字是当天学习的分钟数/)).toBeTruthy();
    expect(screen.getByText("今天完成了所有权章节的复习。")).toBeTruthy();
  });

  it("刷新按钮重新读取看板并在读取中禁用", async () => {
    const pending = deferred<typeof dashboard>();
    vi.mocked(getDashboard).mockResolvedValueOnce(dashboard).mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<DashboardPanel projectId={1} />);
    await screen.findByText("185");

    await user.click(screen.getByRole("button", { name: "刷新学习看板" }));

    expect(await screen.findByText("正在读取学习看板")).toBeTruthy();
    expect(isDisabled("button", "刷新学习看板")).toBe(true);
    pending.resolve(dashboard);
    await waitFor(() => expect(getDashboard).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("正在读取学习看板")).toBeNull());
  });

  it("读取失败显示错误与重试，重试后恢复", async () => {
    vi.mocked(getDashboard).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(dashboard);
    const user = userEvent.setup();
    render(<DashboardPanel projectId={1} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(offline);
    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByText("185")).toBeTruthy();
    expect(getDashboard).toHaveBeenCalledTimes(2);
  });

  it("导出入口沿用原有导出地址", async () => {
    vi.mocked(getDashboard).mockResolvedValue(dashboard);
    const user = userEvent.setup();
    render(<DashboardPanel projectId={7} />);
    await screen.findByText("185");

    await user.click(screen.getByRole("button", { name: "路线 JSON" }));
    await user.click(screen.getByRole("button", { name: "Anki ZIP" }));

    expect(vi.mocked(apiUrl)).toHaveBeenCalledWith("/projects/7/exports/roadmap");
    expect(vi.mocked(apiUrl)).toHaveBeenCalledWith("/projects/7/exports/anki");
  });
});

describe("到期复习", () => {
  it("显示正面、查看答案显示背面并可再次隐藏", async () => {
    vi.mocked(getDueCards).mockResolvedValue(dueCards);
    const user = userEvent.setup();
    render(<ReviewPanel projectId={1} />);

    expect(await screen.findByText(reviewCardFirst.front)).toBeTruthy();
    expect(screen.queryByText(reviewCardFirst.back)).toBeNull();

    await user.click(screen.getByRole("button", { name: "查看答案" }));
    expect(screen.getByText(reviewCardFirst.back)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "隐藏答案" }));
    expect(screen.queryByText(reviewCardFirst.back)).toBeNull();
  });

  it("四档评分提交后进入下一张卡片并隐藏答案", async () => {
    vi.mocked(getDueCards).mockResolvedValue(dueCards);
    vi.mocked(submitReview).mockResolvedValue({ card: reviewCardFirst, next_card: reviewCardNext });
    const user = userEvent.setup();
    render(<ReviewPanel projectId={1} />);
    await screen.findByText(reviewCardFirst.front);
    await user.click(screen.getByRole("button", { name: "查看答案" }));

    await user.click(screen.getByRole("button", { name: "良好" }));

    expect(await screen.findByText(reviewCardNext.front)).toBeTruthy();
    expect(submitReview).toHaveBeenCalledWith(501, 3, 1);
    expect(screen.queryByText(reviewCardNext.back)).toBeNull();
    expect(screen.getByRole("button", { name: "查看答案" })).toBeTruthy();
    expect(screen.queryByText(reviewCardFirst.front)).toBeNull();
  });

  it("提交中有加载反馈、禁用评分且不会重复提交", async () => {
    const pending = deferred<ReviewSubmission>();
    vi.mocked(getDueCards).mockResolvedValue(dueCards);
    vi.mocked(submitReview).mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<ReviewPanel projectId={1} />);
    await screen.findByText(reviewCardFirst.front);

    await user.click(screen.getByRole("button", { name: "良好" }));

    expect(await screen.findByText("正在提交评分")).toBeTruthy();
    expect(isDisabled("button", "良好")).toBe(true);
    expect(isDisabled("button", "简单")).toBe(true);
    expect(isDisabled("button", "刷新到期复习")).toBe(true);
    await user.click(screen.getByRole("button", { name: "简单" }));
    expect(submitReview).toHaveBeenCalledTimes(1);

    pending.resolve({ card: reviewCardFirst, next_card: reviewCardNext });
    expect(await screen.findByText(reviewCardNext.front)).toBeTruthy();
    expect(isDisabled("button", "良好")).toBe(false);
  });

  it("没有到期卡片时给出明确提示", async () => {
    vi.mocked(getDueCards).mockResolvedValue({ cards: [], project_id: 1 });
    render(<ReviewPanel projectId={1} />);

    expect(await screen.findByText("当前没有到期卡片。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "良好" })).toBeNull();
  });

  it("读取失败可重试", async () => {
    vi.mocked(getDueCards).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(dueCards);
    const user = userEvent.setup();
    render(<ReviewPanel projectId={1} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(offline);
    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByText(reviewCardFirst.front)).toBeTruthy();
    expect(getDueCards).toHaveBeenCalledTimes(2);
  });

  it("评分失败保留当前卡片并显示错误", async () => {
    vi.mocked(getDueCards).mockResolvedValue(dueCards);
    vi.mocked(submitReview).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<ReviewPanel projectId={1} />);
    await screen.findByText(reviewCardFirst.front);

    await user.click(screen.getByRole("button", { name: "重来" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(offline);
    expect(screen.getByText(reviewCardFirst.front)).toBeTruthy();
    expect(isDisabled("button", "重来")).toBe(false);
  });
});

describe("查漏测验", () => {
  it("选择知识点与题型、调整数量后按原请求结构生成测验", async () => {
    vi.mocked(generateQuiz).mockResolvedValue(quizGeneration);
    const user = userEvent.setup();
    render(<QuizPanel projectId={1} nodes={[workspaceNode, longNode]} />);

    await user.click(screen.getByRole("button", { name: /知识点/ }));
    await user.click(await screen.findByRole("option", { name: /异步运行时与并发任务调度/ }));
    expect(screen.getByText(/已选：2.1 异步运行时与并发任务调度/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /题型/ }));
    await user.click(await screen.findByRole("option", { name: "选择" }));

    expect((screen.getByRole("textbox", { name: "题目数量" }) as HTMLInputElement).value).toBe("3");
    await user.click(stepButton("增加"));
    expect((screen.getByRole("textbox", { name: "题目数量" }) as HTMLInputElement).value).toBe("4");

    await user.click(screen.getByRole("button", { name: "生成测验" }));

    await waitFor(() => expect(generateQuiz).toHaveBeenCalledWith(1, { node_ids: [104], count: 4, qtype: "choice" }));
    expect(await screen.findByText(quizGeneration.questions[0].stem)).toBeTruthy();
  });

  it("题目数量受 1 到 20 的约束", async () => {
    const user = userEvent.setup();
    render(<QuizPanel projectId={1} nodes={[workspaceNode]} />);
    const input = () => screen.getByRole("textbox", { name: "题目数量" }) as HTMLInputElement;

    expect(input().value).toBe("3");
    await user.click(stepButton("减少"));
    await user.click(stepButton("减少"));
    await user.click(stepButton("减少"));
    expect(input().value).toBe("1");

    for (let step = 0; step < 25; step += 1) {
      await user.click(stepButton("增加"));
    }
    expect(input().value).toBe("20");
  });

  it("未选择知识点时给出校验提示且不发起请求", async () => {
    const user = userEvent.setup();
    render(<QuizPanel projectId={1} nodes={[workspaceNode]} />);

    await user.click(screen.getByRole("button", { name: "生成测验" }));

    expect(await screen.findByText("请选择一个知识点")).toBeTruthy();
    expect(generateQuiz).not.toHaveBeenCalled();
  });

  it("没有知识点时禁用生成并说明原因", () => {
    render(<QuizPanel projectId={1} nodes={[]} />);

    expect(isDisabled("button", "生成测验")).toBe(true);
    expect(screen.getByText("当前项目没有知识点，请先在学习路线中保存知识点，再回来生成测验。")).toBeTruthy();
    const trigger = screen.getByRole("button", { name: /知识点/ });
    expect(trigger.hasAttribute("disabled") || trigger.getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("提交答案显示正确反馈与掌握度，下一题进入第二题并清空答案", async () => {
    vi.mocked(generateQuiz).mockResolvedValue(quizGeneration);
    vi.mocked(submitQuizAnswer).mockResolvedValue(quizAnswer);
    const user = userEvent.setup();
    render(<QuizPanel projectId={1} nodes={[workspaceNode]} />);
    await user.click(screen.getByRole("button", { name: /知识点/ }));
    await user.click(await screen.findByRole("option", { name: /1\.1 所有权/ }));
    await user.click(screen.getByRole("button", { name: "生成测验" }));
    await screen.findByText(quizGeneration.questions[0].stem);

    const option = screen.getByRole("button", { name: /let n = s\.len\(\);/ });
    await user.click(option);
    expect(option.getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "提交答案" }));

    expect(await screen.findByText("回答正确")).toBeTruthy();
    expect(screen.getByText("当前掌握度 75%")).toBeTruthy();
    expect(submitQuizAnswer).toHaveBeenCalledWith(1, 901, "let n = s.len();");
    expect(isDisabled("button", "提交答案")).toBe(true);
    expect(isDisabled("button", /let n = s\.len\(\);/)).toBe(true);

    await user.click(screen.getByRole("button", { name: "下一题" }));

    expect(await screen.findByText(quizGeneration.questions[1].stem)).toBeTruthy();
    expect(screen.queryByText("回答正确")).toBeNull();
    expect((screen.getByRole("textbox", { name: "你的答案" }) as HTMLTextAreaElement).value).toBe("");
    expect(isDisabled("button", "提交答案")).toBe(false);
    expect(screen.queryByRole("button", { name: "下一题" })).toBeNull();
  });

  it("空答案提交时给出提示且不发起请求", async () => {
    vi.mocked(generateQuiz).mockResolvedValue(quizGeneration);
    const user = userEvent.setup();
    render(<QuizPanel projectId={1} nodes={[workspaceNode]} />);
    await user.click(screen.getByRole("button", { name: /知识点/ }));
    await user.click(await screen.findByRole("option", { name: /1\.1 所有权/ }));
    await user.click(screen.getByRole("button", { name: "生成测验" }));
    await screen.findByText(quizGeneration.questions[0].stem);

    await user.click(screen.getByRole("button", { name: "提交答案" }));

    expect(await screen.findByText("请输入答案后再提交")).toBeTruthy();
    expect(submitQuizAnswer).not.toHaveBeenCalled();
  });

  it("提交失败显示错误、保留当前题目并可重试", async () => {
    vi.mocked(generateQuiz).mockResolvedValue(quizGeneration);
    vi.mocked(submitQuizAnswer)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ...quizAnswer, is_correct: false, feedback: "需要巩固：注意所有权转移后原变量不可再使用。", mastery: 0.4 });
    const user = userEvent.setup();
    render(<QuizPanel projectId={1} nodes={[workspaceNode]} />);
    await user.click(screen.getByRole("button", { name: /知识点/ }));
    await user.click(await screen.findByRole("option", { name: /1\.1 所有权/ }));
    await user.click(screen.getByRole("button", { name: "生成测验" }));
    await screen.findByText(quizGeneration.questions[0].stem);
    await user.type(screen.getByRole("textbox", { name: "你的答案" }), "不确定");

    await user.click(screen.getByRole("button", { name: "提交答案" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(offline);
    expect(screen.getByText(quizGeneration.questions[0].stem)).toBeTruthy();
    expect(isDisabled("button", "提交答案")).toBe(false);

    await user.click(screen.getByRole("button", { name: "提交答案" }));

    expect(await screen.findByText("需要巩固")).toBeTruthy();
    expect(screen.getByText("当前掌握度 40%")).toBeTruthy();
    expect(submitQuizAnswer).toHaveBeenCalledTimes(2);
  });

  it("生成失败显示错误并保留已选知识点", async () => {
    vi.mocked(generateQuiz).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<QuizPanel projectId={1} nodes={[workspaceNode]} />);
    await user.click(screen.getByRole("button", { name: /知识点/ }));
    await user.click(await screen.findByRole("option", { name: /1\.1 所有权/ }));

    await user.click(screen.getByRole("button", { name: "生成测验" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(offline);
    expect(screen.getByText(/已选：1.1 所有权/)).toBeTruthy();
  });
});

describe("主题切换保留业务状态", () => {
  it("复习切换主题后保留正反面且不重复请求", async () => {
    vi.mocked(getDueCards).mockResolvedValue(dueCards);
    const user = userEvent.setup();
    renderWithTheme(<ReviewPanel projectId={1} />);
    await screen.findByText(reviewCardFirst.front);
    await user.click(screen.getByRole("button", { name: "查看答案" }));

    act(() => applyTheme?.("dark"));

    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(screen.getByText(reviewCardFirst.front)).toBeTruthy();
    expect(screen.getByText(reviewCardFirst.back)).toBeTruthy();
    expect(screen.getByRole("button", { name: "隐藏答案" })).toBeTruthy();
    expect(getDueCards).toHaveBeenCalledTimes(1);
    expect(submitReview).not.toHaveBeenCalled();
  });

  it("测验切换主题后保留知识点、当前题目、答案与反馈且不重复请求", async () => {
    vi.mocked(generateQuiz).mockResolvedValue(quizGeneration);
    vi.mocked(submitQuizAnswer).mockResolvedValue(quizAnswer);
    const user = userEvent.setup();
    renderWithTheme(<QuizPanel projectId={1} nodes={[workspaceNode, longNode]} />);
    await user.click(screen.getByRole("button", { name: /知识点/ }));
    await user.click(await screen.findByRole("option", { name: /异步运行时与并发任务调度/ }));
    await user.click(screen.getByRole("button", { name: "生成测验" }));
    await screen.findByText(quizGeneration.questions[0].stem);
    await user.type(screen.getByRole("textbox", { name: "你的答案" }), "借用检查器保证不可变借用");
    await user.click(screen.getByRole("button", { name: "提交答案" }));
    await screen.findByText("回答正确");

    act(() => applyTheme?.("dark"));

    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(screen.getByText(/已选：2.1 异步运行时与并发任务调度/)).toBeTruthy();
    expect(screen.getByText(quizGeneration.questions[0].stem)).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "你的答案" }) as HTMLTextAreaElement).value).toBe("借用检查器保证不可变借用");
    expect(screen.getByText("回答正确")).toBeTruthy();
    expect(screen.getByText("当前掌握度 75%")).toBeTruthy();
    expect(generateQuiz).toHaveBeenCalledTimes(1);
    expect(submitQuizAnswer).toHaveBeenCalledTimes(1);
  });
});
