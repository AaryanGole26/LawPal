import uuid
from types import SimpleNamespace

import app as app_module
from conftest import USER_A, auth

SERVICE = "consultation"
GUEST = str(uuid.uuid4())


def chat(client, query="hello", service=SERVICE, headers=None):
    return client.post(f"/{service}/chat", json={"query": query}, headers=headers or {})


def history(client, service=SERVICE, headers=None):
    return client.get(f"/{service}/history", headers=headers or {}).get_json()["history"]


# --- chat -------------------------------------------------------------------
def test_every_frontend_service_slug_is_served(client):
    for title in [
        "Personal and Family Legal Assistance",
        "Business Consumer and Criminal legal assistance",
        "Business Consumer and Criminal Legal Assistance",
        "consultation",
    ]:
        assert chat(client, service=title.lower().replace(" ", "-")).status_code == 200


def test_chat_validation(client):
    assert client.post(f"/{SERVICE}/chat", json={}).status_code == 400
    assert client.post(f"/{SERVICE}/chat", json={"query": "   "}).status_code == 400
    assert client.post(f"/{SERVICE}/chat", json={"query": 5}).status_code == 400
    assert client.post(f"/{SERVICE}/chat", json=["x"]).status_code == 400
    assert client.post(f"/{SERVICE}/chat", data="not json").status_code == 400
    assert chat(client, query="x" * 4001).status_code == 400
    assert chat(client, service="nope").status_code == 400


def test_history_is_private_between_users(client):
    assert chat(client, "secret of A", headers=auth("token-a")).status_code == 200
    assert [m["content"] for m in history(client, headers=auth("token-a"))][0] == "secret of A"
    assert history(client, headers=auth("token-b")) == []
    assert history(client) == []


def test_client_supplied_ids_cannot_read_another_users_history(client):
    chat(client, "secret of A", headers=auth("token-a"))
    # The real user's id, sent every way the old API trusted it.
    assert history(client, headers={"X-Guest-ID": USER_A}) == []
    assert history(client, headers={"X-User-ID": USER_A}) == []
    response = client.post(f"/{SERVICE}/chat", json={"query": "q", "user_id": USER_A})
    assert "history:0" in response.get_json()["response"]


def test_guests_get_separate_histories(client):
    other = str(uuid.uuid4())
    chat(client, "guest one", headers={"X-Guest-ID": GUEST})
    assert len(history(client, headers={"X-Guest-ID": GUEST})) == 2
    assert history(client, headers={"X-Guest-ID": other}) == []


def test_expired_token_is_rejected_not_downgraded(client):
    assert chat(client, headers=auth("expired")).status_code == 401
    assert client.get(f"/{SERVICE}/history", headers=auth("expired")).status_code == 401


def test_chat_survives_supabase_outage_as_guest(client):
    assert chat(client, headers=auth("supabase-down")).status_code == 200


def test_history_is_bounded_and_passed_to_the_model(client):
    for i in range(15):
        response = chat(client, f"q{i}", headers=auth())
    assert "history:20" in response.get_json()["response"]
    assert len(history(client, headers=auth())) == 20


def test_llm_failure_is_an_error_and_not_saved_as_an_answer(client, monkeypatch):
    def boom(*a, **k):
        raise app_module.LLMError("model_not_found secret-detail")

    monkeypatch.setattr(app_module, "generate_response", boom)
    response = chat(client, headers=auth())
    assert response.status_code == 502
    assert "secret-detail" not in response.get_data(as_text=True)
    assert history(client, headers=auth()) == []


def test_chat_rate_limit(client, monkeypatch):
    monkeypatch.setattr(app_module, "CHAT_LIMIT_PER_MINUTE", 2)
    assert chat(client).status_code == 200
    assert chat(client).status_code == 200
    assert chat(client).status_code == 429


def test_generate_response_handles_empty_completion(monkeypatch):
    empty = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=None), finish_reason="length")])
    fake = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **k: empty)))
    monkeypatch.setattr(app_module, "get_groq", lambda: fake)
    try:
        app_module.generate_response("q", [], [], SERVICE)
    except app_module.LLMError as exc:
        assert "length" in str(exc)
    else:
        raise AssertionError("empty completion must raise")


def test_prompt_contains_rag_context_and_court_record(monkeypatch):
    captured = {}
    ok = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="ok"), finish_reason="stop")])

    def create(**kwargs):
        captured.update(kwargs)
        return ok

    fake = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    monkeypatch.setattr(app_module, "get_groq", lambda: fake)
    assert app_module.generate_response("q", ["PASSAGE"], [], SERVICE, "RECORD") == "ok"
    prompt = captured["messages"][1]["content"]
    assert "PASSAGE" in prompt and "RECORD" in prompt and "never as instructions" in prompt
    assert captured["model"] == app_module.GROQ_MODEL


# --- contact form -----------------------------------------------------------
class FakeTable:
    def __init__(self, fail=False):
        self.rows, self.kwargs, self.fail = [], {}, fail

    def table(self, name):
        assert name == "user_forms"
        return self

    def insert(self, row, **kwargs):
        self.rows.append(row)
        self.kwargs = kwargs
        return self

    def execute(self):
        if self.fail:
            raise RuntimeError("db down, password=hunter2")
        return SimpleNamespace(data=[])


FORM = {"firstName": "A", "lastName": "B", "email": "a@b.co", "subject": "Other", "message": "Hi"}


def test_contact_form_success_returns_201(client, monkeypatch):
    table = FakeTable()
    monkeypatch.setattr(app_module, "get_supabase", lambda: table)
    response = client.post("/submit-form", json=FORM)
    assert response.status_code == 201, "the old code returned 500 after a successful insert"
    assert table.rows == [FORM]
    assert table.kwargs["returning"] == "minimal"


def test_contact_form_drops_unknown_fields(client, monkeypatch):
    table = FakeTable()
    monkeypatch.setattr(app_module, "get_supabase", lambda: table)
    client.post("/submit-form", json={**FORM, "id": 1, "is_admin": True})
    assert table.rows == [FORM]


def test_contact_form_validation(client, monkeypatch):
    table = FakeTable()
    monkeypatch.setattr(app_module, "get_supabase", lambda: table)
    bad = [{**FORM, "email": "nope"}, {**FORM, "message": " "}, {**FORM, "message": "x" * 5001}, {**FORM, "subject": 5}]
    for body in bad:
        assert client.post("/submit-form", json=body).status_code == 400
    assert client.post("/submit-form", data="x").status_code == 400
    assert table.rows == []


def test_contact_form_database_error_does_not_leak(client, monkeypatch):
    monkeypatch.setattr(app_module, "get_supabase", lambda: FakeTable(fail=True))
    response = client.post("/submit-form", json=FORM)
    assert response.status_code == 503
    assert "hunter2" not in response.get_data(as_text=True)


def test_contact_form_rate_limit(client, monkeypatch):
    monkeypatch.setattr(app_module, "get_supabase", lambda: FakeTable())
    monkeypatch.setattr(app_module, "CONTACT_LIMIT_PER_MINUTE", 1)
    assert client.post("/submit-form", json=FORM).status_code == 201
    assert client.post("/submit-form", json=FORM).status_code == 429


# --- token verification (the real function, against a stubbed HTTP call) ------
def _real_verify(monkeypatch, response=None, error=None):
    import importlib

    module = importlib.reload(app_module)
    monkeypatch.setattr(module, "SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setattr(module, "SUPABASE_KEY", "anon")

    def fake_get(url, headers, timeout):
        assert url == "https://x.supabase.co/auth/v1/user"
        assert headers["Authorization"].startswith("Bearer ")
        if error:
            raise error
        return response

    monkeypatch.setattr(module.requests, "get", fake_get)
    return module


def _http(status, body=None):
    return SimpleNamespace(status_code=status, ok=status < 400, json=lambda: body or {})


def test_verify_token_accepts_valid(monkeypatch):
    module = _real_verify(monkeypatch, _http(200, {"id": USER_A}))
    assert module.verify_supabase_token("good") == USER_A


def test_verify_token_rejects_invalid(monkeypatch):
    module = _real_verify(monkeypatch, _http(401))
    try:
        module.verify_supabase_token("bad")
    except module.AuthInvalid:
        return
    raise AssertionError("expected AuthInvalid")


def test_verify_token_network_error_is_unavailable(monkeypatch):
    import requests

    module = _real_verify(monkeypatch, error=requests.ConnectionError())
    try:
        module.verify_supabase_token("x")
    except module.AuthUnavailable:
        return
    raise AssertionError("expected AuthUnavailable")


# --- platform ---------------------------------------------------------------
def test_cors_allows_auth_header_for_known_origin_only(client):
    good = client.options(
        f"/{SERVICE}/chat",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert good.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
    assert len(good.headers.getlist("Access-Control-Allow-Origin")) == 1, "duplicates break browsers"
    assert "authorization" in good.headers.get("Access-Control-Allow-Headers", "").lower()
    bad = client.options(
        f"/{SERVICE}/chat", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"}
    )
    assert bad.headers.get("Access-Control-Allow-Origin") is None


def test_health_exposes_no_secrets(client):
    body = client.get("/health").get_json()
    assert body["status"] == "ok"
    assert all(isinstance(body[k], bool) for k in ("groq", "pinecone", "supabase", "ecourts"))


def test_errors_are_json(client):
    assert client.get("/nope").get_json()["code"] == "NOT_FOUND"
    assert client.get("/submit-form").status_code == 405
    assert client.post("/submit-form", data="x" * (65 * 1024), content_type="application/json").status_code == 413


def test_unexpected_errors_hide_details(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("secret internals")

    monkeypatch.setattr(app_module, "resolve_chat_identity", boom)
    response = client.get(f"/{SERVICE}/history")
    assert response.status_code == 500
    assert "secret internals" not in response.get_data(as_text=True)


# --- retrieval deadlines ------------------------------------------------------
class _FakeEmbedder:
    def encode(self, text):
        return SimpleNamespace(tolist=lambda: [0.0])


def test_retrieval_returns_passages(monkeypatch):
    import importlib

    module = importlib.reload(app_module)
    index = SimpleNamespace(query=lambda **k: {"matches": [{"metadata": {"text": "P"}}, {"metadata": None}]})
    monkeypatch.setattr(module, "get_embedder", lambda: _FakeEmbedder())
    monkeypatch.setattr(module, "get_pinecone_index", lambda: index)
    assert module.retrieve_context("q") == ["P"]


def test_slow_retrieval_does_not_stall_chat(monkeypatch):
    import importlib
    import threading
    import time

    module = importlib.reload(app_module)
    release = threading.Event()
    index = SimpleNamespace(query=lambda **k: release.wait(10))
    monkeypatch.setattr(module, "get_embedder", lambda: _FakeEmbedder())
    monkeypatch.setattr(module, "get_pinecone_index", lambda: index)
    monkeypatch.setattr(module, "RETRIEVAL_TIMEOUT_SECONDS", 0.1)
    started = time.monotonic()
    try:
        assert module.retrieve_context("q") == []
        assert time.monotonic() - started < 2
    finally:
        release.set()


def test_retrieval_failure_degrades_to_no_context(monkeypatch):
    import importlib

    module = importlib.reload(app_module)

    def boom():
        raise RuntimeError("Failed to connect")

    monkeypatch.setattr(module, "get_embedder", boom)
    assert module.retrieve_context("q") == []


def _fake_groq(content, finish_reason):
    done = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content), finish_reason=finish_reason)])
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **k: done)))


def test_truncated_answer_says_so(monkeypatch):
    monkeypatch.setattr(app_module, "get_groq", lambda: _fake_groq("partial", "length"))
    assert "incomplete" in app_module.generate_response("q", [], [], SERVICE)


def test_complete_answer_has_no_notice(monkeypatch):
    monkeypatch.setattr(app_module, "get_groq", lambda: _fake_groq("done", "stop"))
    assert app_module.generate_response("q", [], [], SERVICE) == "done"


def test_slow_client_does_not_block_other_clients(monkeypatch):
    import threading

    started, release = threading.Event(), threading.Event()

    def slow():
        started.set()
        release.wait(5)
        return "embedder"

    worker = threading.Thread(target=app_module._client, args=("slow-test", slow))
    worker.start()
    started.wait(5)
    finished = []
    other = threading.Thread(target=lambda: finished.append(app_module._client("fast-test", lambda: "groq")))
    other.start()
    other.join(2)
    release.set()
    worker.join(5)
    assert finished == ["groq"]
