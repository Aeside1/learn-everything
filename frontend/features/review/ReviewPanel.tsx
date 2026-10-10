"use client";

import { Button } from "@heroui/react";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getDueCards, submitReview, type ReviewCard } from "../../lib/api";
import { formatError } from "../../lib/errors";

type LoadState = "loading" | "ready" | "error";

export function ReviewPanel({ projectId }: { projectId: number }) {
  const [card, setCard] = useState<ReviewCard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const load = useCallback(async () => {
    setState("loading");
    setError(null);
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
    if (!card) return;
    setState("loading");
    try {
      const result = await submitReview(card.id, rating, projectId);
      setCard(result.next_card);
      setShowBack(false);
      setState("ready");
    } catch (reviewError) {
      setError(formatError(reviewError));
      setState("error");
    }
  };
  return <section className="review-panel"><div className="section-heading"><div><p className="eyebrow">FSRS REVIEW</p><h3>到期复习</h3></div><Button variant="ghost" size="sm" type="button"  onClick={() => void load()}>刷新</Button></div>
    {state === "loading" && <div className="review-state"><LoaderCircle className="spin" size={18} />正在读取复习卡片</div>}
    {state === "error" && <div className="review-state detail-error"><AlertCircle size={18} />{error}<Button variant="ghost" size="sm" type="button"  onClick={() => void load()}>重试</Button></div>}
    {state === "ready" && !card && <div className="review-state">当前没有到期卡片。</div>}
    {state === "ready" && card && <div className="review-card"><strong>{card.front}</strong>{showBack && <p>{card.back}</p>}<Button variant="secondary" type="button"  onClick={() => setShowBack((value) => !value)}>{showBack ? "隐藏答案" : "查看答案"}</Button><div className="review-actions"><Button variant="secondary" type="button" onClick={() => void review(1)}>重来</Button><Button variant="secondary" type="button" onClick={() => void review(2)}>困难</Button><Button variant="secondary" type="button" onClick={() => void review(3)}>良好</Button><Button variant="secondary" type="button" onClick={() => void review(4)}>简单</Button></div></div>}
  </section>;
}
