"use client";

import { Button, Description, FieldError, Input, Label, NumberField, Spinner, TextArea, TextField } from "@heroui/react";

import { AlertCircle, ArrowRight, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  cancelContentPreparation,
  createProject,
  getContentPreparation,
  prepareProjectContent,
  previewRoadmap,
  refineRoadmap,
  retryContentPreparation,
  type ContentPreparation,
  type RoadmapPreview,
} from "../../lib/api";
import { formatError } from "../../lib/errors";

type CreationState = "idle" | "previewing" | "ready" | "saving" | "preparing" | "error";

export function RoadmapCreation({ onCreated }: { onCreated: (projectId: number) => void }) {
  const [topic, setTopic] = useState("");
  const [background, setBackground] = useState("");
  const [goal, setGoal] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState<RoadmapPreview | null>(null);
  const [creation, setCreation] = useState<ContentPreparation | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [state, setState] = useState<CreationState>("idle");
  const [jobAction, setJobAction] = useState<"cancel" | "retry" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creation || (creation.status !== "doing" && creation.status !== "cancelling")) return;
    const timer = window.setInterval(() => {
      void getContentPreparation(creation.project_id, creation.job_id)
        .then((current) => setCreation(current))
        .catch((pollError) => {
          window.clearInterval(timer);
          setError(formatError(pollError, "本地学习服务不可用，请确认 FastAPI 已启动。"));
          setState("error");
        });
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [creation]);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setState("previewing");
    setError(null);
    try {
      setPreview(await previewRoadmap({ topic, background, goal, weekly_hours: weeklyHours }));
      setState("ready");
    } catch (generateError) {
      setError(formatError(generateError, "本地学习服务不可用，请确认 FastAPI 已启动。"));
      setState("error");
    }
  };

  const refine = async () => {
    if (!preview || !instruction.trim()) return;
    setState("previewing");
    setError(null);
    try {
      const result = await refineRoadmap(preview.roadmap, instruction.trim());
      setPreview({ ...preview, roadmap: result.roadmap });
      setInstruction("");
      setState("ready");
    } catch (refineError) {
      setError(formatError(refineError, "本地学习服务不可用，请确认 FastAPI 已启动。"));
      setState("error");
    }
  };

  const save = async () => {
    if (!preview) return;
    setState("saving");
    setError(null);
    try {
      const project = await createProject({ topic, background, goal, weekly_hours: weeklyHours, roadmap: preview.roadmap });
      setState("preparing");
      const preparation = await prepareProjectContent(project.project_id);
      setCreation(preparation);
      setCreatedProjectId(project.project_id);
    } catch (saveError) {
      setError(formatError(saveError, "本地学习服务不可用，请确认 FastAPI 已启动。"));
      setState("error");
    }
  };

  const cancelPreparation = async () => {
    if (!creation || jobAction) return;
    setError(null);
    setJobAction("cancel");
    try {
      setCreation(await cancelContentPreparation(creation.project_id, creation.job_id));
    } catch (cancelError) {
      setError(formatError(cancelError, "本地学习服务不可用，请确认 FastAPI 已启动。"));
    } finally {
      setJobAction(null);
    }
  };

  const retryPreparation = async () => {
    if (!creation || jobAction) return;
    setError(null);
    setJobAction("retry");
    try {
      setCreation(await retryContentPreparation(creation.project_id, creation.job_id));
    } catch (retryError) {
      setError(formatError(retryError, "本地学习服务不可用，请确认 FastAPI 已启动。"));
    } finally {
      setJobAction(null);
    }
  };

  const isBusy = state === "previewing" || state === "saving" || state === "preparing";
  const cancelling = creation?.status === "cancelling";
  return (
    <main className="roadmap-creation">
      <header className="creation-header">
        <p className="eyebrow">NEW LEARNING PATH</p>
        <h2>规划一条可执行的学习路线</h2>
        <p>先生成并审阅路线，再保存项目。内容准备作为独立作业持续显示状态。</p>
      </header>

      <form
        className="roadmap-create-form mt-[30px] grid grid-cols-2 gap-[18px] max-[760px]:grid-cols-1"
        onSubmit={(event) => void generate(event)}
      >
        <TextField className="col-span-full" value={topic} onChange={setTopic} isRequired maxLength={300}>
          <Label>选题</Label>
          <Input placeholder="例如：从零学习 Transformer" />
          <FieldError>请填写选题。</FieldError>
        </TextField>

        <TextField className="col-span-full" value={background} onChange={setBackground} maxLength={4000}>
          <Label>学习背景</Label>
          <TextArea rows={3} placeholder="已有 Python 基础，了解神经网络" />
        </TextField>

        <TextField className="col-span-full" value={goal} onChange={setGoal} maxLength={4000}>
          <Label>学习目标</Label>
          <TextArea rows={3} placeholder="能理解论文并实现小型模型" />
        </TextField>

        <NumberField value={weeklyHours} onChange={setWeeklyHours} isRequired minValue={1} maxValue={168} className="max-w-56">
          <Label>每周投入时间</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>1 到 168 小时。</Description>
          <FieldError>每周投入时间需要在 1 到 168 小时之间。</FieldError>
        </NumberField>

        <Button variant="primary" type="submit" className="col-span-full justify-self-start" isDisabled={isBusy}>
          {state === "previewing" ? <Spinner size="sm" aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
          {state === "previewing" ? "正在生成" : "生成路线预览"}
        </Button>
      </form>

      {error && <div className="creation-error" role="alert"><AlertCircle size={19} aria-hidden="true" /><span>{error}</span><Button variant="ghost" size="sm" type="button" onClick={() => setError(null)}>关闭</Button></div>}

      {preview && (
        <section className="roadmap-preview" aria-live="polite">
          <div className="preview-heading"><div><p className="eyebrow">PREVIEW</p><h3>{preview.roadmap.summary}</h3></div><span>{preview.roadmap.nodes.length} 个节点</span></div>
          {(preview.audit.verdict || preview.audit.score !== undefined) && <div className="audit-note"><strong>路线审计</strong><span>{preview.audit.score ?? "-"} 分 · {preview.audit.verdict ?? "已完成"}</span></div>}
          <ol className="preview-nodes">{preview.roadmap.nodes.map((node) => <li key={node.code}><span>{node.code}</span><div><strong>{node.title}</strong><p>{node.description}</p></div><em>{node.est_hours} 小时</em></li>)}</ol>
          <div className="roadmap-refine mt-[18px] grid grid-cols-[minmax(0,1fr)_auto] items-end gap-[9px] max-[760px]:grid-cols-1">
            <TextField value={instruction} onChange={setInstruction} maxLength={4000}>
              <Label>调整指令</Label>
              <Input placeholder="例如：增加一个实操项目" />
            </TextField>
            <Button variant="secondary" type="button" className="justify-self-start" onClick={() => void refine()} isDisabled={isBusy || !instruction.trim()}>
              {state === "previewing" ? <Spinner size="sm" aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
              调整
            </Button>
          </div>
          <Button variant="primary" type="button" className="save-route" onClick={() => void save()} isDisabled={isBusy}>
            {state === "saving" || state === "preparing" ? <Spinner size="sm" aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            {state === "saving" ? "正在保存项目" : state === "preparing" ? "正在启动内容准备" : "确认保存并开始准备"}
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </section>
      )}

      {creation && <section className={`content-job job-${creation.status}`} role="status">{creation.status === "doing" || cancelling ? <Spinner size="sm" aria-hidden="true" /> : creation.status === "done" ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertCircle size={20} aria-hidden="true" />}<div><strong>{creation.status === "doing" ? "课程内容正在准备" : creation.status === "cancelling" ? "正在停止课程准备" : creation.status === "done" ? "课程内容已准备完成" : creation.status === "cancelled" ? "课程内容准备已取消" : "课程内容准备受阻"}</strong><span>已生成 {creation.generated_node_ids.length} 节，待处理 {creation.pending_node_ids.length} 节，失败 {creation.failed_node_ids.length} 节，第 {creation.attempts} 次尝试。</span>{creation.error && <span>{creation.error}</span>}<div className="detail-actions">{creation.status === "doing" && <Button variant="secondary" type="button" isDisabled={jobAction === "cancel"} onClick={() => void cancelPreparation()}>{jobAction === "cancel" && <Spinner size="sm" aria-hidden="true" />}停止准备</Button>}{(creation.status === "blocked" || creation.status === "cancelled") && creation.pending_node_ids.length + creation.failed_node_ids.length > 0 && <Button variant="secondary" type="button" isDisabled={jobAction === "retry"} onClick={() => void retryPreparation()}>{jobAction === "retry" && <Spinner size="sm" aria-hidden="true" />}重试未完成内容</Button>}{createdProjectId && <Button variant="ghost" size="sm" type="button" onClick={() => onCreated(createdProjectId)}>查看新项目</Button>}</div></div></section>}
    </main>
  );
}
