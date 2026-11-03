import os
import sys

import pytest

os.environ["PRELOAD_EMBEDDINGS"] = "0"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app as app_module  # noqa: E402
from ecourts import ECourtsClient  # noqa: E402
from fake_ecourts import VALID_KEY, FakeECourts  # noqa: E402

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"
TOKENS = {"token-a": USER_A, "token-b": USER_B}


@pytest.fixture
def upstream():
    fake = FakeECourts()
    yield fake
    fake.close()


@pytest.fixture
def ecourts_ready(upstream, monkeypatch, tmp_path):
    client = ECourtsClient(
        api_key=VALID_KEY,
        base_url=upstream.url,
        store_path=str(tmp_path / "store.sqlite3"),
        sleep=lambda _: None,
    )
    monkeypatch.setattr(app_module, "ecourts_client", client)
    return client


@pytest.fixture
def client(monkeypatch):
    """Flask client with Supabase token checks, Pinecone and Groq replaced."""

    def fake_verify(token):
        if token == "supabase-down":
            raise app_module.AuthUnavailable("down")
        if token not in TOKENS:
            raise app_module.AuthInvalid()
        return TOKENS[token]

    monkeypatch.setattr(app_module, "verify_supabase_token", fake_verify)
    monkeypatch.setattr(app_module, "retrieve_context", lambda *a, **k: ["passage"])
    monkeypatch.setattr(
        app_module,
        "generate_response",
        lambda query, contexts, history, service, case_context="": f"answer:{query}|history:{len(history)}|case:{case_context}",
    )
    monkeypatch.setattr(app_module, "plan_court_lookup", lambda query, history: None)
    app_module.conversations.clear()
    app_module.rate_limiter.reset()
    return app_module.app.test_client()


def auth(token="token-a"):
    return {"Authorization": f"Bearer {token}"}
