import sys
from pathlib import Path

sys.path.insert(0, str(Path("tests/browser").resolve()))

import stub_api
from playwright.sync_api import sync_playwright

PORT = 8195

server = stub_api.serve(PORT, Path("out"))
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="zh-CN")
        page = context.new_page()
        page.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")
        page.wait_for_timeout(1500)
        button = page.get_by_role("button", name="刷新项目").first
        print("visible:", button.is_visible())
        box = button.bounding_box()
        print("box:", box)
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=8)
        for index in range(12):
            page.wait_for_timeout(250)
            count = page.evaluate("() => document.querySelectorAll('[role=tooltip]').length")
            text = page.evaluate("() => Array.from(document.querySelectorAll('[role=tooltip]')).map((el) => el.textContent).join('|')")
            print(f"hover t={250 * (index + 1)}ms tooltips={count} text={text[:40]!r}")
        button.hover()
        page.wait_for_timeout(1200)
        count = page.evaluate("() => document.querySelectorAll('[role=tooltip]').length")
        print("locator.hover tooltips=", count)
        box = button.bounding_box()
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=1)
        page.wait_for_timeout(1000)
        count = page.evaluate("() => document.querySelectorAll('[role=tooltip]').length")
        print("single-jump move tooltips=", count)
        browser.close()
finally:
    server.shutdown()
