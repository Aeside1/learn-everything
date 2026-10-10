"use client";

import { Button, Card, CardDescription, CardTitle, Spinner } from "@heroui/react";
import { AlertCircle, BookOpenCheck, RotateCcw } from "lucide-react";

import type { WorkspaceLoadState } from "./useProjectWorkspace";

export function WorkspaceStatus({
  state,
  error,
  onRetry,
}: {
  state: WorkspaceLoadState;
  error: string | null;
  onRetry: () => void;
}) {
  if (state === "loading") {
    return (
      <main
        className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-8 text-center"
        aria-busy="true"
      >
        <Spinner size="lg" color="accent" aria-label="正在加载学习工作台" />
        <p className="text-sm font-semibold text-muted">正在加载学习工作台</p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-8">
        <Card
          className="flex w-full max-w-md flex-col items-center gap-3 border-danger/40 bg-danger-soft p-6 text-center"
          role="alert"
        >
          <div className="rounded-full bg-danger/15 p-3 text-danger" aria-hidden="true">
            <AlertCircle size={28} />
          </div>
          <CardTitle className="text-xl font-bold">项目数据暂时不可用</CardTitle>
          <CardDescription className="max-w-xs break-all text-xs text-danger-soft-foreground">
            {error}
          </CardDescription>
          <Button variant="primary" size="sm" className="mt-3" onClick={onRetry}>
            <RotateCcw size={15} aria-hidden="true" />
            重新加载
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-8">
      <Card className="flex w-full max-w-md flex-col items-center gap-3 border border-dashed border-border bg-surface p-8 text-center">
        <div className="rounded-2xl bg-brand-soft p-3.5 text-brand-ink" aria-hidden="true">
          <BookOpenCheck size={32} />
        </div>
        <CardTitle className="text-xl font-bold">选择一个项目</CardTitle>
        <CardDescription className="max-w-xs text-xs leading-relaxed text-muted">
          这里会显示路线、学习内容和当前进度。
        </CardDescription>
      </Card>
    </main>
  );
}
