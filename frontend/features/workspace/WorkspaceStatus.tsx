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
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <Spinner size="lg" color="accent" className="text-emerald-500" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">正在加载学习工作台</p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center p-8">
        <Card className="max-w-md w-full border-rose-200 bg-rose-50/40 p-6 shadow-xl dark:border-rose-950/50 dark:bg-rose-950/20 text-center flex flex-col items-center gap-3">
          <div className="p-3 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
            <AlertCircle size={28} />
          </div>
          <CardTitle className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">
            <strong>项目数据暂时不可用</strong>
          </CardTitle>
          <CardDescription className="text-xs text-rose-600 dark:text-rose-400 max-w-xs break-all">
            <span>{error}</span>
          </CardDescription>
          <Button
            variant="primary"
            size="sm"
            className="mt-3 flex items-center gap-2"
            onClick={onRetry}
          >
            <RotateCcw size={15} />
            重新加载
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center p-8">
      <Card className="max-w-md w-full border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-8 text-center flex flex-col items-center gap-3 shadow-none">
        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <BookOpenCheck size={32} />
        </div>
        <CardTitle className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">
          <strong>选择一个项目</strong>
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          <span>这里会显示路线、学习内容和当前进度。</span>
        </CardDescription>
      </Card>
    </main>
  );
}

