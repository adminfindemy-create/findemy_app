"""
Emergent-scaffold backend/server.py adapter.

The Findemy backend is a Fastify (Node.js) service that lives at
`/app/backend/api`. The supervisor scaffold for this pod is hard-coded to run
`uvicorn server:app` from `/app/backend`, so we can't just point supervisor
at Node. Instead this module:

  1. On startup, spawns the Fastify server as a child on port 8002.
  2. Exposes a FastAPI `app` on port 8001 (managed by supervisor) that
     transparently proxies every request to the Fastify child.
  3. On shutdown, terminates the child so supervisor restarts cleanly.

This is a bootstrap-only shim — production deploys should run the Fastify
server directly. It exists so the Node backend survives pod restarts under
the read-only supervisor config.
"""
from __future__ import annotations

import asyncio
import os
import signal
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Response

BACKEND_DIR = Path("/app/backend/api")
NODE_PORT = 8002
NODE_URL = f"http://127.0.0.1:{NODE_PORT}"
STARTUP_TIMEOUT_S = 30


async def _wait_for_node(client: httpx.AsyncClient) -> None:
    for _ in range(STARTUP_TIMEOUT_S * 4):
        try:
            r = await client.get(f"{NODE_URL}/health", timeout=1.0)
            if r.status_code == 200:
                return
        except (httpx.ConnectError, httpx.ReadTimeout):
            pass
        await asyncio.sleep(0.25)
    raise RuntimeError("Fastify child did not become ready within 30s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    env = {**os.environ, "PORT": str(NODE_PORT), "HOST": "127.0.0.1"}
    proc = subprocess.Popen(
        ["npx", "ts-node", "--files", "src/server.ts"],
        cwd=str(BACKEND_DIR),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        preexec_fn=os.setsid,
    )
    app.state.node_proc = proc
    app.state.http = httpx.AsyncClient(base_url=NODE_URL, timeout=30.0)
    try:
        await _wait_for_node(app.state.http)
    except Exception:
        # Let supervisor restart us; still yield so /health responds with 502
        # rather than the pod appearing dead.
        pass
    try:
        yield
    finally:
        await app.state.http.aclose()
        if proc.poll() is None:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)


app = FastAPI(lifespan=lifespan)


@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(full_path: str, request: Request) -> Response:
    client: httpx.AsyncClient = request.app.state.http
    # Preserve everything except Host + hop-by-hop headers.
    hop_by_hop = {
        "host",
        "content-length",
        "transfer-encoding",
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "upgrade",
    }
    fwd_headers = {k: v for k, v in request.headers.items() if k.lower() not in hop_by_hop}

    body = await request.body()
    url = "/" + full_path
    if request.url.query:
        url = f"{url}?{request.url.query}"

    try:
        upstream = await client.request(
            request.method,
            url,
            content=body if body else None,
            headers=fwd_headers,
        )
    except (httpx.ConnectError, httpx.ReadTimeout):
        return Response(
            content=b'{"error":"backend unavailable"}',
            status_code=502,
            media_type="application/json",
        )

    resp_headers = {
        k: v for k, v in upstream.headers.items() if k.lower() not in hop_by_hop
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
    )
