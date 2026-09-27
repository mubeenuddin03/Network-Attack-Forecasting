"""
One-Click Local Development Startup for Network Attack Forecasting.
Starts FastAPI (8000), Streamlit (8501), and Vite Frontend (5173) concurrently.

Usage:
    python start.py           # Start all services + auto-open browser
    python start.py --no-open # Start all services, skip opening browser
"""
import os
import sys
import socket
import time
import webbrowser
import argparse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0

def get_python_exe() -> str:
    """Return venv python if available, else sys.executable."""
    for candidate in [
        ROOT_DIR / ".venv" / "Scripts" / "python.exe",
        ROOT_DIR / "venv"  / "Scripts" / "python.exe",
    ]:
        if candidate.exists():
            return str(candidate)
    return sys.executable

def check_npm() -> bool:
    return os.system("npm --version >nul 2>&1") == 0

def launch_service(title: str, cwd: str, cmd: str):
    """Open a new cmd window running `cmd` in `cwd`."""
    full = f'start "{title}" cmd /k "cd /d \\"{cwd}\\" && {cmd}"'
    os.system(full)

def main():
    parser = argparse.ArgumentParser(description="Launch all dev services.")
    parser.add_argument("--no-open", action="store_true", help="Skip opening browser")
    args = parser.parse_args()

    py = get_python_exe()
    npm_ok = check_npm()

    SEP = "=" * 64
    print(f"\n{SEP}")
    print("   Network Attack Forecasting  —  One-Click Dev Launcher")
    print(SEP)
    print(f"  Project : {ROOT_DIR}")
    print(f"  Python  : {py}")
    print(f"  npm     : {'found' if npm_ok else 'NOT FOUND — frontend will be skipped'}")
    print()

    # ── FastAPI (8000) ──────────────────────────────────────────────────
    if is_port_in_use(8000):
        print("[ALREADY RUNNING]  FastAPI Backend     http://localhost:8000")
    else:
        print("[STARTING]         FastAPI Backend     http://localhost:8000 ...")
        launch_service(
            "FastAPI [8000]", str(ROOT_DIR),
            f'"{py}" -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload'
        )

    # ── Streamlit (8501) ────────────────────────────────────────────────
    if is_port_in_use(8501):
        print("[ALREADY RUNNING]  Streamlit Dashboard http://localhost:8501")
    else:
        print("[STARTING]         Streamlit Dashboard http://localhost:8501 ...")
        launch_service(
            "Streamlit [8501]", str(ROOT_DIR),
            f'"{py}" -m streamlit run app/app.py --server.port 8501 --server.headless true'
        )

    # ── Vite Frontend (5173) ────────────────────────────────────────────
    if not npm_ok:
        print("[SKIPPED]          Frontend — npm not found. Install Node.js first.")
    elif is_port_in_use(5173):
        print("[ALREADY RUNNING]  Frontend (Vite)     http://localhost:5173")
    else:
        print("[STARTING]         Frontend (Vite)     http://localhost:5173 ...")
        launch_service("Frontend Vite [5173]", str(FRONTEND_DIR), "npm run dev")

    print(f"\n{SEP}")
    print("  Services launched!")
    print(SEP)
    print("  [1]  Frontend Dashboard  →  http://localhost:5173")
    print("  [2]  FastAPI Backend     →  http://localhost:8000")
    print("  [3]  Swagger / API Docs  →  http://localhost:8000/docs")
    print("  [4]  Streamlit Analytics →  http://localhost:8501")
    print(f"{SEP}")
    print("  Press Ctrl+C in any terminal window to stop that service.")

    # ── Auto-open browser ───────────────────────────────────────────────
    if not args.no_open:
        print("\n[BROWSER] Opening dashboard in 5 seconds ...")
        time.sleep(5)
        webbrowser.open("http://localhost:5173")
        print("[BROWSER] Opened http://localhost:5173\n")

if __name__ == "__main__":
    main()
