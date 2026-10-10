"use client";

import { Button } from "@heroui/react";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { apiUrl, getDashboard, type Dashboard } from "../../lib/api";
import { formatError } from "../../lib/errors";
import { statusLabels } from "../roadmap/NodeStatusControl";

type LoadState = "loading" | "ready" | "error";

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
  return <section className="dashboard-panel"><div className="section-heading"><div><p className="eyebrow">LEARNING DASHBOARD</p><h3>学习概览</h3></div><Button variant="ghost" size="sm" type="button"  onClick={() => void load()}>刷新</Button></div>
    {state === "loading" && <div className="review-state"><LoaderCircle className="spin" size={18} />正在读取看板</div>}
    {state === "error" && <div className="review-state detail-error"><AlertCircle size={18} />{error}<Button variant="ghost" size="sm" type="button"  onClick={() => void load()}>重试</Button></div>}
    {dashboard && state === "ready" && <><div className="dashboard-metrics"><div><strong>{dashboard.metrics.total_nodes}</strong><span>知识点</span></div><div><strong>{dashboard.metrics.mastered_nodes}</strong><span>已掌握</span></div><div><strong>{Math.round(dashboard.metrics.avg_mastery * 100)}%</strong><span>平均掌握</span></div><div><strong>{dashboard.metrics.week_minutes}</strong><span>近 7 天分钟</span></div><div><strong>{dashboard.metrics.due_cards}/{dashboard.metrics.total_cards}</strong><span>到期卡片</span></div></div><div className="dashboard-detail"><div><strong>状态分布</strong>{Object.entries(dashboard.status_counts).map(([key, value]) => <p key={key}>{statusLabels[key] ?? key} <b>{value}</b></p>)}</div><div><strong>近 14 天学习热力</strong><div className="heatmap">{dashboard.heatmap.map((day) => <span title={`${day.date}: ${day.minutes} 分钟`} style={{ opacity: day.minutes ? Math.min(1, 0.25 + day.minutes / 60) : 0.1 }} key={day.date}>{day.minutes}</span>)}</div></div></div><article className="dashboard-report">{dashboard.latest_report}</article><div className="export-actions"><Button variant="secondary" type="button" onClick={() => download("roadmap")}>路线 JSON</Button><Button variant="secondary" type="button" onClick={() => download("markdown")}>学习笔记</Button><Button variant="secondary" type="button" onClick={() => download("report")}>进度报告 HTML</Button><Button variant="secondary" type="button" onClick={() => download("anki")}>Anki ZIP</Button></div><p className="export-hint">进度报告为 HTML 文件，下载后可使用浏览器打印功能保存为 PDF。</p></>}
  </section>;
}
