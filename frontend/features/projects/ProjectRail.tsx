"use client";

import { Button } from "@heroui/react";
import { AlertCircle, Compass, LoaderCircle, Moon, Pencil, Plus, RefreshCw, Sun, Trash2 } from "lucide-react";

import type { ProjectSummary } from "../../lib/api";
import { useTheme } from "../theme/ThemeProvider";

type LoadState = "idle" | "loading" | "ready" | "error";

const cardThemePresets = [
  {
    stripe: "from-emerald-400 to-teal-500",
    bar: "from-emerald-500 to-teal-400",
    dot: "bg-emerald-400",
    hoverBorder: "dark:hover:border-emerald-500/40",
  },
  {
    stripe: "from-sky-400 to-blue-500",
    bar: "from-sky-500 to-blue-400",
    dot: "bg-sky-400",
    hoverBorder: "dark:hover:border-sky-500/40",
  },
  {
    stripe: "from-violet-400 to-indigo-500",
    bar: "from-violet-500 to-indigo-400",
    dot: "bg-violet-400",
    hoverBorder: "dark:hover:border-violet-500/40",
  },
  {
    stripe: "from-amber-400 to-orange-500",
    bar: "from-amber-500 to-orange-400",
    dot: "bg-amber-400",
    hoverBorder: "dark:hover:border-amber-500/40",
  },
  {
    stripe: "from-rose-400 to-pink-500",
    bar: "from-rose-500 to-pink-400",
    dot: "bg-rose-400",
    hoverBorder: "dark:hover:border-rose-500/40",
  },
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
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <aside
      className="relative flex flex-col h-screen w-72 shrink-0 bg-[#f0f4f1] dark:bg-gradient-to-b dark:from-[#0b0f19] dark:via-[#0d1424] dark:to-[#080d16] p-5 text-zinc-900 dark:text-zinc-100 border-r border-zinc-200/90 dark:border-white/[0.08] select-none shadow-md dark:shadow-2xl overflow-hidden transition-colors duration-200"
      aria-label="项目列表"
    >
      {/* 氛围微光 */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-64 h-64 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-56 h-56 rounded-full bg-teal-500/[0.04] dark:bg-teal-500/[0.07] blur-3xl" aria-hidden="true" />

      <div className="relative z-10 flex items-start justify-between pb-5 border-b border-zinc-200/80 dark:border-white/[0.08] gap-2">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-md shadow-emerald-500/25 border border-emerald-300/30 shrink-0"
            aria-hidden="true"
          >
            <Compass size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/25 text-[10px] font-extrabold tracking-wider uppercase">
              <span className="size-1 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" aria-hidden="true" />
              LOCAL STUDY
            </span>
            <h1 className="text-xl font-bold font-serif tracking-tight text-zinc-900 dark:bg-gradient-to-r dark:from-zinc-100 dark:via-zinc-200 dark:to-emerald-200 dark:bg-clip-text dark:text-transparent mt-0.5">
              学习轨迹
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={resolvedTheme === "dark" ? "切换为浅色主题" : "切换为深色主题"}
            className="flex items-center justify-center size-8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-white/[0.08] border border-zinc-200/80 dark:border-white/[0.08] rounded-xl bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm transition-all cursor-pointer"
          >
            {resolvedTheme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            <span className="sr-only">切换主题</span>
          </button>
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onClick={onRetry}
            aria-label="刷新项目"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-white/[0.08] border border-zinc-200/80 dark:border-white/[0.08] rounded-xl bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm transition-all cursor-pointer"
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span className="sr-only">刷新项目</span>
          </Button>
        </div>
      </div>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto py-4 space-y-2.5">
        {state === "loading" && (
          <div className="flex items-center gap-2.5 py-4 text-sm text-zinc-400">
            <LoaderCircle className="animate-spin text-emerald-400" size={18} />
            <span>正在读取项目</span>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span className="leading-snug">{error}</span>
            </div>
            <button
              type="button"
              className="text-left font-semibold text-rose-400 hover:underline cursor-pointer pt-1"
              onClick={onRetry}
            >
              重试
            </button>
          </div>
        )}

        {state === "ready" && projects.length === 0 && (
          <div className="p-4 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-dashed border-zinc-200 dark:border-white/[0.1] text-center text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            还没有学习项目。请先通过现有路线页创建一个项目。
          </div>
        )}

        <nav className="flex flex-col gap-2.5">
          {projects.map((project, idx) => {
            const isSelected = project.id === selectedId;
            const theme = cardThemePresets[idx % cardThemePresets.length];
            const pct = project.progress.total === 0 ? 0 : Math.round((project.progress.done / project.progress.total) * 100);

            return (
              <article
                key={project.id}
                className={`group relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? "bg-white dark:bg-gradient-to-r dark:from-emerald-950/80 dark:via-[#0d2820]/70 dark:to-teal-950/60 border-emerald-500/70 shadow-sm dark:shadow-lg dark:shadow-emerald-950/50 ring-1 ring-emerald-500/20 dark:ring-emerald-500/30"
                    : `bg-white/80 dark:bg-white/[0.03] border-zinc-200/80 dark:border-white/[0.07] hover:bg-white dark:hover:bg-white/[0.07] hover:border-zinc-300 ${theme.hoverBorder} hover:-translate-y-0.5 shadow-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100`
                }`}
              >
                {/* 左侧主题彩色装饰条 */}
                <div
                  className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all duration-200 ${
                    isSelected ? "bg-emerald-500 dark:bg-emerald-400 shadow-sm shadow-emerald-400" : `bg-gradient-to-b ${theme.stripe} opacity-60 dark:opacity-40 group-hover:opacity-100`
                  }`}
                  aria-hidden="true"
                />

                <div className="flex items-stretch justify-between pl-3">
                  <button
                    type="button"
                    className="flex-1 min-w-0 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-l-xl cursor-pointer"
                    onClick={() => onSelect(project.id)}
                    aria-current={isSelected ? "page" : undefined}
                  >
                    <span className={`block font-bold text-sm truncate ${isSelected ? "text-emerald-950 dark:text-white font-extrabold" : "text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white"}`}>
                      {project.title}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400/90 mt-1 truncate">
                      {project.topic}
                    </span>
                    <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400/90 mt-2.5 tracking-wide">
                      {project.progress.done}/{project.progress.total} 已完成
                    </span>
                  </button>

                  <div className="flex flex-col items-center justify-start gap-1 p-2 pt-2.5">
                    <button
                      type="button"
                      className="p-1.5 text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 rounded-lg transition-colors cursor-pointer"
                      title={`编辑 ${project.title}`}
                      onClick={() => onEdit(project.id)}
                    >
                      <Pencil size={13} />
                      <span className="sr-only">编辑 {project.title}</span>
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                      title={`删除 ${project.title}`}
                      onClick={() => onDelete(project)}
                    >
                      <Trash2 size={13} />
                      <span className="sr-only">删除 {project.title}</span>
                    </button>
                  </div>
                </div>

                {/* 底部彩色微进度条 */}
                <div className="px-3 pb-2 pt-0" aria-hidden="true">
                  <div className="h-1 w-full bg-zinc-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${isSelected ? "from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300" : theme.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </nav>
      </div>

      <div className="relative z-10 pt-4 border-t border-zinc-200/80 dark:border-white/[0.08]">
        <Button
          variant="primary"
          fullWidth
          className="py-3.5 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20 dark:bg-gradient-to-r dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-500 dark:hover:from-emerald-500 dark:hover:to-teal-400 dark:shadow-lg dark:shadow-emerald-950/60 border border-emerald-600 dark:border-emerald-400/30 rounded-xl transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
          onClick={onCreate}
        >
          <Plus size={16} className="stroke-[2.5]" />
          新建学习路线
        </Button>
      </div>
    </aside>
  );
}

