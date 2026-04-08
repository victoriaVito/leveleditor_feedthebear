from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


DEFAULT_PORTS = (8765, 8766, 8770, 8785, 8791, 8792, 8793, 8794, 8795, 8800)


def _is_listening(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) == 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Start the Feed the Bear Python UI")
    parser.add_argument("ports", nargs="*", type=int, help="Optional ordered port candidates")
    parser.add_argument("--host", default=os.environ.get("FTB_UI_HOST", "127.0.0.1"))
    parser.add_argument("--background", action="store_true", help="Run the UI in the background")
    parser.add_argument("--open", dest="open_browser", action="store_true", help="Open the browser after starting")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    state_dir = repo_root / ".local/python_toolkit_ui"
    pid_file = state_dir / "ui.pid"
    port_file = state_dir / "ui.port"
    log_file = state_dir / "ui.log"
    state_dir.mkdir(parents=True, exist_ok=True)

    if pid_file.exists() and port_file.exists():
        try:
            existing_pid = int(pid_file.read_text(encoding="utf-8").strip())
            existing_port = int(port_file.read_text(encoding="utf-8").strip())
        except ValueError:
            existing_pid = 0
            existing_port = 0
        if existing_pid > 0 and existing_port > 0 and _is_listening(args.host, existing_port):
            url = f"http://{args.host}:{existing_port}"
            print("Feed the Bear Python UI already running.")
            print(f"pid={existing_pid}")
            print(f"url={url}")
            if args.open_browser:
                webbrowser.open(url)
            return 0

    ports = tuple(args.ports) if args.ports else DEFAULT_PORTS
    chosen_port = next((port for port in ports if not _is_listening(args.host, port)), None)
    if chosen_port is None:
        print(f"No free port found in: {' '.join(str(port) for port in ports)}", file=sys.stderr)
        return 1

    command = [sys.executable, "run_cli.py", "serve-ui", "--host", args.host, "--port", str(chosen_port)]
    url = f"http://{args.host}:{chosen_port}"
    if args.background:
        with log_file.open("ab") as log_handle:
            process = subprocess.Popen(command, cwd=script_dir, stdout=log_handle, stderr=subprocess.STDOUT)
        pid_file.write_text(str(process.pid), encoding="utf-8")
        port_file.write_text(str(chosen_port), encoding="utf-8")
        ready = False
        for _ in range(50):
            if _is_listening(args.host, chosen_port):
                ready = True
                break
            time.sleep(0.1)
        if not ready:
            print("UI process started but port did not become ready.", file=sys.stderr)
            print(f"pid={process.pid}", file=sys.stderr)
            print(f"log={log_file}", file=sys.stderr)
            return 1
        print("Feed the Bear Python UI started.")
        print(f"pid={process.pid}")
        print(f"url={url}")
        print(f"log={log_file}")
        if args.open_browser:
            webbrowser.open(url)
        return 0

    print("Feed the Bear Python UI")
    print(f"url={url}")
    print("Press Ctrl+C to stop.")
    if args.open_browser:
        webbrowser.open(url)
    return subprocess.call(command, cwd=script_dir)


if __name__ == "__main__":
    raise SystemExit(main())
