"use client";

import { Alert, Button, Chip, Description, Input, Label, Spinner, TextField } from "@heroui/react";
import { AlertCircle, Bot, CheckCircle2, Database, KeyRound, Plus, Save, Trash2, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { IconButton } from "../../components/ui/IconButton";
import { SelectField } from "../../components/ui/SelectField";
import {
  activateModelProfile,
  ApiError,
  createModelProfile,
  deleteModelProfile,
  getModelConfiguration,
  saveModelProfile,
  testModelProfile,
  type ModelConfiguration,
  type ModelEndpoint,
  type ModelEndpointInput,
  type ModelProfile,
} from "../../lib/api";

type Kind = "llm" | "rag";
type State = "loading" | "ready" | "saving" | "testing" | "error";
type TestMessage = { kind: "success" | "error"; text: string } | null;

const emptyForm = (kind: Kind): ModelEndpointInput => ({
  name: kind === "llm" ? "LLM 档案" : "RAG 档案",
  base_url: "https://api.openai.com/v1",
  api_key: "",
  model: kind === "llm" ? "gpt-4o-mini" : "text-embedding-3-small",
});

const toForm = (profile: ModelProfile | undefined, kind: Kind): ModelEndpointInput => profile
  ? { name: profile.name, base_url: profile.base_url, api_key: "", model: profile.model }
  : emptyForm(kind);

export function ModelConfigurationPanel() {
  const [status, setStatus] = useState<ModelConfiguration | null>(null);
  const [llmForm, setLlmForm] = useState<ModelEndpointInput>(emptyForm("llm"));
  const [ragForm, setRagForm] = useState<ModelEndpointInput>(emptyForm("rag"));
  const [newNames, setNewNames] = useState({ llm: "新 LLM 档案", rag: "新 RAG 档案" });
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [testMessages, setTestMessages] = useState<Record<Kind, TestMessage>>({ llm: null, rag: null });
  const [pendingKind, setPendingKind] = useState<Kind | null>(null);
  const inFlight = useRef(false);

  const applyStatus = useCallback((next: ModelConfiguration) => {
    setStatus(next);
    setLlmForm(toForm(next.llm_profiles.find((profile) => profile.id === next.llm.active_profile_id), "llm"));
    setRagForm(toForm(next.rag_profiles.find((profile) => profile.id === next.rag.active_profile_id), "rag"));
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    setMessage(null);
    try {
      applyStatus(await getModelConfiguration());
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof ApiError ? error.message : "无法读取模型配置状态");
    }
  }, [applyStatus]);

  useEffect(() => { void load(); }, [load]);

  const perform = async (kind: Kind, action: () => Promise<ModelConfiguration>, success: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingKind(kind);
    setState("saving");
    setMessage(null);
    try {
      applyStatus(await action());
      setMessage(success);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof ApiError ? error.message : "模型配置操作失败");
    } finally {
      inFlight.current = false;
      setPendingKind(null);
    }
  };

  const runTest = async (kind: Kind, form: ModelEndpointInput, profileId: string | null) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingKind(kind);
    setState("testing");
    setMessage(null);
    setTestMessages((messages) => ({ ...messages, [kind]: null }));
    try {
      const result = await testModelProfile(kind, form, profileId ?? undefined);
      setTestMessages((messages) => ({
        ...messages,
        [kind]: { kind: result.ok ? "success" : "error", text: result.message },
      }));
      setState("ready");
    } catch (error) {
      const text = error instanceof ApiError ? error.message : "模型连接失败";
      setTestMessages((messages) => ({ ...messages, [kind]: { kind: "error", text } }));
      setState("ready");
    } finally {
      inFlight.current = false;
      setPendingKind(null);
    }
  };

  const busy = state === "saving" || state === "testing";

  return <section className="model-config-panel" aria-labelledby="model-configuration-title">
    <div className="section-heading"><div><p className="eyebrow">MODEL CONFIGURATION</p><h3 id="model-configuration-title">模型配置</h3></div><KeyRound size={22} aria-hidden="true" /></div>
    {state === "loading" && <div className="flex items-center gap-2 text-sm text-muted" aria-busy="true">
      <Spinner size="sm" color="success" aria-label="正在读取模型配置" />
      <span>正在读取配置状态</span>
    </div>}
    {status && <div className="model-config-sections">
      <EndpointConfiguration
        kind="llm"
        title="LLM CONFIGURATION"
        subtitle="LLM 配置"
        description="用于对话、学习路线、课程和测验。"
        icon={<Bot size={20} aria-hidden="true" />}
        endpoint={status.llm}
        profiles={status.llm_profiles}
        form={llmForm}
        newName={newNames.llm}
        busy={busy}
        saving={state === "saving" && pendingKind === "llm"}
        testing={state === "testing" && pendingKind === "llm"}
        testMessage={testMessages.llm}
        onFormChange={setLlmForm}
        onNewNameChange={(value) => setNewNames((names) => ({ ...names, llm: value }))}
        onCreate={() => perform("llm", () => createModelProfile("llm", newNames.llm.trim()), "已新建 LLM 档案，请填写并保存配置。")}
        onActivate={(profileId) => { if (profileId) void perform("llm", () => activateModelProfile("llm", profileId), "LLM 档案已切换并应用。"); }}
        onSave={() => status.llm.active_profile_id && perform("llm", () => saveModelProfile("llm", status.llm.active_profile_id!, llmForm), "LLM 配置已保存，密钥不会再次显示。")}
        onDelete={() => status.llm.active_profile_id && perform("llm", () => deleteModelProfile("llm", status.llm.active_profile_id!), "LLM 档案已删除。")}
        onTest={() => void runTest("llm", llmForm, status.llm.active_profile_id)}
      />
      <EndpointConfiguration
        kind="rag"
        title="RAG EMBEDDING CONFIGURATION"
        subtitle="RAG 向量模型配置"
        description="用于资料索引和检索。"
        icon={<Database size={20} aria-hidden="true" />}
        endpoint={status.rag}
        profiles={status.rag_profiles}
        form={ragForm}
        newName={newNames.rag}
        busy={busy}
        saving={state === "saving" && pendingKind === "rag"}
        testing={state === "testing" && pendingKind === "rag"}
        testMessage={testMessages.rag}
        onFormChange={setRagForm}
        onNewNameChange={(value) => setNewNames((names) => ({ ...names, rag: value }))}
        onCreate={() => perform("rag", () => createModelProfile("rag", newNames.rag.trim()), "已新建 RAG 档案，请填写并保存配置。")}
        onActivate={(profileId) => { if (profileId) void perform("rag", () => activateModelProfile("rag", profileId), "RAG 档案已切换并应用。"); }}
        onSave={() => status.rag.active_profile_id && perform("rag", () => saveModelProfile("rag", status.rag.active_profile_id!, ragForm), "RAG 向量模型配置已保存，密钥不会再次显示。")}
        onDelete={() => status.rag.active_profile_id && perform("rag", () => deleteModelProfile("rag", status.rag.active_profile_id!), "RAG 档案已删除。")}
        onTest={() => void runTest("rag", ragForm, status.rag.active_profile_id)}
      />
    </div>}
    {message && (state === "error"
      ? <Alert status="danger" role="alert" aria-label="模型配置错误">
        <Alert.Indicator><AlertCircle size={18} aria-hidden="true" /></Alert.Indicator>
        <Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content>
      </Alert>
      : <div className="flex items-center gap-2 bg-brand-soft px-3 py-2 text-sm text-brand-ink" role="status">
        <CheckCircle2 size={17} aria-hidden="true" />
        <span>{message}</span>
      </div>)}
  </section>;
}

function EndpointConfiguration({
  kind,
  title,
  subtitle,
  description,
  icon,
  endpoint,
  profiles,
  form,
  newName,
  busy,
  saving,
  testing,
  testMessage,
  onFormChange,
  onNewNameChange,
  onCreate,
  onActivate,
  onSave,
  onDelete,
  onTest,
}: {
  kind: Kind; title: string; subtitle: string; description: string; icon: ReactNode; endpoint: ModelEndpoint; profiles: ModelProfile[]; form: ModelEndpointInput; newName: string; busy: boolean; saving: boolean; testing: boolean; testMessage: TestMessage; onFormChange: (form: ModelEndpointInput) => void; onNewNameChange: (value: string) => void; onCreate: () => void; onActivate: (profileId: string) => void; onSave: () => void; onDelete: () => void; onTest: () => void;
}) {
  const update = (field: keyof ModelEndpointInput, value: string) => onFormChange({ ...form, [field]: value });
  const canTest = Boolean(form.api_key.trim() || endpoint.api_key_configured);
  const readyLabel = `${subtitle} ${endpoint.ready ? "已就绪" : "未配置"}`;

  return <section className="model-config-section" aria-label={subtitle}>
    <div className="model-config-section-heading">
      <div><p className="eyebrow">{title}</p><h4>{subtitle}</h4><p>{description}</p></div>
      <span className="shrink-0 text-brand-ink">{icon}</span>
    </div>

    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <div className="flex min-w-0 flex-col gap-1">
        <SelectField
          label="活动档案"
          value={endpoint.active_profile_id}
          options={profiles.map((profile) => ({ id: profile.id, label: profile.name }))}
          onChange={onActivate}
          isDisabled={busy || profiles.length === 0}
          placeholder={profiles.length === 0 ? "暂无档案" : "请选择档案"}
        />
        {profiles.length === 0 && <p className="text-xs leading-relaxed text-muted">{`还没有 ${kind === "llm" ? "LLM" : "RAG"} 档案，填写名称后点击「新建」。`}</p>}
      </div>

      <TextField value={newName} onChange={onNewNameChange} isDisabled={busy}>
        <Label>新档案名称</Label>
        <Input />
      </TextField>

      <Button variant="secondary" type="button" onClick={onCreate} isDisabled={busy || !newName.trim()} className="justify-self-start md:justify-self-end">
        <Plus size={16} aria-hidden="true" />
        新建
      </Button>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Chip color={endpoint.ready ? "success" : "warning"} variant="soft" size="sm">{readyLabel}</Chip>
      {endpoint.active_profile_id && !canTest && <span className="text-xs leading-relaxed text-muted">还没有可用密钥，填写 API Key 后才能测试连接。</span>}
    </div>

    {endpoint.active_profile_id && <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField value={form.name} onChange={(value) => update("name", value)} isDisabled={busy}>
        <Label>档案名称</Label>
        <Input placeholder="档案名称" />
      </TextField>

      <TextField value={form.model} onChange={(value) => update("model", value)} isDisabled={busy}>
        <Label>{kind === "llm" ? "对话模型" : "向量模型"}</Label>
        <Input placeholder="模型名称" />
      </TextField>

      <TextField value={form.base_url} onChange={(value) => update("base_url", value)} isDisabled={busy} className="md:col-span-2">
        <Label>服务地址</Label>
        <Input placeholder="https://api.example.com/v1" />
        {kind === "rag" && <Description>请填写基础地址（例如 https://api.example.com/v1），不要包含 /embeddings。</Description>}
      </TextField>

      <TextField value={form.api_key} onChange={(value) => update("api_key", value)} isDisabled={busy} className="md:col-span-2">
        <Label>API Key</Label>
        <Input type="password" autoComplete="off" placeholder={endpoint.api_key_configured ? "已配置，填写新值才会替换" : "输入 API Key"} />
        <Description>密钥只保存在本地配置中，保存后不会再次显示。</Description>
      </TextField>

      <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-2">
        <Button variant="secondary" type="button" onClick={onTest} isDisabled={busy || !canTest}>
          {testing ? <Spinner size="sm" color="current" aria-hidden="true" /> : <Wifi size={16} aria-hidden="true" />}
          测试连接
        </Button>
        <Button variant="primary" type="button" onClick={onSave} isDisabled={busy}>
          {saving ? <Spinner size="sm" color="current" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          保存配置
        </Button>
        <IconButton label="删除当前档案" variant="danger-soft" onClick={onDelete} isDisabled={busy}>
          <Trash2 size={16} aria-hidden="true" />
        </IconButton>
      </div>

      {testMessage && <div
        role="status"
        className={`flex items-center gap-2 px-3 py-2 text-sm md:col-span-2 ${testMessage.kind === "error" ? "bg-alert-soft text-alert-ink" : "bg-brand-soft text-brand-ink"}`}
      >
        {testMessage.kind === "error" ? <AlertCircle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
        <span>{testMessage.text}</span>
      </div>}
    </div>}
  </section>;
}
