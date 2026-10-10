"use client";

import { Alert, Button, Spinner } from "@heroui/react";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { IconButton } from "../../components/ui/IconButton";
import { getDueCards, submitReview, type ReviewCard } from "../../lib/api";
import { formatError } from "../../lib/errors";

type LoadState = "loading" | "ready" | "error";

const ratings = [
  { rating: 1, label: "重来" },
  { rating: 2, label: "困难" },
  { rating: 3, label: "良好" },
  { rating: 4, label: "简单" },
];

export function ReviewPanel({ projectId }: { projectId: number }) {
  const [card, setCard] = useState<ReviewCard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    setSubmitting(false);
    try {
      const queue = await getDueCards(projectId);
      setCard(queue.cards[0] ?? null);
      setShowBack(false);
      setState("ready");
    } catch (loadError) {
      setError(formatError(loadError));
      setState("error");
    }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  const review = async (rating: number) => {
    if (!card || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitReview(card.id, rating, projectId);
      setCard(result.next_card);
      setShowBack(false);
    } catch (reviewError) {
      setError(formatError(reviewError));
    } finally {
      setSubmitting(false);
    }
  };
  return <section className="review-panel"><div className="section-heading"><div><p className="eyebrow">FSRS REVIEW</p><h3>到期复习</h3></div><IconButton label="刷新到期复习" isDisabled={state === "loading" || submitting} onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" /></IconButton></div>
    {state === "loading" && <div className="review-state" aria-busy="true"><Spinner size="sm" color="accent" aria-label="正在读取复习卡片" /><span>正在读取复习卡片</span></div>}
    {state === "error" && <Alert status="danger" role="alert"><Alert.Indicator><AlertCircle size={16} aria-hidden="true" /></Alert.Indicator><Alert.Content><Alert.Title>复习卡片暂时不可用</Alert.Title><Alert.Description>{error}</Alert.Description><Button variant="danger-soft" size="sm" className="mt-2 w-fit" onClick={() => void load()}>重试</Button></Alert.Content></Alert>}
    {state === "ready" && <>
      {error && <Alert status="danger" role="alert"><Alert.Indicator><AlertCircle size={16} aria-hidden="true" /></Alert.Indicator><Alert.Content><Alert.Title>评分没有提交成功</Alert.Title><Alert.Description>{error}</Alert.Description></Alert.Content></Alert>}
      {!card && <div className="review-state">当前没有到期卡片。</div>}
      {card && <div className="review-card"><strong>{card.front}</strong>{showBack && <p>{card.back}</p>}
        <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" type="button" isDisabled={submitting} onClick={() => setShowBack((value) => !value)}>{showBack ? "隐藏答案" : "查看答案"}</Button>{submitting && <span role="status" className="flex items-center gap-2 text-xs font-bold text-muted"><Spinner size="sm" color="accent" aria-hidden="true" />正在提交评分</span>}</div>
        <div className="flex flex-wrap gap-2" aria-label="复习评分" role="group">{ratings.map((item) => <Button key={item.rating} variant="secondary" type="button" isDisabled={submitting} onClick={() => void review(item.rating)}>{item.label}</Button>)}</div>
      </div>}
    </>}
  </section>;
}
