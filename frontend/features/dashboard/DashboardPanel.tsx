"use client";

import { Alert, Button, Spinner } from "@heroui/react";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { IconButton } from "../../components/ui/IconButton";
import { apiUrl, getDashboard, type Dashboard } from "../../lib/api";
import { formatError } from "../../lib/errors";
import { statusLabels } from "../roadmap/NodeStatusControl";

type LoadState = "loading" | "ready" | "error";

const exportTargets = [
  { kind: "roadmap", label: "路线 JSON" },
  { kind: "markdown", label: "学习笔记" },
  { kind: "report", label: "进度报告 HTML" },
  { kind: "anki", label: "Anki ZIP" },
];

export function DashboardPanel({ projectId }: { projectId: number }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      setDashboard(await getDashboard(projectId));
      setState("ready");
    } catch (loadError) {
      setError(formatError(loadError));
      setState("error");
    }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  const download = (kind: string) => { window.location.assign(apiUrl(`/projects/${projectId}/exports/${kind}`)); };
  return <section className="dashboard-panel"><div className="section-heading"><div><p className="eyebrow">LEARNING DASHBOARD</p><h3>学习概览</h3></div><IconButton label="刷新学习看板" isDisabled={state === "loading"} onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" /></IconButton></div>
    {state === "loading" && <div className="review-state" aria-busy="true"><Spinner size="sm" color="accent" aria-label="正在读取学习看板" /><span>正在读取学习看板</span></div>}
    {state === "error" && <Alert status="danger" role="alert"><Alert.Indicator><AlertCircle size={16} aria-hidden="true" /></Alert.Indicator><Alert.Content><Alert.Title>看板数据暂时不可用</Alert.Title><Alert.Description>{error}</Alert.Description><Button variant="danger-soft" size="sm" className="mt-2 w-fit" onClick={() => void load()}>重试</Button></Alert.Content></Alert>}
    {dashboard && state === "ready" && <>
      <div className="dashboard-metrics"><div><strong>{dashboard.metrics.total_nodes}</strong><span>知识点</span></div><div><strong>{dashboard.metrics.mastered_nodes}</strong><span>已掌握</span></div><div><strong>{Math.round(dashboard.metrics.avg_mastery * 100)}%</strong><span>平均掌握</span></div><div><strong>{dashboard.metrics.week_minutes}</strong><span>近 7 天分钟</span></div><div><strong>{dashboard.metrics.due_cards}/{dashboard.metrics.total_cards}</strong><span>到期卡片</span></div></div>
      <div className="dashboard-detail">
        <div><strong>状态分布</strong>{Object.entries(dashboard.status_counts).map(([key, value]) => <p key={key}>{statusLabels[key] ?? key} <b>{value}</b></p>)}</div>
        <div>
          <strong>近 14 天学习热力</strong>
          <p className="mt-2 text-xs leading-relaxed text-muted">每个格子代表一天，格子内数字是当天学习的分钟数，颜色填充越高表示学习时间越长。</p>
          {dashboard.heatmap.length === 0
            ? <p className="text-xs leading-relaxed text-muted">近 14 天还没有学习记录。</p>
            : <ul className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-14" aria-label="近 14 天学习热力">
              {dashboard.heatmap.map((day) => <li key={day.date} className="flex flex-col items-center gap-1">
                <span role="img" aria-label={`${day.date} 学习 ${day.minutes} 分钟`} title={`${day.date}：${day.minutes} 分钟`} className="flex h-8 w-full items-end overflow-hidden rounded-sm border border-border bg-panel-soft">
                  <span className="block w-full rounded-sm bg-brand-ink" style={{ height: day.minutes === 0 ? "0%" : `${Math.min(100, Math.max(25, Math.round((day.minutes / 60) * 100)))}%` }} />
                </span>
                <span className="text-[10px] font-bold text-muted tabular-nums">{day.minutes}</span>
              </li>)}
            </ul>}
        </div>
      </div>
      <article className="dashboard-report">{dashboard.latest_report}</article>
      <div className="flex flex-wrap gap-2">{exportTargets.map((target) => <Button key={target.kind} variant="secondary" type="button" onClick={() => download(target.kind)}>{target.label}</Button>)}</div>
      <p className="export-hint">进度报告为 HTML 文件，下载后可使用浏览器打印功能保存为 PDF。</p>
    </>}
  </section>;
}
