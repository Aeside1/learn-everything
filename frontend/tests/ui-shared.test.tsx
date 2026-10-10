import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "../components/ui/IconButton";
import { SelectField } from "../components/ui/SelectField";

const options = [
  { id: "101", label: "1.1 所有权" },
  { id: "102", label: "2.3 一个非常长的知识点标题，用于验证浮层内的换行与截断行为不会遮挡选项内容" },
];

describe("共享组合控件", () => {
  it("选择器通过浮层选项回传选中值", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SelectField label="知识点" value={null} options={options} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /知识点/ }));
    await user.click(await screen.findByRole("option", { name: /1\.1 所有权/ }));

    expect(onChange).toHaveBeenCalledWith("101");
  });

  it("选择器禁用时不能展开", async () => {
    const user = userEvent.setup();
    render(<SelectField label="知识点" value="101" options={options} onChange={vi.fn()} isDisabled />);

    const trigger = screen.getByRole("button", { name: /知识点/ });
    expect(trigger.hasAttribute("disabled") || trigger.getAttribute("aria-disabled") === "true").toBe(true);
    await user.click(trigger);
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("图标按钮暴露可访问名称且可禁用", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton label="刷新项目" isDisabled onClick={onClick}>{null}</IconButton>);

    const button = screen.getByRole("button", { name: "刷新项目" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
