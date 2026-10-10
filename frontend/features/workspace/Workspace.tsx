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
    <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 px-6 py-10 sm:px-10 lg:px-16">
      <header className="flex flex-col justify-between gap-6 border-b-2 border-foreground/80 pb-6 sm:flex-row sm:items-end">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="eyebrow">{project.topic || "LEARNING PROJECT"}</p>
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{project.title}</h2>
          <p className="text-sm leading-relaxed text-muted">
            {project.goal || project.background || "尚未填写学习目标。"}
          </p>
        </div>
        <div
          className="flex shrink-0 items-baseline justify-between sm:flex-col sm:items-end sm:justify-center"
          aria-label={`项目进度 ${progress.done}/${progress.total}`}
        >
          <div className="font-serif text-4xl font-bold text-brand-ink">
            {progress.done}
            <small className="font-sans text-lg font-normal text-muted"> / {progress.total}</small>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">完成节点</p>
        </div>
      </header>

      <section className="flex flex-col gap-2 py-2" aria-label="学习进度">
        <ProgressBar value={progressWidth} color="success" size="sm" aria-label="学习进度" className="w-full">
          <ProgressBarOutput className="pb-1 text-xs font-bold text-muted" />
          <ProgressBarTrack>
            <ProgressBarFill />
          </ProgressBarTrack>
        </ProgressBar>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-bold text-muted">
          <span>{progress.total === 0 ? "暂无知识点，保存路线后开始学习" : `${progressWidth}% 已完成`}</span>
          <span>{progress.learning} 个学习中</span>
          <span>{progress.weak} 个待巩固</span>
        </div>
      </section>

      <Tabs defaultSelectedKey="dashboard" className="w-full min-w-0">
        <Tabs.ListContainer>
          <Tabs.List aria-label="学习功能">
            {workspaceTabs.map((tab) => (
              <Tabs.Tab key={tab.id} id={tab.id} className="whitespace-nowrap">
                {tab.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="dashboard" className="min-w-0">
          <DashboardPanel projectId={project.id} />
        </Tabs.Panel>
        <Tabs.Panel id="roadmap" shouldForceMount className="min-w-0 data-[inert]:hidden">
          <RoadmapPanel
            roadmap={roadmap}
            nodes={nodes}
            statusPendingId={statusPendingId}
            onUpdateStatus={onUpdateStatus}
          />
        </Tabs.Panel>
        <Tabs.Panel id="review" className="min-w-0">
          <ReviewPanel projectId={project.id} />
        </Tabs.Panel>
        <Tabs.Panel id="rag" className="min-w-0">
          <ResourceLibraryPanel nodes={nodes} />
          <RagChatPanel nodes={nodes} />
        </Tabs.Panel>
        <Tabs.Panel id="quiz" className="min-w-0">
          <QuizPanel projectId={project.id} nodes={nodes} />
        </Tabs.Panel>
        <Tabs.Panel id="models" className="min-w-0">
          <ModelConfigurationPanel />
        </Tabs.Panel>
      </Tabs>
    </main>
  );
}
