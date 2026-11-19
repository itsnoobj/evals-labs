---
inclusion: fileMatch
fileMatchPattern: "**/test_*.py"
---
# Testing
- Every function with logic gets a unit test. Trivial one-liners do not.
- Test file mirrors source: `app/orders/service.py` -> `tests/orders/test_service.py`.
- Name tests as behavior: `test_rejects_negative_quantity`.
- Arrange/act/assert, no shared state, no mocks of things you own. Fake only I/O edges (network, clock, DB).
- Prefer `pytest.mark.parametrize` over copy-pasted cases. `pytest-asyncio` (auto mode) for async.
- Bug fix = failing test first, then the fix.
- Each spec acceptance line maps to at least one test; name the test in the spec.
