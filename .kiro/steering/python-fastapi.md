---
inclusion: fileMatch
fileMatchPattern: "**/*.py"
---
# Python + FastAPI

## Style
- Python 3.12+, type hints everywhere, `ruff` for lint+format, `pytest` for tests, `uv` for deps.
- Functions and modules, not classes. Use `pydantic` models for data crossing a boundary, `dataclass` otherwise.
- `pydantic-settings` for config. One `settings.py`. No `os.environ` scattered around.
- Prefer `httpx.AsyncClient`, `asyncpg`/`SQLAlchemy 2 async`, `anyio`. Never `requests` or sync DB drivers in async paths.
- `pathlib` over `os.path`. `logging`/`structlog`, no `print`. Raise specific exceptions, do not swallow.

## FastAPI
- `async def` endpoints. Plain `def` only for CPU-light sync-only libs (FastAPI threads them).
- Dependencies via `Depends` (db session, auth, settings). No globals, no singletons.
- One `APIRouter` per feature in `app/<feature>/router.py`; logic in `app/<feature>/service.py` as plain functions.
- Response models via `response_model=`. Never return ORM objects raw.
- `lifespan` for startup/shutdown (clients, pools). No `@app.on_event`.
- Errors: `HTTPException` at the edge only; domain code raises plain exceptions mapped by one handler.
- Health: `/healthz` (liveness), `/readyz` (deps).
- Test with `httpx.AsyncClient(transport=ASGITransport(app))` and `app.dependency_overrides`.

## Layout
```
app/
  main.py          # app + lifespan + include_router
  settings.py
  <feature>/router.py, service.py, models.py
tests/<feature>/test_service.py, test_router.py
```
