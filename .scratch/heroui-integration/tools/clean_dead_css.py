import re
import sys
from pathlib import Path

DEAD = {
    "command-button",
    "danger-button",
    "detail-note",
    "environment-note",
    "export-actions",
    "hour-input",
    "icon-button",
    "icon-command",
    "incorrect",
    "inline",
    "missing",
    "model-config-actions",
    "model-config-form",
    "model-config-hint",
    "model-config-message",
    "model-config-state",
    "model-profile-controls",
    "node-open-button",
    "quiz-feedback",
    "quiz-form",
    "quiz-option",
    "quiz-question",
    "quiz-selection-detail",
    "rag-composer",
    "rag-error",
    "rag-scope",
    "rag-source-list",
    "refine-row",
    "resource-delete-confirm",
    "resource-error",
    "resource-progress",
    "resource-row",
    "resource-upload-form",
    "review-actions",
    "roadmap-form",
    "secondary-button",
    "status-button",
    "text-action",
}


def split_rules(text: str):
    """按大括号深度把 CSS 文本切成 (前缀空白, 规则文本) 序列，保留 @media 外壳。"""
    rules = []
    buffer = ""
    depth = 0
    for char in text:
        buffer += char
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                rules.append(buffer)
                buffer = ""
    if buffer:
        rules.append(buffer)
    return rules


def classes_in(selector: str) -> set[str]:
    return set(re.findall(r"\.([A-Za-z][A-Za-z0-9_-]*)", selector))


def transform(rule: str, dropped: list[str], mixed: list[str], indent: str) -> str:
    stripped = rule.strip()
    if stripped.startswith("@media"):
        head, body = stripped.split("{", 1)
        body = body[: body.rfind("}")]
        kept = []
        for line in body.split("\n"):
            if not line.strip():
                continue
            kept.append(transform(line, dropped, mixed, indent + "  "))
        inner = "\n".join(item for item in kept if item.strip())
        if not inner.strip():
            return ""
        return f"{head}{{\n{inner}\n}}"
    if stripped.startswith("@") or "{" not in stripped:
        return rule
    selector, rest = stripped.split("{", 1)
    found = classes_in(selector)
    if not found:
        return rule
    if found <= DEAD:
        dropped.append(selector.strip())
        return ""
    if found & DEAD:
        mixed.append(selector.strip())
    return rule


def main() -> int:
    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8")
    dropped: list[str] = []
    mixed: list[str] = []
    out = []
    for rule in split_rules(text):
        if rule.strip().startswith("@media"):
            out.append(transform(rule, dropped, mixed, ""))
        elif "{" in rule:
            selector = rule.split("{", 1)[0].strip()
            found = classes_in(selector)
            if found and found <= DEAD:
                dropped.append(selector)
                continue
            if found & DEAD:
                mixed.append(selector)
            out.append(rule)
        else:
            out.append(rule)
    result = "".join(item for item in out if item != "")
    result = re.sub(r"\n{3,}", "\n\n", result)
    path.write_text(result, encoding="utf-8", newline="\n")
    print(f"删除规则 {len(dropped)} 条")
    for name in dropped:
        print(f"  - {name}")
    print(f"混合规则（需人工判断）{len(mixed)} 条")
    for name in mixed:
        print(f"  ? {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
