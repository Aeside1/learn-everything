"""本地双主题验收用的 FastAPI 替身：托管静态产物、/api/v1 固定数据、可控 SSE。

只用于浏览器验收：不访问真实模型，不使用真实密钥，数据全部虚构。
用法：
    python tests/browser/stub_api.py --port 8123 --static out
控制端点（供验收脚本切换错误/延迟）：
    POST /__control  {"error": "GET /api/v1/dashboard.*", "delay_ms": 600, "reset": true}
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

CONTROL = {"error": None, "delay_ms": 0}
LOCK = threading.Lock()

def _progress(done: int, total: int, learning: int = 0, weak: int = 0) -> dict:
    return {
        "total": total,
        "done": done,
        "learning": learning,
        "pending": total - done - learning - weak,
        "weak": weak,
        "skipped": 0,
        "pct": 0 if total == 0 else round(done / total * 100),
    }


def _node(node_id: int, code: str, title: str, status: str = "pending", **extra) -> dict:
    base = {
        "id": node_id,
        "code": code,
        "title": title,
        "description": f"{title} 的学习目标：理解核心概念、能够完成对应练习，并能解释常见误区。",
        "stage": "基础",
        "status": status,
        "mastery": 0.4 if status == "learning" else 0.9 if status == "mastered" else 0.0,
        "est_hours": 2,
        "difficulty": 2,
        "has_content": status != "pending",
        "learnable": True,
        "resources": [],
    }
    base.update(extra)
    return base


NODES = [
    _node(101, "1.1", "所有权与借用", "mastered"),
    _node(102, "1.2", "生命周期与借用检查器", "learning"),
    _node(103, "1.3", "模式匹配与错误处理", "pending"),
    _node(
        104,
        "2.1",
        "异步运行时与并发任务调度：一个足够长的知识点标题用于验证窄屏换行与截断行为",
        "weak",
        description="长文本知识点：需要验证在窄屏、长标题和长描述下，节点列表、详情面板与状态控件仍然可读且可操作，"
        "同时验证主题切换后文字对比度与背景层次保持清晰。" * 2,
    ),
]

ROADMAP_NODES = [{**node, "prerequisites": [] if index == 0 else [NODES[index - 1]["title"]]} for index, node in enumerate(NODES)]


def _workspace(project_id: int) -> dict:
    return {
        "project": _project(project_id),
        "progress": _progress(1, 4, learning=1, weak=1),
        "environment": {"description": "本地 Python 环境已就绪", "status": "ready"},
        "nodes": NODES,
    }


PROJECTS = {
    1: {
        "id": 1,
        "title": "学习 Rust",
        "topic": "Rust",
        "background": "已有 C 语言基础",
        "goal": "能独立完成一个小型并发项目",
        "weekly_hours": 8,
        "status": "active",
        "created_at": "2026-09-01T09:00:00",
        "updated_at": "2026-09-20T09:00:00",
    },
    2: {
        "id": 2,
        "title": "前端工程化与构建工具链：一个用于验证长项目名称在侧栏与弹窗中的显示效果",
        "topic": "TypeScript",
        "background": "",
        "goal": "",
        "weekly_hours": 5,
        "status": "active",
        "created_at": "2026-09-02T09:00:00",
        "updated_at": "2026-09-21T09:00:00",
    },
}

SUMMARY_PROGRESS = {1: _progress(1, 4, learning=1, weak=1), 2: _progress(0, 3)}


def _project(project_id: int) -> dict:
    return PROJECTS.get(project_id, PROJECTS[1])


def _summary(project_id: int) -> dict:
    project = _project(project_id)
    return {
        "id": project["id"],
        "title": project["title"],
        "topic": project["topic"],
        "status": project["status"],
        "progress": SUMMARY_PROGRESS.get(project_id, _progress(0, 1)),
        "created_at": project["created_at"],
    }


DASHBOARD = {
    "project_id": 1,
    "projects": [{"label": "学习 Rust", "id": 1}, {"label": "前端工程化", "id": 2}],
    "metrics": {
        "total_nodes": 4,
        "mastered_nodes": 1,
        "avg_mastery": 0.42,
        "week_minutes": 185,
        "due_cards": 2,
        "total_cards": 7,
    },
    "status_counts": {"pending": 1, "learning": 1, "mastered": 1, "weak": 1},
    "heatmap": [{"date": f"2026-09-{day:02d}", "minutes": (day * 7) % 60} for day in range(1, 15)],
    "latest_report": "今天完成了所有权章节的复习，并整理了 2 张卡片。\n明天建议先处理异步运行时的薄弱知识点。",
}

CARDS = [
    {
        "id": 501,
        "node_id": 101,
        "project_id": 1,
        "front": "为什么 Rust 的所有权规则能在编译期防止 use-after-free？",
        "back": "因为每个值只有一个所有者，所有权转移后原变量失效，借用又受生命周期约束，编译器据此拒绝悬垂引用。",
        "card_type": "concept",
        "state": 1,
        "reps": 3,
        "next_review": "2026-09-25T09:00:00",
    },
    {
        "id": 502,
        "node_id": 103,
        "project_id": 1,
        "front": "? 运算符在返回 Result 的函数中做了什么？",
        "back": "遇到 Err 时提前返回该错误，遇到 Ok 时取出内部值继续执行。",
        "card_type": "concept",
        "state": 1,
        "reps": 1,
        "next_review": "2026-09-26T09:00:00",
    },
]

QUIZ_QUESTIONS = [
    {
        "id": 901,
        "node_id": 101,
        "qtype": "choice",
        "stem": "以下哪种写法可以在不转移所有权的前提下读取 String 的长度？",
        "options": ["let n = s.len();", "let t = s; let n = t.len();", "drop(s); let n = s.len();", "let t = *s;"],
        "difficulty": 2,
    },
    {
        "id": 902,
        "node_id": 101,
        "qtype": "short",
        "stem": "请用自己的话解释生命周期标注解决的核心问题。",
        "options": [],
        "difficulty": 3,
    },
]

INDEXED_RESOURCES = [
    {
        "resource_id": 701,
        "node_id": 101,
        "title": "Rust 官方文档：所有权章节",
        "rtype": "markdown",
        "source": "ownership.md",
        "status": "completed",
        "message": None,
        "collection_id": "collection-1",
        "source_id": "source-1",
    },
    {
        "resource_id": 702,
        "node_id": 101,
        "title": "一份名称非常长的参考资料，用于验证资料标题在窄屏与长文本下的截断与换行表现是否仍然可读",
        "rtype": "pdf",
        "source": "long-name.pdf",
        "status": "completed",
        "message": None,
        "collection_id": "collection-1",
        "source_id": "source-2",
    },
    {
        "resource_id": 703,
        "node_id": 101,
        "title": "索引失败的示例资料",
        "rtype": "docx",
        "source": "broken.docx",
        "status": "failed",
        "message": "解析失败：文档加密",
        "collection_id": None,
        "source_id": None,
    },
]

MODEL_CONFIG = {
    "llm": {
        "active_profile_id": "llm-default",
        "active_profile_name": "本地默认 LLM",
        "base_url": "https://llm.example.test/v1",
        "model": "example-chat-model",
        "api_key_configured": True,
        "ready": True,
    },
    "rag": {
        "active_profile_id": None,
        "active_profile_name": None,
        "base_url": "",
        "model": "",
        "api_key_configured": False,
        "ready": False,
    },
    "llm_profiles": [
        {"id": "llm-default", "name": "本地默认 LLM", "base_url": "https://llm.example.test/v1", "model": "example-chat-model", "api_key_configured": True},
        {"id": "llm-backup", "name": "备用档案：一个很长的档案名称用于验证选择器浮层内的换行", "base_url": "https://backup.example.test/v1", "model": "example-backup-model", "api_key_configured": False},
    ],
    "rag_profiles": [],
}

PREVIEW_ROADMAP = {
    "summary": "Rust 从入门到并发实践",
    "stages": [{"name": "基础"}, {"name": "并发"}],
    "nodes": [dict(node, prerequisites=[]) for node in NODES],
}

CONTENT_JOB = {
    "job_id": 301,
    "project_id": 1,
    "generated_node_ids": [101, 102],
    "failed_node_ids": [],
    "pending_node_ids": [103],
    "status": "doing",
    "attempts": 1,
    "error": None,
    "cancel_requested": False,
}

ROUTES: dict[tuple[str, str], object] = {}


def route(method: str, pattern: str):
    def wrap(handler):
        ROUTES[(method, pattern)] = handler
        return handler

    return wrap


def _detail(node_id: int) -> dict:
    node = next((item for item in NODES if item["id"] == node_id), NODES[0])
    detail = {key: value for key, value in node.items() if key not in ("learnable", "resources")}
    detail["practice"] = {"id": 801, "title": f"{node['title']} 实操", "description": "## 实操步骤\n\n1. 阅读示例代码\n2. 运行测试\n\n```rust\nfn main() { println!(\"ok\"); }\n```", "status": "ready"}
    detail["note"] = {"id": 601, "content": "已有笔记内容", "selection": "", "updated_at": "2026-09-20T09:00:00"}
    detail["resources"] = [
        {"id": 901, "title": "Rust Book", "url": "https://doc.rust-lang.org/book/", "rtype": "web", "description": "官方文档", "preview": "", "source": "manual"},
    ]
    return detail


def _json(handler, status: int, payload) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _sse(handler, events: list[tuple[str, dict]], delay_ms: int = 150) -> None:
    handler.send_response(200)
    handler.send_header("Content-Type", "text/event-stream; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Transfer-Encoding", "chunked")
    handler.end_headers()
    for kind, data in events:
        frame = f"event: {kind}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n".encode("utf-8")
        handler.wfile.write(b"%x\r\n" % len(frame) + frame + b"\r\n")
        handler.wfile.flush()
        time.sleep(delay_ms / 1000)
    handler.wfile.write(b"0\r\n\r\n")
    handler.wfile.flush()


@route("GET", r"^/api/v1/projects$")
def list_projects(ctx):
    return 200, [_summary(pid) for pid in PROJECTS]


@route("POST", r"^/api/v1/projects$")
def create_project(ctx):
    project_id = max(PROJECTS) + 1
    PROJECTS[project_id] = {
        "id": project_id,
        "title": ctx.body.get("topic", "新建项目"),
        "topic": ctx.body.get("topic", ""),
        "background": ctx.body.get("background", ""),
        "goal": ctx.body.get("goal", ""),
        "weekly_hours": ctx.body.get("weekly_hours", 5),
        "status": "active",
        "created_at": "2026-10-01T09:00:00",
        "updated_at": "2026-10-01T09:00:00",
    }
    SUMMARY_PROGRESS[project_id] = _progress(0, 3)
    return 201, {
        "project_id": project_id,
        "title": PROJECTS[project_id]["title"],
        "node_count": 3,
        "environment_status": "ready",
        "environment_error": None,
    }


@route("GET", r"^/api/v1/projects/(?P<pid>\d+)$")
def get_project(ctx):
    return 200, _project(int(ctx.match.group("pid")))


@route("PATCH", r"^/api/v1/projects/(?P<pid>\d+)$")
def update_project(ctx):
    project_id = int(ctx.match.group("pid"))
    project = PROJECTS.get(project_id)
    if not project:
        return 404, {"detail": "项目不存在"}
    project.update({key: value for key, value in ctx.body.items() if key in ("title", "topic", "background", "goal", "weekly_hours")})
    return 200, project


@route("DELETE", r"^/api/v1/projects/(?P<pid>\d+)$")
def delete_project(ctx):
    project_id = int(ctx.match.group("pid"))
    if ctx.body.get("confirmation_phrase") != "DELETE":
        return 400, {"detail": "确认词不正确"}
    PROJECTS.pop(project_id, None)
    SUMMARY_PROGRESS.pop(project_id, None)
    return 200, {"project_id": project_id, "deleted": {"nodes": 4, "cards": 2}}


@route("GET", r"^/api/v1/projects/(?P<pid>\d+)/workspace$")
def get_workspace(ctx):
    return 200, _workspace(int(ctx.match.group("pid")))


@route("GET", r"^/api/v1/projects/(?P<pid>\d+)/roadmap$")
def get_roadmap(ctx):
    return 200, {"project_id": int(ctx.match.group("pid")), "summary": PREVIEW_ROADMAP["summary"], "stages": PREVIEW_ROADMAP["stages"], "nodes": ROADMAP_NODES}


@route("GET", r"^/api/v1/projects/(?P<pid>\d+)/dashboard$")
def get_dashboard(ctx):
    return 200, {**DASHBOARD, "project_id": int(ctx.match.group("pid"))}


@route("GET", r"^/api/v1/projects/(?P<pid>\d+)/exports/(?P<kind>\w+)$")
def get_export(ctx):
    return 200, {"detail": f"export {ctx.match.group('kind')}"}


@route("POST", r"^/api/v1/projects/(?P<pid>\d+)/quizzes$")
def create_quiz(ctx):
    return 200, {"quiz_id": 401, "project_id": int(ctx.match.group("pid")), "title": "所有权测验", "quiz_type": ctx.body.get("qtype", "mixed"), "questions": QUIZ_QUESTIONS}


@route("POST", r"^/api/v1/projects/(?P<pid>\d+)/quizzes/questions/(?P<qid>\d+)/answer$")
def answer_quiz(ctx):
    answer = str(ctx.body.get("answer", ""))
    correct = "s.len()" in answer or "提前返回" in answer
    return 200, {
        "attempt_id": 1001,
        "question_id": int(ctx.match.group("qid")),
        "node_id": 101,
        "is_correct": correct,
        "feedback": "回答正确：借用检查器只要求不可变借用。" if correct else "需要巩固：注意所有权转移后原变量不可再使用。",
        "mastery": 0.75,
    }


@route("POST", r"^/api/v1/projects/(?P<pid>\d+)/content-preparation$")
def start_preparation(ctx):
    return 202, {**CONTENT_JOB, "project_id": int(ctx.match.group("pid"))}


@route("GET", r"^/api/v1/projects/(?P<pid>\d+)/content-preparation/(?P<jid>\d+)$")
def get_preparation(ctx):
    return 200, {**CONTENT_JOB, "project_id": int(ctx.match.group("pid")), "job_id": int(ctx.match.group("jid"))}


@route("POST", r"^/api/v1/projects/(?P<pid>\d+)/content-preparation/(?P<jid>\d+)/cancel$")
def cancel_preparation(ctx):
    return 200, {**CONTENT_JOB, "status": "cancelled", "cancel_requested": True}


@route("POST", r"^/api/v1/projects/(?P<pid>\d+)/content-preparation/(?P<jid>\d+)/retry$")
def retry_preparation(ctx):
    return 200, CONTENT_JOB


@route("POST", r"^/api/v1/roadmaps/preview$")
def preview_roadmap(ctx):
    return 200, {"roadmap": PREVIEW_ROADMAP, "audit": {"score": 88, "verdict": "结构合理", "problems": [], "changes": ["补充了并发章节"]}}


@route("POST", r"^/api/v1/roadmaps/refine$")
def refine_roadmap(ctx):
    roadmap = ctx.body.get("roadmap") or PREVIEW_ROADMAP
    return 200, {"roadmap": {**roadmap, "summary": f"{roadmap.get('summary', '')}（已调整）"}}


@route("PATCH", r"^/api/v1/nodes/(?P<nid>\d+)/status$")
def update_node_status(ctx):
    node_id = int(ctx.match.group("nid"))
    status = str(ctx.body.get("status", "pending"))
    for node in NODES:
        if node["id"] == node_id:
            node["status"] = status
    return 200, {"node": {"id": node_id, "status": status}, "workspace": _workspace(1)}


@route("GET", r"^/api/v1/nodes/(?P<nid>\d+)$")
def get_node(ctx):
    return 200, _detail(int(ctx.match.group("nid")))


@route("POST", r"^/api/v1/nodes/(?P<nid>\d+)/(content|practice|resources)$")
def node_operation(ctx):
    node_id = int(ctx.match.group("nid"))
    return 200, {"node_id": node_id, "project_id": 1, "status": "ready", "detail": _detail(node_id), "resource_count": 1, "error": None}


@route("PUT", r"^/api/v1/nodes/(?P<nid>\d+)/note$")
def save_note(ctx):
    node_id = int(ctx.match.group("nid"))
    detail = _detail(node_id)
    detail["note"]["content"] = str(ctx.body.get("content", ""))
    return 200, {"node_id": node_id, "project_id": 1, "note": detail["note"], "detail": detail}


@route("GET", r"^/api/v1/nodes/(?P<nid>\d+)/resources$")
def list_resources(ctx):
    return 200, INDEXED_RESOURCES


@route("GET", r"^/api/v1/nodes/(?P<nid>\d+)/resources/(?P<rid>\d+)/deletion-preview$")
def deletion_preview(ctx):
    resource_id = int(ctx.match.group("rid"))
    resource = next((item for item in INDEXED_RESOURCES if item["resource_id"] == resource_id), INDEXED_RESOURCES[0])
    return 200, {"resource": resource, "confirmation_phrase": "DELETE", "index_delete_required": True}


@route("DELETE", r"^/api/v1/nodes/(?P<nid>\d+)/resources/(?P<rid>\d+)$")
def delete_resource(ctx):
    if ctx.body.get("confirmation_phrase") != "DELETE":
        return 400, {"detail": "确认词不正确"}
    return 200, {"resource_id": int(ctx.match.group("rid")), "index_deleted": True}


@route("GET", r"^/api/v1/reviews/due$")
def due_cards(ctx):
    return 200, {"cards": CARDS[:1], "project_id": 1}


@route("POST", r"^/api/v1/reviews/(?P<cid>\d+)$")
def submit_review(ctx):
    card_id = int(ctx.match.group("cid"))
    card = next((item for item in CARDS if item["id"] == card_id), CARDS[0])
    next_card = CARDS[1] if card_id == CARDS[0]["id"] else None
    return 200, {"card": card, "next_card": next_card}


@route("GET", r"^/api/v1/model-configuration$")
def get_model_configuration(ctx):
    return 200, MODEL_CONFIG


@route("POST", r"^/api/v1/model-configuration/(?P<kind>llm|rag)/profiles$")
def create_model_profile(ctx):
    kind = ctx.match.group("kind")
    profile = {
        "id": f"{kind}-{len(MODEL_CONFIG[f'{kind}_profiles']) + 1}",
        "name": ctx.body.get("name", "新档案"),
        "base_url": "",
        "model": "",
        "api_key_configured": False,
    }
    MODEL_CONFIG[f"{kind}_profiles"].append(profile)
    MODEL_CONFIG[kind].update({"active_profile_id": profile["id"], "active_profile_name": profile["name"], "ready": False, "api_key_configured": False})
    return 200, MODEL_CONFIG


@route("PUT", r"^/api/v1/model-configuration/(?P<kind>llm|rag)/profiles/(?P<pid>[\w.-]+)$")
def save_model_profile(ctx):
    kind = ctx.match.group("kind")
    profile_id = ctx.match.group("pid")
    for profile in MODEL_CONFIG[f"{kind}_profiles"]:
        if profile["id"] == profile_id:
            profile.update({
                "name": ctx.body.get("name", profile["name"]),
                "base_url": ctx.body.get("base_url", ""),
                "model": ctx.body.get("model", ""),
                "api_key_configured": bool(ctx.body.get("api_key")) or profile["api_key_configured"],
            })
            MODEL_CONFIG[kind].update({
                "active_profile_id": profile["id"],
                "active_profile_name": profile["name"],
                "base_url": profile["base_url"],
                "model": profile["model"],
                "api_key_configured": profile["api_key_configured"],
                "ready": True,
            })
    return 200, MODEL_CONFIG


@route("POST", r"^/api/v1/model-configuration/(?P<kind>llm|rag)/profiles/(?P<pid>[\w.-]+)/activate$")
def activate_model_profile(ctx):
    kind = ctx.match.group("kind")
    profile_id = ctx.match.group("pid")
    profile = next((item for item in MODEL_CONFIG[f"{kind}_profiles"] if item["id"] == profile_id), None)
    if not profile:
        return 404, {"detail": "档案不存在"}
    MODEL_CONFIG[kind].update({"active_profile_id": profile["id"], "active_profile_name": profile["name"], "base_url": profile["base_url"], "model": profile["model"], "api_key_configured": profile["api_key_configured"], "ready": profile["api_key_configured"]})
    return 200, MODEL_CONFIG


@route("DELETE", r"^/api/v1/model-configuration/(?P<kind>llm|rag)/profiles/(?P<pid>[\w.-]+)$")
def delete_model_profile(ctx):
    kind = ctx.match.group("kind")
    profile_id = ctx.match.group("pid")
    MODEL_CONFIG[f"{kind}_profiles"] = [item for item in MODEL_CONFIG[f"{kind}_profiles"] if item["id"] != profile_id]
    MODEL_CONFIG[kind].update({"active_profile_id": None, "active_profile_name": None, "ready": False})
    return 200, MODEL_CONFIG


@route("POST", r"^/api/v1/model-configuration/(?P<kind>llm|rag)/test$")
def test_model_profile(ctx):
    ok = "fail" not in str(ctx.body.get("base_url", "")) and bool(ctx.body.get("api_key") or ctx.body.get("model"))
    return 200, {"ok": ok, "message": "连接成功，模型可用。" if ok else "连接失败：请检查服务地址与密钥。"}


@route("POST", r"^/api/v1/rag/stream$")
def rag_stream(ctx):
    excerpts = [{"source_id": "source-1", "text": "所有权规则在编译期检查。", "score": 0.82, "metadata": {"file_name": "ownership.md"}}]
    events = [
        ("evidence", {"text": None, "excerpts": excerpts, "metadata": {}}),
        ("answer_delta", {"text": "Rust 通过", "excerpts": [], "metadata": {}}),
        ("answer_delta", {"text": "所有权与借用", "excerpts": [], "metadata": {}}),
        ("answer_delta", {"text": "在编译期排除悬垂引用。", "excerpts": [], "metadata": {}}),
        ("complete", {"text": None, "excerpts": [], "metadata": {}}),
    ]
    return "sse", events


@route("POST", r"^/api/v1/nodes/(?P<nid>\d+)/resources/upload/stream$")
def upload_stream(ctx):
    events = [
        ("started", {"resource_id": 704, "node_id": 101, "collection_id": "collection-1", "message": "正在解析文档", "source_id": None}),
        ("progress", {"resource_id": 704, "node_id": 101, "collection_id": "collection-1", "message": "已切分 12 个片段", "source_id": None}),
        ("completed", {"resource_id": 704, "node_id": 101, "collection_id": "collection-1", "message": "索引完成", "source_id": "source-4"}),
    ]
    return "sse", events


class Ctx:
    def __init__(self, match, query, body):
        self.match = match
        self.query = query
        self.body = body


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, fmt, *args):  # noqa: A003 - 保持安静
        pass

    def end_headers(self):
        self.send_header("Connection", "close")
        self.close_connection = True
        super().end_headers()

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}

    def _handle(self, method: str):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/__control":
            body = self._read_body()
            with LOCK:
                if "error" in body:
                    CONTROL["error"] = body["error"]
                if "delay_ms" in body:
                    CONTROL["delay_ms"] = int(body["delay_ms"])
                if body.get("reset"):
                    CONTROL["error"] = None
                    CONTROL["delay_ms"] = 0
                    reset_fixtures()
            return _json(self, 200, dict(CONTROL))
        if not path.startswith("/api/v1/"):
            return super().do_GET() if method == "GET" else self.send_error(405)
        with LOCK:
            error_pattern = CONTROL["error"]
            delay_ms = CONTROL["delay_ms"]
        if delay_ms:
            time.sleep(delay_ms / 1000)
        if error_pattern:
            error_method, _, error_path = error_pattern.partition(" ")
            if error_method == method and re.search(error_path, path):
                return _json(self, 503, {"detail": "验收模拟的服务端错误"})
        for (route_method, pattern), handler in ROUTES.items():
            if route_method != method:
                continue
            match = re.match(pattern, path)
            if not match:
                continue
            result = handler(Ctx(match, parse_qs(parsed.query), self._read_body()))
            if isinstance(result, tuple) and result and result[0] == "sse":
                return _sse(self, result[1])
            status, payload = result
            return _json(self, status, payload)
        return _json(self, 404, {"detail": f"没有匹配的验收数据：{method} {path}"})

    def do_GET(self):  # noqa: N802
        return self._handle("GET")

    def do_POST(self):  # noqa: N802
        return self._handle("POST")

    def do_PUT(self):  # noqa: N802
        return self._handle("PUT")

    def do_PATCH(self):  # noqa: N802
        return self._handle("PATCH")

    def do_DELETE(self):  # noqa: N802
        return self._handle("DELETE")


INITIAL_STATE = {
    "projects": copy.deepcopy(PROJECTS),
    "summary_progress": copy.deepcopy(SUMMARY_PROGRESS),
    "nodes": copy.deepcopy(NODES),
}


def reset_fixtures() -> None:
    PROJECTS.clear()
    PROJECTS.update(copy.deepcopy(INITIAL_STATE["projects"]))
    SUMMARY_PROGRESS.clear()
    SUMMARY_PROGRESS.update(copy.deepcopy(INITIAL_STATE["summary_progress"]))
    NODES[:] = copy.deepcopy(INITIAL_STATE["nodes"])


def serve(port: int, directory: str) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("127.0.0.1", port), lambda *args, **kwargs: Handler(*args, directory=directory, **kwargs))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8123)
    parser.add_argument("--static", default="out")
    args = parser.parse_args()
    server = serve(args.port, args.static)
    print(f"验收替身服务已启动：http://127.0.0.1:{args.port}（静态目录 {args.static}）", flush=True)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
