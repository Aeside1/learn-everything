"use client";

import { Alert, Button, Input, Label, Spinner, TextField } from "@heroui/react";

import { AlertCircle, FileUp, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { IconButton } from "../../components/ui/IconButton";
import { SelectField } from "../../components/ui/SelectField";
import {
  ApiError,
  deleteNodeResource,
  getResourceDeletionPreview,
  listNodeResources,
  streamResourceUpload,
  type IndexedResource,
  type WorkspaceNode,
} from "../../lib/api";

type State = "idle" | "loading" | "uploading" | "deleting" | "error";

const FILE_INPUT_ID = "resource-upload-file";

export function ResourceLibraryPanel({ nodes }: { nodes: WorkspaceNode[] }) {
  const [nodeId, setNodeId] = useState<number | null>(nodes[0]?.id ?? null);
  const [resources, setResources] = useState<IndexedResource[]>([]);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<{ id: number; phrase: string; input: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const uploading = state === "uploading";
  const deletingBusy = state === "deleting";
  const busy = uploading || deletingBusy;

  useEffect(() => { setNodeId(nodes[0]?.id ?? null); }, [nodes]);
  const load = useCallback(async () => {
    if (!nodeId) { setResources([]); return; }
    setState("loading"); setMessage(null);
    try { setResources(await listNodeResources(nodeId)); setState("idle"); }
    catch (error) { setState("error"); setMessage(error instanceof ApiError ? error.message : "无法读取资料列表"); }
  }, [nodeId]);
  useEffect(() => { void load(); }, [load]);

  const upload = async () => {
    if (busy) return;
    const file = fileInput.current?.files?.[0];
    if (!nodeId || !file) { setMessage("请选择一个知识点和资料文件"); return; }
    setState("uploading"); setMessage(null); setProgress([]);
    try {
      await streamResourceUpload(nodeId, file, (event) => setProgress((current) => [...current, event.message ?? event.kind]));
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (error) { setState("error"); setMessage(error instanceof ApiError ? error.message : "资料索引失败"); }
  };
  const beginDelete = async (resource: IndexedResource) => {
    if (!nodeId || busy) return;
    try { const preview = await getResourceDeletionPreview(nodeId, resource.resource_id); setDeleting({ id: resource.resource_id, phrase: preview.confirmation_phrase, input: "" }); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "无法准备删除资料"); }
  };
  const confirmDelete = async () => {
    if (!nodeId || !deleting || deletingBusy) return;
    setState("deleting"); setMessage(null);
    try { await deleteNodeResource(nodeId, deleting.id, deleting.input); setDeleting(null); await load(); }
    catch (error) { setState("error"); setMessage(error instanceof ApiError ? error.message : "删除资料失败"); }
  };

  return <section className="resource-library-panel">
    <div className="section-heading">
      <div><p className="eyebrow">RESOURCE LIBRARY</p><h3>资料库</h3></div>
      <IconButton label="刷新资料" onClick={() => void load()} isDisabled={state === "loading" || busy}>
        <RefreshCw size={17} aria-hidden="true" />
      </IconButton>
    </div>

    <div className="grid min-w-0 items-end gap-2.5 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_auto]">
      <SelectField
        label="知识点"
        value={nodeId === null ? null : String(nodeId)}
        options={nodes.map((node) => ({ id: String(node.id), label: `${node.code} ${node.title}` }))}
        onChange={(value) => setNodeId(value === "" ? null : Number(value))}
        isDisabled={busy}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={FILE_INPUT_ID} className="text-sm font-semibold text-foreground">本地文件</label>
        <input
          id={FILE_INPUT_ID}
          ref={fileInput}
          type="file"
          accept=".txt,.md,.pdf,.docx,.html"
          disabled={busy}
          className="h-10 w-full min-w-0 cursor-pointer rounded-lg border border-border bg-field px-2.5 py-1 text-sm text-foreground file:mr-2.5 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-soft file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-ink focus-visible:focus-ring disabled:status-disabled"
        />
      </div>
      <Button variant="primary" type="button" className="justify-center" onClick={() => void upload()} isDisabled={busy || !nodeId}>
        {uploading ? <Spinner size="sm" color="current" aria-hidden="true" /> : <FileUp size={16} aria-hidden="true" />}
        上传并索引
      </Button>
    </div>

    {state === "loading" && <div className="flex items-center gap-2.5 p-3.5 text-sm text-muted"><Spinner size="sm" color="success" aria-label="正在读取资料" />正在读取资料</div>}
    {uploading && <div className="grid gap-1.5 border-l-4 border-l-accent bg-brand-soft p-3.5 text-sm text-brand-ink">
      {progress.length ? progress.map((item, index) => <span key={`${item}-${index}`}>{item}</span>) : <span>正在建立索引任务</span>}
    </div>}
    {message && <Alert status="danger">
      <Alert.Indicator><AlertCircle size={17} aria-hidden="true" /></Alert.Indicator>
      <Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content>
    </Alert>}
    {resources.length === 0 && state !== "loading" && <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">当前知识点还没有已上传资料。</div>}

    <div className="grid gap-2">
      {resources.map((resource) => {
        const accent = resource.status === "completed" ? "border-l-accent" : resource.status === "failed" ? "border-l-danger" : "border-l-warning";
        return <article className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 rounded-lg border border-border border-l-4 bg-surface p-3.5 ${accent}`} key={resource.resource_id}>
          <div className="grid min-w-0 gap-1">
            <strong className="truncate text-foreground" title={resource.title}>{resource.title}</strong>
            <span className="text-xs text-muted">{resource.status === "completed" ? "已索引" : resource.status === "failed" ? "索引失败" : "索引中"} · {resource.rtype}</span>
            {resource.message && <p className="m-0 text-xs text-alert-ink">{resource.message}</p>}
          </div>
          <IconButton label={`删除 ${resource.title}`} variant="danger-soft" onClick={() => void beginDelete(resource)} isDisabled={busy}>
            <Trash2 size={16} aria-hidden="true" />
          </IconButton>
          {deleting?.id === resource.resource_id && <div className="col-span-full grid items-center gap-2 border-t border-border pt-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <span className="text-sm text-alert-ink md:col-span-full">输入“{deleting.phrase}”确认删除该资料索引。</span>
            <TextField value={deleting.input} onChange={(value) => setDeleting((current) => current && { ...current, input: value })} isDisabled={deletingBusy}>
              <Label className="sr-only">删除确认词</Label>
              <Input />
            </TextField>
            <Button variant="danger" type="button" onClick={() => void confirmDelete()} isDisabled={deleting.input !== deleting.phrase || deletingBusy}>
              {deletingBusy && <Spinner size="sm" color="current" aria-hidden="true" />}
              确认删除
            </Button>
            <Button variant="secondary" type="button" onClick={() => setDeleting(null)} isDisabled={deletingBusy}>取消</Button>
          </div>}
        </article>;
      })}
    </div>
  </section>;
}
