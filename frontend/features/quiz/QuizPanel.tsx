"use client";

import { Alert, Button, Label, NumberField, Spinner, TextArea, TextField } from "@heroui/react";

import { AlertCircle, Check } from "lucide-react";
import { useEffect, useState } from "react";

import { SelectField } from "../../components/ui/SelectField";
import { generateQuiz, submitQuizAnswer, type QuizAnswer, type QuizGeneration, type WorkspaceNode } from "../../lib/api";
import { formatError } from "../../lib/errors";

type LoadState = "idle" | "loading" | "ready" | "error";

const questionTypes = [
  { id: "mixed", label: "混合" },
  { id: "choice", label: "选择" },
  { id: "fill", label: "填空" },
  { id: "short", label: "简答" },
  { id: "practice", label: "实操" },
];

export function QuizPanel({ projectId, nodes }: { projectId: number; nodes: WorkspaceNode[] }) {
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [count, setCount] = useState(3);
  const [qtype, setQtype] = useState("mixed");
  const [quiz, setQuiz] = useState<QuizGeneration | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<QuizAnswer | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nodeSelectionKey = nodes.map((node) => node.id).join(",");
  const selectedNode = nodes.find((node) => String(node.id) === selectedNodeId) ?? null;
  useEffect(() => { setSelectedNodeId(""); setQuiz(null); setIndex(0); setAnswer(""); setFeedback(null); setError(null); }, [projectId, nodeSelectionKey]);
  const question = quiz?.questions[index] ?? null;
  const busy = state === "loading" || submitting;
  const generate = async () => {
    if (!selectedNodeId) { setError("请选择一个知识点"); return; }
    setState("loading"); setError(null);
    try { const next = await generateQuiz(projectId, { node_ids: [Number(selectedNodeId)], count, qtype }); setQuiz(next); setIndex(0); setAnswer(""); setFeedback(null); setState("ready"); }
    catch (generationError) { setError(formatError(generationError)); setState("error"); }
  };
  const submit = async () => {
    if (!question || !answer.trim()) { setError("请输入答案后再提交"); return; }
    if (submitting || feedback) return;
    setSubmitting(true); setError(null);
    try { setFeedback(await submitQuizAnswer(projectId, question.id, answer)); }
    catch (submissionError) { setError(formatError(submissionError)); }
    finally { setSubmitting(false); }
  };
  const next = () => { setIndex((value) => value + 1); setAnswer(""); setFeedback(null); setError(null); };
  return <section className="quiz-panel"><div className="section-heading"><div><p className="eyebrow">KNOWLEDGE CHECK</p><h3>查漏测验</h3></div></div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto] sm:items-end">
      <SelectField label="知识点" value={selectedNodeId || null} options={nodes.map((node) => ({ id: String(node.id), label: `${node.code} ${node.title}` }))} onChange={setSelectedNodeId} isDisabled={!nodes.length || busy} placeholder={nodes.length ? "请选择知识点" : "当前项目没有知识点"} className="min-w-0" />
      <NumberField value={count} onChange={setCount} minValue={1} maxValue={20} isDisabled={busy} fullWidth><Label>题目数量</Label><NumberField.Group><NumberField.DecrementButton aria-label="减少题目数量" /><NumberField.Input /><NumberField.IncrementButton aria-label="增加题目数量" /></NumberField.Group></NumberField>
      <SelectField label="题型" value={qtype} options={questionTypes} onChange={setQtype} isDisabled={busy} className="min-w-0" />
      <Button variant="primary" type="button" onClick={() => void generate()} isDisabled={!nodes.length || busy}>生成测验</Button>
    </div>
    {!nodes.length && <p className="text-xs leading-relaxed text-muted">当前项目没有知识点，请先在学习路线中保存知识点，再回来生成测验。</p>}
    {selectedNode && <p className="text-xs font-bold leading-relaxed text-brand-ink wrap-anywhere">已选：{selectedNode.code} {selectedNode.title}</p>}
    {state === "loading" && <div className="review-state" aria-busy="true"><Spinner size="sm" color="accent" aria-label="正在处理测验" /><span>正在处理测验</span></div>}
    {error && <Alert status="danger" role="alert"><Alert.Indicator><AlertCircle size={16} aria-hidden="true" /></Alert.Indicator><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert>}
    {question && state !== "loading" && <div className="flex flex-col gap-3 border border-border border-l-4 border-l-amber bg-surface p-5">
      <span className="text-xs font-bold text-muted">第 {index + 1} / {quiz?.questions.length} 题 · {question.qtype}</span>
      <strong className="font-serif text-xl leading-relaxed">{question.stem}</strong>
      {question.options.length > 0 && <div className="flex flex-col gap-2" role="group" aria-label="选项">{question.options.map((option) => {
        const selected = answer === option;
        return <Button key={option} variant={selected ? "primary" : "secondary"} type="button" aria-pressed={selected} isDisabled={busy || Boolean(feedback)} className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => setAnswer(option)}>{selected && <Check size={15} aria-hidden="true" />}<span className="wrap-anywhere">{option}</span></Button>;
      })}</div>}
      <TextField value={answer} onChange={setAnswer} isDisabled={busy || Boolean(feedback)}><Label>你的答案</Label><TextArea rows={3} placeholder="输入你的答案" /></TextField>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" type="button" onClick={() => void submit()} isDisabled={busy || Boolean(feedback)}>{submitting && <Spinner size="sm" color="current" aria-hidden="true" />}提交答案</Button>
        {submitting && <span role="status" className="text-xs font-bold text-muted">正在提交答案</span>}
      </div>
      {feedback && <Alert status={feedback.is_correct ? "success" : "danger"} role="status" aria-label={feedback.is_correct ? "回答正确" : "需要巩固"}><Alert.Indicator /><Alert.Content><Alert.Title>{feedback.is_correct ? "回答正确" : "需要巩固"}</Alert.Title><Alert.Description>{feedback.feedback}</Alert.Description>{feedback.mastery !== null && <span className="font-bold">当前掌握度 {Math.round(feedback.mastery * 100)}%</span>}{index + 1 < (quiz?.questions.length ?? 0) && <Button variant="secondary" type="button" className="mt-2 w-fit" onClick={next}>下一题</Button>}</Alert.Content></Alert>}
    </div>}
  </section>;
}
