"use client";

import { Alert, Button, Checkbox, Disclosure, Label, Spinner, TextArea, TextField } from "@heroui/react";

import { AlertCircle, MessageSquareText, RotateCcw, Send, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { IconButton } from "../../components/ui/IconButton";
import { SelectField } from "../../components/ui/SelectField";
import { ApiError, listNodeResources, streamRagChat, type IndexedResource, type RagExcerpt, type WorkspaceNode } from "../../lib/api";

type Message = { role: "user" | "assistant"; content: string; excerpts?: RagExcerpt[] };

export function RagChatPanel({ nodes }: { nodes: WorkspaceNode[] }) {
  const [nodeId, setNodeId] = useState<number | null>(nodes[0]?.id ?? null);
  const [resources, setResources] = useState<IndexedResource[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const latestQuestion = useRef("");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => { setNodeId(nodes[0]?.id ?? null); }, [nodes]);
  const loadScope = useCallback(async () => {
    if (!nodeId) { setResources([]); setSelectedIds([]); return; }
    setScopeLoading(true); setError(null);
    try {
      const indexed = (await listNodeResources(nodeId)).filter((item) => item.status === "completed" && item.collection_id && item.source_id);
      const collection = indexed[0]?.collection_id;
      const inCollection = indexed.filter((item) => item.collection_id === collection);
      setResources(inCollection);
      setSelectedIds(inCollection.map((item) => item.source_id!));
      setMessages([]);
    } catch (loadError) {
      setResources([]); setSelectedIds([]);
      setError(loadError instanceof ApiError ? loadError.message : "无法读取可问答资料");
    } finally { setScopeLoading(false); }
  }, [nodeId]);
  useEffect(() => { void loadScope(); }, [loadScope]);

  const collectionId = resources[0]?.collection_id ?? "";
  const toggleSource = (sourceId: string) => setSelectedIds((current) => current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId]);
  const ask = async (retry = false) => {
    const message = (retry ? latestQuestion.current : question).trim();
    if (!message || !collectionId || !selectedIds.length) { setError("请选择至少一份已完成索引的资料后再提问"); return; }
    latestQuestion.current = message;
    setError(null); setRunning(true);
    setMessages((current) => [...current, { role: "user", content: message }, { role: "assistant", content: "" }]);
    controller.current = new AbortController();
    try {
      await streamRagChat({ collection_id: collectionId, conversation_id: crypto.randomUUID(), message, history: messages.map(({ role, content }) => ({ role, content })), file_ids: selectedIds }, controller.current.signal, (event) => {
        if (event.kind === "evidence") setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, excerpts: event.excerpts } : item));
        if (event.kind === "answer_delta") setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: `${item.content}${event.text ?? ""}` } : item));
        if (event.kind === "error") setError(event.text ?? "知识问答失败");
      });
      if (!retry) setQuestion("");
    } catch (streamError) {
      if (!(streamError instanceof DOMException && streamError.name === "AbortError")) setError(streamError instanceof ApiError ? streamError.message : "知识问答连接中断");
    } finally { setRunning(false); controller.current = null; }
  };

  return <section className="rag-chat-panel">
    <div className="section-heading">
      <div><p className="eyebrow">KNOWLEDGE Q&amp;A</p><h3>资料问答</h3></div>
      <MessageSquareText size={22} aria-hidden="true" />
    </div>

    <div className="grid min-w-0 gap-2.5 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)]">
      <SelectField
        label="知识点"
        value={nodeId === null ? null : String(nodeId)}
        options={nodes.map((node) => ({ id: String(node.id), label: `${node.code} ${node.title}` }))}
        onChange={(value) => setNodeId(value === "" ? null : Number(value))}
        isDisabled={running}
      />
      <div className="grid content-start gap-1.5 rounded-lg border border-border bg-surface p-2.5">
        <span className="text-sm font-semibold text-foreground">问答资料</span>
        {scopeLoading && <span className="flex items-center gap-1.5 text-xs text-muted"><Spinner size="sm" color="success" aria-label="正在读取资料" />正在读取资料</span>}
        {!scopeLoading && resources.length === 0 && <span className="text-xs text-muted">请先在资料库上传并完成索引。</span>}
        {resources.map((resource) => <Checkbox
          key={resource.source_id}
          isSelected={selectedIds.includes(resource.source_id!)}
          onChange={() => toggleSource(resource.source_id!)}
          isDisabled={running}
          className="min-w-0"
        >
          <Checkbox.Content className="min-w-0 items-start gap-2.5">
            <Checkbox.Control className="mt-0.5"><Checkbox.Indicator /></Checkbox.Control>
            <span className="min-w-0 text-left text-sm font-normal whitespace-normal wrap-anywhere text-foreground">{resource.title}</span>
          </Checkbox.Content>
        </Checkbox>)}
      </div>
    </div>

    <div className="rag-transcript" aria-live="polite">
      {messages.length === 0 && <div className="rag-empty">选择已索引资料后即可提问。</div>}
      {messages.map((item, index) => <article className={`rag-message ${item.role}`} key={`${item.role}-${index}`}>
        <strong>{item.role === "user" ? "你" : "学习助手"}</strong>
        <p>{item.content || (running && index === messages.length - 1 ? "正在检索资料..." : "")}</p>
        {item.excerpts?.map((excerpt) => <Disclosure key={`${excerpt.source_id}-${excerpt.text}`}>
          <Disclosure.Heading level={4}>
            <Disclosure.Trigger className="flex w-full items-center gap-2 text-left text-xs font-bold text-brand-ink">
              {String(excerpt.metadata.file_name ?? excerpt.source_id)}
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="text-xs leading-relaxed text-muted">{excerpt.text}</Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>)}
      </article>)}
    </div>

    {error && <Alert status="danger">
      <Alert.Indicator><AlertCircle size={17} aria-hidden="true" /></Alert.Indicator>
      <Alert.Content className="flex flex-wrap items-center gap-2.5">
        <Alert.Description>{error}</Alert.Description>
        {latestQuestion.current && <Button variant="ghost" size="sm" type="button" onClick={() => void ask(true)} isDisabled={running}>重试</Button>}
      </Alert.Content>
    </Alert>}

    <div className="grid gap-2.5">
      <TextField value={question} onChange={setQuestion} isDisabled={running} fullWidth>
        <Label>问题</Label>
        <TextArea rows={3} placeholder="针对已选资料提问" />
      </TextField>
      <div className="flex items-center justify-end gap-2">
        {running
          ? <Button variant="secondary" type="button" onClick={() => controller.current?.abort()}><Square size={15} aria-hidden="true" />停止</Button>
          : <Button variant="primary" type="button" className="justify-center" onClick={() => void ask()} isDisabled={!resources.length}><Send size={16} aria-hidden="true" />提问</Button>}
        {messages.length > 0 && !running && <IconButton label="重试上一问题" onClick={() => void ask(true)}>
          <RotateCcw size={16} aria-hidden="true" />
        </IconButton>}
      </div>
    </div>
  </section>;
}
