import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ProjectDeletionDialog } from "../features/projects/ProjectDeletionDialog";
import { ProjectEditDialog } from "../features/projects/ProjectEditDialog";
import { workspace, projectSummary } from "./fixtures";

describe("项目弹窗", () => {
  it("编辑弹窗提交完整项目字段", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ProjectEditDialog project={workspace.project} saving={false} error={null} onClose={vi.fn()} onSave={onSave} />);
    await user.clear(screen.getByDisplayValue("学习 Rust"));
    await user.type(screen.getByLabelText("项目名称"), "Rust 进阶");
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    expect(onSave).toHaveBeenCalledWith({ title: "Rust 进阶", topic: "Rust", background: "", goal: "", weekly_hours: 8 });
  });

  it("删除弹窗仅在输入 DELETE 后允许确认", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ProjectDeletionDialog project={projectSummary} deleting={false} error={null} onClose={vi.fn()} onConfirm={onConfirm} />);
    const button = screen.getByRole("button", { name: "永久删除" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByRole("textbox"), "DELETE");
    expect((button as HTMLButtonElement).disabled).toBe(false);
    await user.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("提交进行中不允许取消、关闭或 Escape 关闭", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ProjectEditDialog project={workspace.project} saving error={null} onClose={onClose} onSave={vi.fn()} />);
    expect((screen.getByRole("button", { name: "取消" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "关闭" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "保存修改" }) as HTMLButtonElement).disabled).toBe(true);
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "编辑学习项目" })).toBeTruthy();
  });

  it("关闭弹窗后焦点回到触发位置", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>打开项目编辑</button>
          {open && (
            <ProjectEditDialog project={workspace.project} saving={false} error={null} onClose={() => setOpen(false)} onSave={vi.fn()} />
          )}
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "打开项目编辑" });
    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: "编辑学习项目" })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
