"use client";

import {
  Alert,
  Button,
  Chip,
  ProgressBar,
  ProgressBarFill,
  ProgressBarTrack,
  Spinner,
} from "@heroui/react";
import { AlertCircle, Compass, Moon, Pencil, Plus, RefreshCw, Sun, Trash2 } from "lucide-react";

import { IconButton } from "../../components/ui/IconButton";
import type { ProjectSummary } from "../../lib/api";
import { useTheme } from "../theme/ThemeProvider";

type LoadState = "idle" | "loading" | "ready" | "error";

const cardAccents = [
  "from-project-1 to-project-1/30",
  "from-project-2 to-project-2/30",
  "from-project-3 to-project-3/30",
  "from-project-4 to-project-4/30",
  "from-project-5 to-project-5/30",
];

export function ProjectRail({
  projects,
  selectedId,
  state,
  error,
  onSelect,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: {
  projects: ProjectSummary[];
  selectedId: number | null;
  state: LoadState;
  error: string | null;
  onSelect: (projectId: number) => void;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (projectId: number) => void;
  onDelete: (project: ProjectSummary) => void;
}) {
  const { resolvedTheme, toggleTheme, toggleThemeLabel } = useTheme();

  return (
    <aside
      className="flex h-screen w-72 shrink-0 select-none flex-col overflow-y-auto border-r border-border bg-surface-secondary p-5 text-foreground max-[760px]:h-auto max-[760px]:w-full max-[760px]:border-r-0 max-[760px]:border-b"
      aria-label="项目列表"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-accent via-accent/80 to-accent/40 text-accent-foreground shadow-md shadow-accent/25"
            aria-hidden="true"
          >
            <Compass size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <Chip color="success" variant="soft" size="sm">LOCAL STUDY</Chip>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">学习轨迹</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton label={toggleThemeLabel} onClick={toggleTheme}>
            {resolvedTheme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          </IconButton>
          <IconButton label="刷新项目" onClick={onRetry}>
            <RefreshCw size={15} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 py-4 max-[760px]:max-h-[50vh]">
        {state === "loading" && (
          <div className="flex items-center gap-2.5 py-4 text-sm text-muted">
            <Spinner size="sm" color="success" aria-label="正在读取项目" />
            <span>正在读取项目</span>
          </div>
        )}

        {state === "error" && (
          <Alert status="danger">
            <Alert.Indicator>
              <AlertCircle size={16} aria-hidden="true" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
              <Button variant="danger-soft" size="sm" onClick={onRetry} className="mt-2">
                重试
              </Button>
            </Alert.Content>
          </Alert>
        )}

        {state === "ready" && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs leading-relaxed text-muted">
            还没有学习项目。请先通过现有路线页创建一个项目。
          </div>
        )}

        <nav className="flex flex-col gap-2.5" aria-label="项目">
          {projects.map((project, index) => {
            const isSelected = project.id === selectedId;
            const accent = cardAccents[index % cardAccents.length];
            const pct = project.progress.total === 0 ? 0 : Math.round((project.progress.done / project.progress.total) * 100);

            return (
              <article
                key={project.id}
                aria-current={isSelected ? "true" : undefined}
                className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface transition-colors ${
                  isSelected
                    ? "border-accent/70 ring-1 ring-accent/25"
                    : "border-border hover:border-accent/40"
                }`}
              >
                <div
                  className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${
                    isSelected ? "bg-accent" : `bg-gradient-to-b ${accent} opacity-60 group-hover:opacity-100`
                  }`}
                  aria-hidden="true"
                />

                <div className="flex items-stretch justify-between pl-3">
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 flex-col items-start justify-start gap-0 rounded-lg p-3 text-left"
                    aria-label={`${project.title} ${project.topic} ${project.progress.done}/${project.progress.total} 已完成`}
                    onClick={() => onSelect(project.id)}
                  >
                    <span className="block max-w-full truncate text-sm font-bold text-foreground">
                      {project.title}
                    </span>
                    <span className="mt-1 block max-w-full truncate text-xs text-muted">
                      {project.topic}
                    </span>
                    <span className="mt-2.5 block text-[11px] font-semibold tracking-wide text-brand-ink">
                      {project.progress.done}/{project.progress.total} 已完成
                    </span>
                  </Button>

                  <div className="flex flex-col items-center justify-start gap-1 p-2 pt-2.5">
                    <IconButton label={`编辑 ${project.title}`} onClick={() => onEdit(project.id)}>
                      <Pencil size={13} aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`删除 ${project.title}`} variant="danger-soft" onClick={() => onDelete(project)}>
                      <Trash2 size={13} aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>

                <div className="px-3 pb-2 pt-0">
                  <ProgressBar value={pct} color="success" size="sm" aria-label={`${project.title} 学习进度`}>
                    <ProgressBarTrack>
                      <ProgressBarFill />
                    </ProgressBarTrack>
                  </ProgressBar>
                </div>
              </article>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border pt-4">
        <Button variant="primary" fullWidth onClick={onCreate}>
          <Plus size={16} aria-hidden="true" />
          新建学习路线
        </Button>
      </div>
    </aside>
  );
}
