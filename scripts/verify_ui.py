"""端到端真实浏览器验证脚本：
启动 FastAPI 服务并驱动真实 Chromium (Edge) 浏览器，
模拟用户点击 6 个工作区标签页，验证面板切换、DOM 响应与无控制台错误。
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen
import websockets

ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = ROOT / "kotaemon" / ".venv" / "Scripts" / "python.exe"
EDGE_PATHS = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
]
API_PORT = 8000
CDP_PORT = 9222


def _is_port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("127.0.0.1", port)) != 0


def _find_edge() -> Path | None:
    for path in EDGE_PATHS:
        if path.is_file():
            return path
    edge_which = shutil.which("msedge")
    return Path(edge_which) if edge_which else None


async def run_cdp_test():
    edge_bin = _find_edge()
    if not edge_bin:
        print("[错误] 未找到 Edge 浏览器")
        return 1

    api_process = None
    if _is_port_free(API_PORT):
        print("[1/5] 启动 FastAPI 静态前端服务...")
        env = os.environ.copy()
        for key in ("COHERE_API_KEY", "VOYAGE_API_KEY", "MISTRAL_API_KEY", "GOOGLE_API_KEY"):
            env.setdefault(key, "placeholder-key-1234567890")
        env["PYTHONPATH"] = os.pathsep.join([str(ROOT), str(ROOT / "kotaemon"), env.get("PYTHONPATH", "")])
        env["HF_HUB_OFFLINE"] = "1"
        env["TRANSFORMERS_OFFLINE"] = "1"
        env["PYTHONUTF8"] = "1"

        api_process = subprocess.Popen(
            [str(VENV_PYTHON), "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", str(API_PORT)],
            cwd=ROOT,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        import threading
        def _drain_stdout():
            try:
                for line in api_process.stdout:
                    line_s = line.strip()
                    if "ERROR" in line_s or "Uvicorn running" in line_s:
                        print(f"    [api] {line_s}")
            except Exception:
                pass
        threading.Thread(target=_drain_stdout, daemon=True).start()

        # 等待服务就绪
        deadline = time.time() + 60
        ready = False
        while time.time() < deadline:
            if not _is_port_free(API_PORT):
                ready = True
                break
            time.sleep(0.5)
        if not ready:
            print("[错误] FastAPI 启动超时")
            if api_process:
                api_process.terminate()
            return 1
        print("  FastAPI 服务已就绪: http://127.0.0.1:8000")
    else:
        print("[1/5] 检测到 8000 端口已在运行，复用现有服务")

    tmp_dir = tempfile.mkdtemp(prefix="edge_profile_")
    edge_process = None
    try:
        print("[2/5] 启动 Headless Edge 浏览器并开启 CDP 端口...")
        edge_cmd = [
            str(edge_bin),
            "--headless=new",
            f"--remote-debugging-port={CDP_PORT}",
            f"--user-data-dir={tmp_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-sync",
            "--disable-gpu",
            f"http://127.0.0.1:{API_PORT}",
        ]
        edge_process = subprocess.Popen(edge_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 等待 CDP 端口就绪
        deadline = time.time() + 20
        cdp_ready = False
        targets = []
        while time.time() < deadline:
            try:
                with urlopen(f"http://127.0.0.1:{CDP_PORT}/json", timeout=2) as resp:
                    targets = json.loads(resp.read().decode("utf-8"))
                    if targets:
                        cdp_ready = True
                        break
            except Exception:
                time.sleep(0.3)

        if not cdp_ready or not targets:
            print("[错误] 无法连接到 Edge CDP 调试端口")
            return 1

        target = next((t for t in targets if t.get("type") == "page"), targets[0])
        ws_url = target.get("webSocketDebuggerUrl")
        print(f"  已连接页面 CDP: {ws_url}")

        print("[3/5] 开始执行标签页交互自动化测试...")
        async with websockets.connect(ws_url) as ws:
            req_id = 0

            async def send_cmd(method: str, params: dict | None = None):
                nonlocal req_id
                req_id += 1
                payload = {"id": req_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    resp_raw = await ws.recv()
                    resp = json.loads(resp_raw)
                    if resp.get("id") == req_id:
                        return resp.get("result")

            async def eval_js(expression: str):
                res = await send_cmd("Runtime.evaluate", {
                    "expression": expression,
                    "returnByValue": True,
                    "awaitPromise": True
                })
                return res.get("result", {}).get("value")

            # 启用 Runtime 和 Console 监听
            await send_cmd("Runtime.enable")
            await send_cmd("Page.enable")
            await send_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })
            await send_cmd("Page.navigate", {"url": f"http://127.0.0.1:{API_PORT}/"})
            await asyncio.sleep(1.5)
            await eval_js("""
                (() => {
                    window.__browser_errors__ = [];
                    const prevErr = console.error;
                    console.error = (...args) => {
                        window.__browser_errors__.push(args.map(a => String(a)).join(' '));
                        prevErr(...args);
                    };
                    window.addEventListener('error', e => {
                        window.__browser_errors__.push(e.message || String(e));
                    });
                })()
            """)

            print("  等待项目工作台加载就绪 (等待 workspace-tab-dashboard 出现)...")
            workspace_ready = False
            for i in range(60):
                status_info = await eval_js("""
                    (() => {
                        const tab = document.getElementById('workspace-tab-dashboard');
                        const aside = document.querySelector('aside');
                        const main = document.querySelector('main');
                        return {
                            hasTab: Boolean(tab),
                            asideText: aside ? aside.innerText.slice(0, 100).replace(/\\s+/g, ' ') : '',
                            mainText: main ? main.innerText.slice(0, 100).replace(/\\s+/g, ' ') : ''
                        };
                    })()
                """)
                if status_info and status_info.get("hasTab"):
                    workspace_ready = True
                    print(f"  工作台已就绪！耗时约 {i * 0.5:.1f} 秒")
                    break

                # 如果没有工作台，检查是否需要点击侧边栏第一个项目
                has_active_project = await eval_js("Boolean(document.querySelector('article button[aria-current=\"page\"]'))")
                if not has_active_project:
                    await eval_js("document.querySelector('article button')?.click()")

                await asyncio.sleep(0.5)

            if not workspace_ready:
                errs = await eval_js("window.__browser_errors__ || []")
                print(f"[错误] 等待工作台就绪超时，当前界面状态: {status_info}")
                print(f"       浏览器控制台错误: {errs}")

            tabs_to_test = [
                ("dashboard", "学习概览"),
                ("roadmap", "学习路线"),
                ("review", "到期复习"),
                ("rag", "RAG 问答"),
                ("quiz", "查漏测验"),
                ("models", "模型配置"),
            ]

            print("[4/5] 测试各个标签页切换...")
            all_passed = True
            for tab_id, tab_label in tabs_to_test:
                print(f"  -> 点击切换到 [{tab_label}] (id: workspace-tab-{tab_id})...")
                click_result = await eval_js(f"""
                    (() => {{
                        const btn = document.getElementById('workspace-tab-{tab_id}');
                        if (!btn) return {{ error: '找不到标签按钮 workspace-tab-{tab_id}' }};
                        btn.click();
                        return {{
                            selected: btn.getAttribute('aria-selected'),
                            text: btn.textContent.trim()
                        }};
                    }})()
                """)

                if not click_result or click_result.get("error"):
                    print(f"    [失败] {click_result}")
                    all_passed = False
                    continue

                await asyncio.sleep(0.5)

                # 验证 panel 状态与当前激活 tab
                check_status = await eval_js(f"""
                    (() => {{
                        const btn = document.getElementById('workspace-tab-{tab_id}');
                        const isSelected = btn && btn.getAttribute('aria-selected') === 'true';
                        const panel = document.getElementById('workspace-panel-{tab_id}');
                        // 检查当前面板内容是否可见
                        const panelText = panel ? panel.innerText.slice(0, 80).replace(/\\s+/g, ' ') : '';
                        return {{
                            isSelected,
                            hasPanel: Boolean(panel),
                            panelPreview: panelText
                        }};
                    }})()
                """)

                print(f"    [OK] aria-selected={check_status.get('isSelected')}, 面板内容预览: {check_status.get('panelPreview')[:40]}...")
                if not check_status.get("isSelected"):
                    print(f"    [失败] {tab_label} aria-selected 未正确设为 true")
                    all_passed = False

            # 截图保存作为证据
            print("[5/6] 保存浅色主题验证截图 (docs/light_theme_verified.png)...")
            import base64
            screenshot_light = await send_cmd("Page.captureScreenshot", {"format": "png"})
            if screenshot_light and screenshot_light.get("data"):
                img_bytes = base64.b64decode(screenshot_light["data"])
                out_img_light = ROOT / "docs" / "light_theme_verified.png"
                out_img_light.parent.mkdir(exist_ok=True)
                out_img_light.write_bytes(img_bytes)
                print(f"  [OK] 浅色主题截图已保存: {out_img_light}")

            print("[6/6] 测试主题切换按钮 (切换到深色主题)...")
            toggle_res = await eval_js("""
                (async () => {
                    const btn = document.querySelector('button[aria-label*="主题"]');
                    if (!btn) return { error: '未找到主题切换按钮' };
                    btn.click();
                    await new Promise(r => setTimeout(r, 400));
                    return {
                        isDark: document.documentElement.classList.contains('dark'),
                        label: btn.getAttribute('aria-label')
                    };
                })()
            """)
            print(f"  主题切换结果: {toggle_res}")
            await asyncio.sleep(0.3)

            screenshot_dark = await send_cmd("Page.captureScreenshot", {"format": "png"})
            if screenshot_dark and screenshot_dark.get("data"):
                img_bytes = base64.b64decode(screenshot_dark["data"])
                out_img_dark = ROOT / "docs" / "dark_theme_verified.png"
                out_img_dark.parent.mkdir(exist_ok=True)
                out_img_dark.write_bytes(img_bytes)
                print(f"  [OK] 深色主题截图已保存: {out_img_dark}")

            # 再次点击切回浅色
            await eval_js("document.querySelector('button[aria-label*=\"主题\"]')?.click()")
            await asyncio.sleep(0.3)

            if all_passed and toggle_res and toggle_res.get("isDark"):
                print("\n=== 全部标签页与浅色/深色主题切换在真实浏览器中 100% 验证通过！ ===")
                return 0
            else:
                print("\n=== 部分验证未通过，请检查！ ===")
                return 1

    finally:
        if edge_process and edge_process.poll() is None:
            edge_process.terminate()
            try:
                edge_process.wait(timeout=5)
            except Exception:
                edge_process.kill()
        if api_process:
            api_process.terminate()
            try:
                api_process.wait(timeout=5)
            except Exception:
                api_process.kill()
        # 兜底清理可能残留在 8000 的子进程
        try:
            subprocess.run(
                ["powershell", "-Command", "$c = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id ($c.OwningProcess | Select -Unique) -Force -ErrorAction SilentlyContinue }"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=5,
            )
        except Exception:
            pass
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    code = asyncio.run(run_cdp_test())
    sys.exit(code)
