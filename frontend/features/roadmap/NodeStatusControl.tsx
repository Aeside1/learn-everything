"use client";

import { ToggleButton, ToggleButtonGroup } from "@heroui/react";

import type { WorkspaceNode } from "../../lib/api";

export const statusLabels: Record<string, string> = {
  pending: "待开始",
  learning: "学习中",
  mastered: "已掌握",
  weak: "需复习",
  skipped: "已跳过",
};

const statusOptions = ["pending", "learning", "mastered", "weak"];

type StatusNode = Pick<WorkspaceNode, "id" | "title" | "status">;

export function NodeStatusControl({ node, pending, onUpdate }: { node: StatusNode; pending: boolean; onUpdate: (status: string) => void }) {
  return (
    <ToggleButtonGroup
      className="status-control"
      aria-label={`${node.title} 的学习状态`}
      selectionMode="single"
      disallowEmptySelection
      isDetached
      size="sm"
      selectedKeys={[node.status]}
      isDisabled={pending}
      onSelectionChange={(keys) => {
        const next = Array.from(keys)[0];
        if (typeof next === "string" && next !== node.status) onUpdate(next);
      }}
    >
      {statusOptions.map((status) => (
        <ToggleButton key={status} id={status}>
          {statusLabels[status]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
