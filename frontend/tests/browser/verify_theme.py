"""浏览器双主题验收脚本。

对每个场景：真实加载 Next.js 静态产物，数据来自 stub_api.py 的虚构数据；
每个截图点都会自动完成 浅色 → 深色 → 浅色 往返，并在每次切换后重新校验此前
所有 expect 断言，从而同时验证“主题切换不丢失当前状态”。

用法：
    python tests/browser/verify_theme.py --scenarios tests/browser/scenarios/01-theme-and-projects.json --out ../../.scratch/heroui-integration/evidence/01
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path

import stub_api
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import Page, sync_playwright

THEME_TOGGLE_NAMES = {"dark": "切换为深色主题", "light": "切换为浅色主题"}
OVERLAY_SELECTORS = ["[role=dialog]", "[role=listbox]", "[role=tooltip]"]
DEFAULT_TIMEOUT_MS = 8000


class StepFailure(Exception):
    pass


def locator_for(page: Page, target: dict):
    selector = target.get("selector")
    if selector:
        return page.locator(selector)
    role = target.get("role")
    name = target.get("name")
    if not role:
        raise StepFailure(f"断言缺少 role：{target}")
    return page.get_by_role(role, name=name, exact=target.get("exact", False))


def describe(target: dict) -> str:
    if target.get("selector"):
        return f"selector={target['selector']!r}"
    return f"{target.get('role')}={target.get('name')!r}"


def expect_theme(page: Page, expected: str) -> None:
    state = page.evaluate("() => ({attr: document.documentElement.getAttribute('data-theme'), dark: document.documentElement.classList.contains('dark')})")
    if state["attr"] != expected or state["dark"] != (expected == "dark"):
        raise StepFailure(f"期望主题 {expected}，实际 {state}")


def probe_overlays(page: Page) -> list[dict]:
    return page.evaluate(
        """(selectors) => selectors.flatMap((selector) =>
            Array.from(document.querySelectorAll(selector)).slice(0, 3).map((element) => {
              const style = getComputedStyle(element);
              return { selector, background: style.backgroundColor, color: style.color };
            })
        )""",
        OVERLAY_SELECTORS,
    )


def control(page: Page, base_url: str, payload: dict) -> None:
    page.request.post(
        base_url + "/__control",
        data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json"},
    )


def save_screenshot(page: Page, path: Path) -> None:
    """写截图，带有限的写出重试。

    Windows 上曾观测到间歇性的 OSError(EINVAL)（同一目录重复写小文件无法复现，怀疑杀软/文件锁竞态），
    因此这里重试 3 次；仍失败则直接报错，不静默跳过。
    """
    for attempt in range(3):
        try:
            page.screenshot(path=str(path))
            return
        except OSError as error:
            if attempt == 2:
                raise StepFailure(f"截图写入失败（{path.name}）：{error}") from error
            time.sleep(0.5)


def set_theme(page: Page, target: str) -> str:
    """返回实际使用的切换方式：real-button（真实控件）或 dom-swap（弹窗打开时的受控主题状态）。"""
    if page.get_attribute("html", "data-theme") == target:
        return "already"
    if page.get_by_role("dialog").count() == 0:
        page.get_by_role("button", name=THEME_TOGGLE_NAMES[target]).click(timeout=DEFAULT_TIMEOUT_MS)
        return "real-button"
    page.evaluate(
        """(target) => {
            const root = document.documentElement;
            root.classList.toggle('dark', target === 'dark');
            root.setAttribute('data-theme', target);
            root.style.colorScheme = target;
        }""",
        target,
    )
    return "dom-swap"


class Runner:
    def __init__(self, page: Page, out_dir: Path, report: dict):
        self.page = page
        self.out_dir = out_dir
        self.report = report

    def verify_assertions(self, targets: list[dict]) -> None:
        for target in targets:
            try:
                self.expect_visible(target)
            except StepFailure as error:
                self.report.setdefault("verifyFailures", []).append(
                    {
                        "target": target,
                        "dialogCount": self.page.get_by_role("dialog").count(),
                        "snapshot": self.page.locator("body").aria_snapshot()[:4000],
                    }
                )
                raise error

    def expect_visible(self, target: dict) -> None:
        locator = locator_for(self.page, target)
        deadline = time.monotonic() + DEFAULT_TIMEOUT_MS / 1000
        count = 0
        while time.monotonic() < deadline:
            count = locator.count()
            if count and locator.first.is_visible():
                return
            self.page.wait_for_timeout(100)
        raise StepFailure(f"{describe(target)} 不可见（匹配 {count} 个元素）")

    def expect_hidden(self, target: dict) -> None:
        locator = locator_for(self.page, target)
        deadline = time.monotonic() + DEFAULT_TIMEOUT_MS / 1000
        while time.monotonic() < deadline:
            if locator.count() == 0 or not locator.first.is_visible():
                return
            self.page.wait_for_timeout(100)
        raise StepFailure(f"{describe(target)} 仍然可见")

    def capture(self, name: str, verify: list[dict] | None = None, with_overlay_probe: bool = True) -> None:
        """先归一到浅色，再浅色截图 → 深色截图 → 切回浅色，并在每次切换后重新校验 verify。

        probe_overlays=False 用于那些“浮层只在浅色探针时恰好可见”的截图（例如鼠标停在带 Tooltip 的按钮上）：
        这类截图不再声称覆盖浮层主题一致性，会在 report/summary 里显式标出，不得被引用为浮层证据；
        浮层的双主题证据必须用 screenshotPair。
        """
        verify = verify or []
        normalize_mode = set_theme(self.page, "light")
        expect_theme(self.page, "light")
        self.page.wait_for_timeout(120)
        light_probe = probe_overlays(self.page) if with_overlay_probe else []
        light_path = self.out_dir / f"{name}-light.png"
        save_screenshot(self.page, light_path)
        light_theme_mode = set_theme(self.page, "dark")
        expect_theme(self.page, "dark")
        self.verify_assertions(verify)
        self.page.wait_for_timeout(120)
        dark_probe = probe_overlays(self.page) if with_overlay_probe else []
        dark_path = self.out_dir / f"{name}-dark.png"
        save_screenshot(self.page, dark_path)
        back_mode = set_theme(self.page, "light")
        expect_theme(self.page, "light")
        self.verify_assertions(verify)

        if with_overlay_probe:
            if len(light_probe) != len(dark_probe):
                raise StepFailure(
                    f"浮层探针数量不一致（浅色 {len(light_probe)}、深色 {len(dark_probe)}），深色下无法证明浮层主题一致性；"
                    "若该截图不打算覆盖浮层，请显式写 probeOverlays=false"
                )
            unchanged = [light["selector"] for light, dark in zip(light_probe, dark_probe) if light["background"] == dark["background"] and light["color"] == dark["color"]]
            if unchanged:
                raise StepFailure(f"浮层内容未随主题变化：{sorted(set(unchanged))}")
        self.report["screenshots"].append(
            {
                "name": name,
                "light": str(light_path.relative_to(self.out_dir)),
                "dark": str(dark_path.relative_to(self.out_dir)),
                "switchMode": {"normalize": normalize_mode, "toDark": light_theme_mode, "toLight": back_mode},
                "probeOverlays": bool(with_overlay_probe),
                "overlays": {"light": light_probe, "dark": dark_probe},
            }
        )

    def hover_until_overlay(self, hover: dict) -> list[dict]:
        """把鼠标分步移到目标中心，并轮询等待浮层出现（HeroUI Tooltip 默认 400ms 延迟）。"""
        locator = locator_for(self.page, hover).first
        locator.wait_for(state="visible", timeout=DEFAULT_TIMEOUT_MS)
        box = locator.bounding_box()
        if not box:
            raise StepFailure(f"{describe(hover)} 无可点区域，无法悬停")
        self.page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=8)
        for _ in range(14):
            probe = probe_overlays(self.page)
            if probe:
                return probe
            self.page.wait_for_timeout(250)
        raise StepFailure(f"悬停 {describe(hover)} 后未出现浮层，无法作为浮层主题证据")

    def capture_hover_pair(self, name: str, hover: dict, verify: list[dict] | None = None) -> None:
        """悬停某个触发器，在两种主题下各截一张图，专门用于证明 Tooltip 等悬停浮层跟随主题。

        两次截图之间用真实主题控件切换（真实用户路径），并在切换后重新悬停，
        以免“鼠标移开后浮层消失”被当成主题不一致。
        """
        verify = verify or []
        set_theme(self.page, "light")
        light_probe = self.hover_until_overlay(hover)
        self.verify_assertions(verify)
        light_path = self.out_dir / f"{name}-light.png"
        save_screenshot(self.page, light_path)
        self.page.mouse.move(8, 8)
        self.page.wait_for_timeout(400)
        toggle_mode = set_theme(self.page, "dark")
        expect_theme(self.page, "dark")
        dark_probe = self.hover_until_overlay(hover)
        self.verify_assertions(verify)
        dark_path = self.out_dir / f"{name}-dark.png"
        save_screenshot(self.page, dark_path)
        self.page.mouse.move(8, 8)
        self.page.wait_for_timeout(150)
        back_mode = set_theme(self.page, "light")
        expect_theme(self.page, "light")
        unchanged = [light["selector"] for light, dark in zip(light_probe, dark_probe) if light["background"] == dark["background"] and light["color"] == dark["color"]]
        if unchanged:
            raise StepFailure(f"悬停浮层未随主题变化：{sorted(set(unchanged))}")
        self.report["screenshots"].append(
            {
                "name": name,
                "light": str(light_path.relative_to(self.out_dir)),
                "dark": str(dark_path.relative_to(self.out_dir)),
                "switchMode": {"toDark": toggle_mode, "toLight": back_mode, "hover": "每次截图前重新悬停"},
                "probeOverlays": True,
                "overlays": {"light": light_probe, "dark": dark_probe},
            }
        )

    def capture_here(self, name: str, verify: list[dict] | None = None) -> None:
        """在当前主题下截一张图，不做任何切换。

        主题必须在此步骤之前已由真实控件设定（用户路径）。因此本步骤产出的
        截图是弹窗等“打开后无法再切换主题”场景的唯一合法用户路径证据。
        """
        verify = verify or []
        theme = self.page.get_attribute("html", "data-theme")
        expect_theme(self.page, theme)
        self.verify_assertions(verify)
        self.page.wait_for_timeout(120)
        path = self.out_dir / f"{name}-{theme}.png"
        save_screenshot(self.page, path)
        self.report["screenshots"].append(
            {
                "name": name,
                "theme": theme,
                "light": str(path.relative_to(self.out_dir)) if theme == "light" else None,
                "dark": str(path.relative_to(self.out_dir)) if theme == "dark" else None,
                "switchMode": "user-path（本步不切换，主题由之前的真实控件设定）",
                "overlays": probe_overlays(self.page),
            }
        )

    def run_step(self, step: dict) -> None:
        page = self.page
        if "goto" in step:
            page.goto(self.report["baseUrl"] + step["goto"], wait_until="load")
        elif "storageTheme" in step:
            theme = step["storageTheme"]
            if theme is None:
                page.evaluate("() => localStorage.removeItem('learn_everything_theme')")
            else:
                page.evaluate("(theme) => localStorage.setItem('learn_everything_theme', theme)", theme)
        elif "reload" in step:
            page.reload(wait_until="load")
        elif "click" in step:
            locator_for(page, step["click"]).first.click(timeout=DEFAULT_TIMEOUT_MS)
        elif "hover" in step:
            locator_for(page, step["hover"]).first.hover(timeout=DEFAULT_TIMEOUT_MS)
        elif "fill" in step:
            spec = step["fill"]
            locator_for(page, spec).first.fill(spec["value"])
        elif "press" in step:
            page.keyboard.press(step["press"])
        elif "key" in step:
            page.keyboard.press(step["key"])
            page.wait_for_timeout(80)
        elif "focus" in step:
            locator_for(page, step["focus"]).first.focus()
        elif "setFiles" in step:
            spec = step["setFiles"]
            temp = Path(tempfile.gettempdir()) / spec["fileName"]
            temp.write_text(spec.get("content", "验收用虚构资料"), encoding="utf-8")
            page.get_by_label(spec["label"], exact=spec.get("exact", False)).first.set_input_files(str(temp))
        elif "selectOption" in step:
            spec = step["selectOption"]
            locator_for(page, {"role": "button", "name": spec["label"]}).first.click(timeout=DEFAULT_TIMEOUT_MS)
            page.get_by_role("option", name=spec["option"], exact=False).first.click(timeout=DEFAULT_TIMEOUT_MS)
        elif "probe" in step:
            self.report["probes"].append({
                "label": step["probe"],
                "state": page.evaluate(
                    """() => ({
                        attr: document.documentElement.getAttribute('data-theme'),
                        dark: document.documentElement.classList.contains('dark'),
                        stored: localStorage.getItem('learn_everything_theme'),
                        toggles: Array.from(document.querySelectorAll('button[aria-label]')).map((el) => el.getAttribute('aria-label')).filter((label) => label && label.includes('主题')),
                    })"""
                ),
                "locators": {
                    "allButtons": page.get_by_role("button").count(),
                    "darkToggle": page.get_by_role("button", name="切换为深色主题").count(),
                    "lightToggle": page.get_by_role("button", name="切换为浅色主题").count(),
                    "lightToggleVisible": page.get_by_role("button", name="切换为浅色主题").first.is_visible() if page.get_by_role("button", name="切换为浅色主题").count() else None,
                },
            })
        elif "screenshotPair" in step:
            spec = step["screenshotPair"]
            self.capture_hover_pair(spec["name"], spec["hover"], spec.get("verify"))
        elif "expectScrollable" in step:
            spec = step["expectScrollable"]
            locator = locator_for(page, spec).first
            locator.wait_for(state="attached", timeout=DEFAULT_TIMEOUT_MS)
            horizontal = locator.evaluate("el => el.scrollWidth - el.clientWidth")
            vertical = locator.evaluate("el => el.scrollHeight - el.clientHeight")
            if horizontal <= 2:
                raise StepFailure(f"{describe(spec)} 期望横向可滚动，实际可滚动宽度 {horizontal}")
            if spec.get("vertical") and vertical <= 2:
                raise StepFailure(f"{describe(spec)} 期望纵向可滚动，实际可滚动高度 {vertical}")
        elif "screenshotHere" in step:
            spec = step["screenshotHere"]
            self.capture_here(spec["name"], spec.get("verify"))
        elif "viewport" in step:
            page.set_viewport_size({"width": step["viewport"]["width"], "height": step["viewport"]["height"]})
        elif "wait" in step:
            page.wait_for_timeout(step["wait"])
        elif "setApiError" in step:
            control(page, self.report["baseUrl"], {"error": step["setApiError"]})
        elif "setApiDelay" in step:
            control(page, self.report["baseUrl"], {"delay_ms": step["setApiDelay"]})
        elif "setEmptyProjects" in step:
            control(page, self.report["baseUrl"], {"empty_projects": step["setEmptyProjects"]})
        elif "toggleTheme" in step:
            set_theme(page, step["toggleTheme"])
        elif "expectTheme" in step:
            expect_theme(page, step["expectTheme"])
        elif "expectVisible" in step:
            self.expect_visible(step["expectVisible"])
        elif "expectHidden" in step:
            self.expect_hidden(step["expectHidden"])
        elif "expectText" in step:
            text = step["expectText"]
            page.get_by_text(text, exact=False).first.wait_for(state="visible", timeout=DEFAULT_TIMEOUT_MS)
        elif "expectDisabled" in step:
            locator = locator_for(page, step["expectDisabled"]).first
            locator.wait_for(state="visible", timeout=DEFAULT_TIMEOUT_MS)
            if not locator.is_disabled():
                raise StepFailure(f"{describe(step['expectDisabled'])} 期望禁用，实际可用")
        elif "expectEnabled" in step:
            locator = locator_for(page, step["expectEnabled"]).first
            locator.wait_for(state="visible", timeout=DEFAULT_TIMEOUT_MS)
            if locator.is_disabled():
                raise StepFailure(f"{describe(step['expectEnabled'])} 期望可用，实际禁用")
        elif "scrollTo" in step:
            spec = step["scrollTo"]
            locator = locator_for(page, spec).first
            locator.wait_for(state="attached", timeout=DEFAULT_TIMEOUT_MS)
            locator.scroll_into_view_if_needed(timeout=DEFAULT_TIMEOUT_MS)
            page.wait_for_timeout(120)
        elif "expectInViewport" in step:
            spec = step["expectInViewport"]
            locator = locator_for(page, spec).first
            locator.wait_for(state="attached", timeout=DEFAULT_TIMEOUT_MS)
            box = locator.bounding_box()
            viewport = page.viewport_size or {"width": 0, "height": 0}
            if not box:
                raise StepFailure(f"{describe(spec)} 无布局尺寸，无法判断是否在视口内")
            if box["x"] < -1 or box["y"] < -1 or box["x"] + box["width"] > viewport["width"] + 1 or box["y"] + box["height"] > viewport["height"] + 1:
                raise StepFailure(
                    f"{describe(spec)} 超出视口：{box} 视口 {viewport}"
                )
        elif "wheelTo" in step:
            spec = step["wheelTo"]
            locator = locator_for(page, spec).first
            locator.wait_for(state="attached", timeout=DEFAULT_TIMEOUT_MS)
            viewport = page.viewport_size or {"width": 0, "height": 0}

            def in_view() -> bool:
                box = locator.bounding_box()
                return bool(box) and box["y"] >= -1 and box["y"] + box["height"] <= viewport["height"] + 1

            reached = in_view()
            for ratio in (0.6, 0.3, 0.85):
                if reached:
                    break
                page.mouse.move(viewport["width"] / 2, viewport["height"] * ratio)
                for _ in range(60):
                    if in_view():
                        reached = True
                        break
                    page.mouse.wheel(0, 120)
                    page.wait_for_timeout(60)
            if not reached:
                raise StepFailure(f"{describe(spec)} 无法用滚轮滚动进入视口，可能被不可滚动区域隐藏")
            page.wait_for_timeout(120)
        elif "expectChecked" in step:
            spec = step["expectChecked"]
            locator = locator_for(page, spec).first
            if locator.is_checked() != spec.get("checked", True):
                raise StepFailure(f"{describe(spec)} 勾选状态不符合期望")
        elif "expectSelected" in step:
            spec = step["expectSelected"]
            locator = locator_for(page, spec).first
            if locator.get_attribute("aria-selected") != "true":
                raise StepFailure(f"{describe(spec)} 期望选中，实际 aria-selected={locator.get_attribute('aria-selected')!r}")
            self.report["probes"].append({"label": f"selected:{spec.get('name')}", "state": {"aria-selected": "true"}})
        elif "expectFocus" in step:
            target = step["expectFocus"]
            focused = page.evaluate(
                """() => {
                    const el = document.activeElement;
                    if (!el) return '';
                    const label = el.labels && el.labels[0] ? el.labels[0].textContent : '';
                    return [el.getAttribute('aria-label'), label, el.getAttribute('placeholder'), el.textContent]
                        .filter(Boolean).join(' | ').trim();
                }"""
            )
            if target["name"] not in focused:
                raise StepFailure(f"期望焦点在 {target['name']!r}，实际 {focused!r}")
        elif "expectNoText" in step:
            text = step["expectNoText"]
            matches = page.get_by_text(text, exact=False)
            for index in range(matches.count()):
                if matches.nth(index).is_visible():
                    raise StepFailure(f"不应出现文本 {text!r}")
        elif "screenshot" in step:
            spec = step["screenshot"]
            if isinstance(spec, dict):
                self.capture(spec["name"], spec.get("verify"), spec.get("probeOverlays", True))
            else:
                self.capture(spec)
        else:
            raise StepFailure(f"未知步骤：{step}")


def run_scenario(browser, scenario: dict, args, out_dir: Path) -> dict:
    viewport = scenario.get("viewport", {"width": 1280, "height": 900})
    context = browser.new_context(viewport=viewport, locale="zh-CN")
    page = context.new_page()
    console_errors: list[str] = []
    failed_requests: list[str] = []
    page.on("console", lambda message: console_errors.append(f"{message.type}: {message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: console_errors.append(f"pageerror: {error}"))
    page.on("requestfailed", lambda request: failed_requests.append(f"{request.method} {request.url} -> {request.failure}"))
    report = {
        "name": scenario["name"],
        "baseUrl": args.base_url,
        "status": "passed",
        "steps": [],
        "screenshots": [],
        "probes": [],
        "consoleErrors": console_errors,
        "failedRequests": failed_requests,
    }
    runner = Runner(page, out_dir, report)
    try:
        control(page, args.base_url, {"reset": True})
        for index, step in enumerate(scenario["steps"]):
            label = next(iter(step))
            runner.run_step(step)
            report["steps"].append({"index": index, "step": label, "target": step.get(label) if isinstance(step.get(label), (str, dict)) else True})
    except (StepFailure, PlaywrightError, AssertionError) as error:
        report["status"] = "failed"
        report["error"] = f"{type(error).__name__}: {error}"
        try:
            report["failureSnapshot"] = page.locator("body").aria_snapshot()[:6000]
        except PlaywrightError:
            pass
        try:
            page.screenshot(path=str(out_dir / f"{scenario['name']}-failure.png"))
        except (PlaywrightError, OSError):
            pass
    finally:
        context.close()
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenarios", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--port", type=int, default=8123)
    parser.add_argument("--static", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "out"))
    parser.add_argument("--only", default=None)
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()
    args.base_url = f"http://127.0.0.1:{args.port}"

    scenarios = json.loads(Path(args.scenarios).read_text(encoding="utf-8"))["scenarios"]
    if args.only:
        scenarios = [item for item in scenarios if item["name"] == args.only]
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    static_dir = os.path.abspath(args.static)
    if not os.path.exists(os.path.join(static_dir, "index.html")):
        print(f"缺少静态产物：{static_dir}/index.html，请先运行 npm run build", file=sys.stderr)
        return 2

    server = stub_api.serve(args.port, static_dir)
    results = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=not args.headed)
            for scenario in scenarios:
                results.append(run_scenario(browser, scenario, args, out_dir))
            browser.close()
    finally:
        server.shutdown()

    dom_swaps: list[str] = []
    unprobed: list[str] = []
    for item in results:
        for shot in item.get("screenshots", []):
            mode = shot.get("switchMode")
            if isinstance(mode, dict) and "dom-swap" in mode.values():
                dom_swaps.append(f"{item['name']}/{shot['name']}")
            if shot.get("probeOverlays") is False:
                unprobed.append(f"{item['name']}/{shot['name']}")
    summary = {
        "baseUrl": args.base_url,
        "static": static_dir,
        "ranAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "domSwapScreenshots": dom_swaps,
        "withoutOverlayProbe": unprobed,
        "scenarios": results,
    }
    (out_dir / "report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["| 场景 | 结果 | 截图 |", "| --- | --- | --- |"]
    for item in results:
        pairs = sum(1 for shot in item["screenshots"] if isinstance(shot.get("switchMode"), dict))
        singles = len(item["screenshots"]) - pairs
        shots = f"{pairs} 组双主题截图" if not singles else f"{pairs} 组双主题 + {singles} 张单主题（用户路径）"
        lines.append(f"| {item['name']} | {'通过' if item['status'] == 'passed' else '失败：' + item.get('error', '')} | {shots} |")
    if dom_swaps:
        lines.append("")
        lines.append(f"> 注意：{len(dom_swaps)} 张截图在弹窗打开时用受控 DOM 切换主题生成（{', '.join(dom_swaps)}），只能证明浮层随主题变色，不能作为“用户可在弹窗内切换主题”的证据。")
    if unprobed:
        lines.append("")
        lines.append(f"> 注意：{len(unprobed)} 张截图声明不覆盖浮层主题一致性（{', '.join(unprobed)}），不得被引用为 Tooltip/弹窗/选择器浮层的主题证据。")
    (out_dir / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    failed = [item for item in results if item["status"] != "passed"]
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
