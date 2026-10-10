import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
OUT = Path("../.scratch/heroui-integration/evidence/real-app")
TABS = ["学习概览", "学习路线", "到期复习", "RAG 问答", "查漏测验", "模型配置"]


def theme(page, target):
    label = "切换为深色主题" if target == "dark" else "切换为浅色主题"
    if page.get_attribute("html", "data-theme") != target:
        page.get_by_role("button", name=label).first.click(timeout=8000)
        page.wait_for_timeout(400)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))
        page.goto(BASE, wait_until="load")
        page.wait_for_timeout(4000)
        for theme_name in ("light", "dark"):
            theme(page, theme_name)
            for tab in TABS:
                try:
                    page.get_by_role("tab", name=tab).first.click(timeout=6000)
                except Exception as error:  # noqa: BLE001
                    print(f"跳过 {tab}: {type(error).__name__}")
                    continue
                page.wait_for_timeout(1500)
                safe = tab.replace(" ", "")
                page.screenshot(path=str(OUT / f"{safe}-{theme_name}.png"))
                print(f"已截图 {tab} ({theme_name})")
        print("console 错误数:", len(console_errors))
        for item in console_errors[:5]:
            print("  -", item[:160])
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
