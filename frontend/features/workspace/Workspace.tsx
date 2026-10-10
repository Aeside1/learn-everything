"use client";

import { ProgressBar, ProgressBarFill, ProgressBarOutput, ProgressBarTrack, Tabs } from "@heroui/react";

import { RagChatPanel } from "../chat/RagChatPanel";
import { ModelConfigurationPanel } from "../configuration/ModelConfigurationPanel";
import { DashboardPanel } from "../dashboard/DashboardPanel";
import { QuizPanel } from "../quiz/QuizPanel";
import { ResourceLibraryPanel } from "../resources/ResourceLibraryPanel";
import { ReviewPanel } from "../review/ReviewPanel";
import { RoadmapPanel } from "../roadmap/RoadmapPanel";
import type { ProjectRoadmap, ProjectWorkspace } from "../../lib/api";
import type { StatusNode, WorkspaceLoadState } from "./useProjectWorkspace";
import { WorkspaceStatus } from "./WorkspaceStatus";

type WorkspaceTab = "dashboard" | "roadmap" | "review" | "rag" | "quiz" | "models";

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "dashboard", label: "学习概览" },
  { id: "roadmap", label: "学习路线" },
  { id: "review", label: "到期复习" },
  { id: "rag", label: "RAG 问答" },
  { id: "quiz", label: "查漏测验" },
  { id: "models", label: "模型配置" },
];

function Progress({
  value,
  "aria-label": ariaLabel,
  showValueLabel,
}: {
  value: number;
  "aria-label"?: string;
  showValueLabel?: boolean;
}) {
  return (
    <ProgressBar
      aria-label={ariaLabel}
      value={value}
      color="success"
      size="sm"
      className="w-full flex flex-col gap-1.5"
    >
      {showValueLabel && (
        <div className="flex justify-end">
          <ProgressBarOutput className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {value}%
          </ProgressBarOutput>
        </div>
      )}
      <ProgressBarTrack className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <ProgressBarFill className="h-full bg-emerald-500 rounded-full transition-all duration-300" />
      </ProgressBarTrack>
    </ProgressBar>
  );
}

export function Workspace({
  workspace,
  roadmap,
  state,
  error,
  statusPendingId,
  onRetry,
  onUpdateStatus,
}: {
  workspace: ProjectWorkspace | null;
  roadmap: ProjectRoadmap | null;
  state: WorkspaceLoadState;
  error: string | null;
  statusPendingId: number | null;
  onRetry: () => void;
  onUpdateStatus: (node: StatusNode, status: string) => Promise<boolean>;
}) {
  if (state !== "ready" || !workspace) return <WorkspaceStatus state={state} error={error} onRetry={onRetry} />;

  const { project, progress, nodes } = workspace;
  const progressWidth = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  return (
    <main className="w-full min-w-0 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-10 flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b-2 border-zinc-900 dark:border-zinc-200">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            {project.topic || "LEARNING PROJECT"}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif tracking-tight text-zinc-900 dark:text-zinc-100">
            {project.title}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {project.goal || project.background || "尚未填写学习目标。"}
          </p>
        </div>
        <div
          className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center shrink-0"
          aria-label={`项目进度 ${progress.done}/${progress.total}`}
        >
          <div className="text-4xl font-bold font-serif text-emerald-600 dark:text-emerald-400">
            {progress.done}
            <small className="text-lg font-sans text-zinc-400 font-normal"> / {progress.total}</small>
          </div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-1">完成节点</p>
        </div>
      </header>

      <section className="py-2 flex flex-col gap-2" aria-label="学习进度">
        <Progress value={progressWidth} aria-label="学习进度" showValueLabel />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 pt-1">
          <span>{progressWidth}% 已完成</span>
          <span>{progress.learning} 个学习中</span>
          <span>{progress.weak} 个待巩固</span>
        </div>
      </section>

      <Tabs defaultSelectedKey="dashboard" className="w-full min-w-0">
        <Tabs.ListContainer className="max-w-full overflow-x-auto">
          <Tabs.List aria-label="学习功能">
            {workspaceTabs.map((tab) => (
              <Tabs.Tab key={tab.id} id={tab.id} className="whitespace-nowrap">
                {tab.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="dashboard"><DashboardPanel projectId={project.id} /></Tabs.Panel>
        <Tabs.Panel id="roadmap" shouldForceMount className="data-[inert]:hidden">
          <RoadmapPanel roadmap={roadmap} nodes={nodes} statusPendingId={statusPendingId} onUpdateStatus={onUpdateStatus} />
        </Tabs.Panel>
        <Tabs.Panel id="review"><ReviewPanel projectId={project.id} /></Tabs.Panel>
        <Tabs.Panel id="rag">
          <ResourceLibraryPanel nodes={nodes} />
          <RagChatPanel nodes={nodes} />
        </Tabs.Panel>
        <Tabs.Panel id="quiz"><QuizPanel projectId={project.id} nodes={nodes} /></Tabs.Panel>
        <Tabs.Panel id="models"><ModelConfigurationPanel /></Tabs.Panel>
      </Tabs>
    </main>
  );
}

