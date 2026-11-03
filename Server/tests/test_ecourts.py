from types import SimpleNamespace

import pytest

import app as app_module
from conftest import auth
from ecourts import (
    MAX_JUDGMENT_HEAD_CHARS,
    MAX_JUDGMENT_TAIL_CHARS,
    BudgetExceeded,
    ECourtsClient,
    ECourtsError,
    case_to_prompt_context,
    find_cnrs,
    normalize_case,
    normalize_cnr,
    normalize_search,
    matches_parties,
    pick_best_result,
)
from fake_ecourts import KNOWN_CNR, NO_MATCH_TERM, PENDING_CNR, VALID_KEY

SERVICE = "consultation"
WHO = "user:a"


def chat(client, query, headers=None):
    return client.post(f"/{SERVICE}/chat", json={"query": query}, headers=headers or {})


def plan_returning(monkeypatch, plan):
    calls = []

    def fake(query, history):
        calls.append(query)
        return plan

    monkeypatch.setattr(app_module, "plan_court_lookup", fake)
    return calls


# --- identifiers ------------------------------------------------------------
def test_cnr_validation():
    assert normalize_cnr("dlnd02-0047882015") == KNOWN_CNR
    assert normalize_cnr(" DLND 0200 4788 2015 ") == KNOWN_CNR
    for bad in ["", None, 123, "DLND02", "1234567890123456", "DLND020047882015X"]:
        assert normalize_cnr(bad) is None


def test_find_cnrs_takes_only_one_by_default():
    assert find_cnrs(f"see {KNOWN_CNR.lower()} and {PENDING_CNR}") == [KNOWN_CNR]
    assert find_cnrs("no case here") == []


# --- when lookups happen: the cost controls ------------------------------------
def test_general_question_never_calls_ecourts(client, ecourts_ready, upstream, monkeypatch):
    calls = plan_returning(monkeypatch, None)
    body = chat(client, "How do I file a consumer complaint?", auth()).get_json()
    assert calls, "the router is consulted"
    assert upstream.requests == []
    assert body["cases"] == [] and body["notice"] is None


def test_guest_never_spends_or_runs_router(client, ecourts_ready, upstream, monkeypatch):
    calls = plan_returning(monkeypatch, {"lookup": True, "keywords": "x"})
    body = chat(client, "What was the judgment in Asha Traders vs Ravi Kumar?").get_json()
    assert calls == [] and upstream.requests == []
    assert body["cases"] == []


def test_guest_with_cnr_is_told_to_log_in(client, ecourts_ready, upstream):
    body = chat(client, f"Status of {KNOWN_CNR}?").get_json()
    assert upstream.requests == []
    assert "Log in" in body["notice"]


def test_cnr_skips_search_and_router(client, ecourts_ready, upstream, monkeypatch):
    calls = plan_returning(monkeypatch, {"lookup": True, "keywords": "x"})
    body = chat(client, f"What happened in {KNOWN_CNR.lower()}?", auth()).get_json()
    assert calls == []
    assert [r["path"] for r in upstream.requests] == [f"/api/partner/case/{KNOWN_CNR}"]
    assert "convicted under section 138" in body["response"]
    assert body["cases"][0]["url"] == f"https://ecourtsindia.com/cnr/{KNOWN_CNR}"


def test_named_case_uses_one_search_and_one_detail_only(client, ecourts_ready, upstream, monkeypatch):
    plan_returning(monkeypatch, {"lookup": True, "petitioner": "Asha Traders", "respondent": "Ravi Kumar"})
    body = chat(client, "What was the judgment in Asha Traders vs Ravi Kumar?", auth()).get_json()
    paths = [r["path"] for r in upstream.requests]
    assert paths == ["/api/partner/v2/search", f"/api/partner/case/{KNOWN_CNR}"], "the costlier AI endpoints are never used"
    assert upstream.requests[0]["query"]["petitioners"] == ["Asha Traders"]
    assert upstream.requests[0]["query"]["respondents"] == ["Ravi Kumar"]
    assert body["cases"][0]["cnr"] == KNOWN_CNR


def test_namesake_is_never_paid_for_or_presented(client, ecourts_ready, upstream, monkeypatch):
    # Live search for one party returned five unrelated people sharing the name.
    plan_returning(monkeypatch, {"lookup": True, "petitioner": "Asha Traders", "respondent": "Someone Else"})
    body = chat(client, "Judgment in Asha Traders vs Someone Else?", auth()).get_json()
    assert [r["path"] for r in upstream.requests] == ["/api/partner/v2/search"], "no case detail bought"
    assert body["cases"] == []
    assert "No matching case" in body["notice"]


def test_no_match_spends_nothing_further_and_forbids_guessing(client, ecourts_ready, upstream, monkeypatch):
    plan_returning(monkeypatch, {"lookup": True, "petitioner": NO_MATCH_TERM})
    body = chat(client, "Judgment in nosuchparty?", auth()).get_json()
    assert len(upstream.requests) == 1
    assert "do not guess" in body["response"]
    assert "No matching case" in body["notice"]
    assert ecourts_ready.store.spent_today() == 0, "empty results are not billed"


def test_repeat_question_is_free_after_restart(tmp_path, upstream):
    path = str(tmp_path / "store.sqlite3")
    first = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=path)
    first.get_case(KNOWN_CNR, WHO)
    second = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=path)
    assert second.get_case(KNOWN_CNR, WHO)["cnr"] == KNOWN_CNR
    assert len(upstream.requests) == 1


def test_cache_lifetime_depends_on_whether_case_is_decided(tmp_path, upstream, monkeypatch):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"))
    ttls = {}
    original = client.store.cache_set
    monkeypatch.setattr(client.store, "cache_set", lambda key, value, ttl: (ttls.update({key: ttl}), original(key, value, ttl)))
    client.get_case(KNOWN_CNR, WHO)
    client.get_case(PENDING_CNR, WHO)
    assert ttls[f"case:{KNOWN_CNR}"] > ttls[f"case:{PENDING_CNR}"]


# --- spending caps ----------------------------------------------------------
def test_user_daily_cap_blocks_billed_calls(tmp_path, upstream):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"), user_daily_limit=1.0)
    with pytest.raises(BudgetExceeded):
        client.get_case(KNOWN_CNR, WHO)
    assert upstream.requests == []


def test_global_cap_applies_across_users(tmp_path, upstream):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"), global_daily_limit=2.0)
    client.get_case(KNOWN_CNR, "user:a")
    with pytest.raises(BudgetExceeded):
        client.get_case(PENDING_CNR, "user:b")
    assert len(upstream.requests) == 1


def test_spend_survives_restart(tmp_path, upstream):
    path = str(tmp_path / "s.sqlite3")
    ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=path).get_case(KNOWN_CNR, WHO)
    assert ECourtsClient(api_key=VALID_KEY, store_path=path).store.spent_today() == 1.5


def test_cached_reads_do_not_count_against_caps(tmp_path, upstream):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"), user_daily_limit=1.5)
    for _ in range(3):
        client.get_case(KNOWN_CNR, WHO)
    assert client.store.spent_today() == 1.5


def test_failed_requests_are_refunded(tmp_path, upstream):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"))
    upstream.fail_with = [(404, "NOT_FOUND", None)]
    with pytest.raises(ECourtsError):
        client.get_case(KNOWN_CNR, WHO)
    assert client.store.spent_today() == 0


def test_cap_reached_chat_still_answers_and_says_so(client, ecourts_ready, upstream):
    ecourts_ready.user_daily_limit = 0
    response = chat(client, f"Status of {KNOWN_CNR}?", auth())
    assert response.status_code == 200
    assert "daily limit" in response.get_json()["notice"]
    assert "do not guess" in response.get_json()["response"]
    assert upstream.requests == []


# --- failures never break chat -----------------------------------------------
@pytest.mark.parametrize(
    "status,code",
    [(404, "NOT_FOUND"), (401, "INVALID_TOKEN"), (402, "INSUFFICIENT_CREDITS"), (500, "INTERNAL_ERROR"), (400, "INVALID_CNR")],
)
def test_upstream_failure_keeps_chat_working(client, ecourts_ready, upstream, status, code):
    upstream.fail_with = [(status, code, None)] * 3
    response = chat(client, f"Status of {KNOWN_CNR}?", auth())
    assert response.status_code == 200
    body = response.get_json()
    assert body["cases"] == []
    assert "could not be checked" in body["notice"]
    assert code not in body["notice"] and "credit" not in body["notice"].lower()


def test_not_configured_is_silent(client, monkeypatch, upstream, tmp_path):
    monkeypatch.setattr(app_module, "ecourts_client", ECourtsClient(api_key="", store_path=str(tmp_path / "s.sqlite3")))
    calls = plan_returning(monkeypatch, {"lookup": True, "keywords": "x"})
    body = chat(client, "Judgment in A vs B?", auth()).get_json()
    assert calls == [], "no router call when no lookup is possible"
    assert body["cases"] == [] and body["notice"] is None


def test_unwritable_cache_keeps_chat_working(client, upstream, monkeypatch, tmp_path):
    # Serverless and read-only hosts cannot create the SQLite file.
    bad = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "missing" / "dir" / "s.sqlite3"))
    monkeypatch.setattr(app_module, "ecourts_client", bad)
    response = chat(client, f"Status of {KNOWN_CNR}?", auth())
    assert response.status_code == 200
    assert "could not be checked" in response.get_json()["notice"]
    assert upstream.requests == [], "no billed call without a working spend ledger"


def test_transient_failure_retries_then_succeeds(tmp_path, upstream):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"), sleep=lambda _: None)
    upstream.fail_with = [(500, "INTERNAL_ERROR", None), (429, "RATE_LIMIT_MINUTE", {"Retry-After": "1"})]
    assert client.get_case(KNOWN_CNR, WHO)["cnr"] == KNOWN_CNR
    assert len(upstream.requests) == 3


def test_long_retry_after_is_not_slept_through(tmp_path, upstream):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"))
    upstream.fail_with = [(429, "TOO_MANY_CONVERSIONS", {"Retry-After": "180"})]
    with pytest.raises(ECourtsError) as err:
        client.get_case(KNOWN_CNR, WHO)
    assert err.value.status == 429 and err.value.retry_after == 180
    assert len(upstream.requests) == 1


def test_billed_routes_are_gone(client):
    for path in ["/ecourts/status", f"/ecourts/case/{KNOWN_CNR}", "/ecourts/search?query=x", "/ecourts/causelist?q=x"]:
        assert client.get(path, headers=auth()).status_code == 404


# --- the router fails closed ---------------------------------------------------
def _fake_router(content=None, error=None):
    def create(**kwargs):
        if error:
            raise error
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


@pytest.mark.parametrize(
    "content,error",
    [
        ('{"lookup": false, "keywords": "x"}', None),
        ('{"lookup": "true", "keywords": "x"}', None),
        ('{"lookup": true}', None),
        ('{"lookup": true, "keywords": "topic only"}', None),
        ('{"lookup": true, "petitioner": "   "}', None),
        ("not json", None),
        ("", None),
        (None, None),
        (None, RuntimeError("groq down")),
    ],
)
def test_router_spends_nothing_when_unsure(monkeypatch, content, error):
    monkeypatch.setattr(app_module, "get_groq", lambda: _fake_router(content, error))
    assert app_module.plan_court_lookup("q", []) is None


def test_router_accepts_json_wrapped_in_text(monkeypatch):
    content = 'Here you go: {"lookup": true, "petitioner": "Asha"}'
    monkeypatch.setattr(app_module, "get_groq", lambda: _fake_router(content))
    assert app_module.plan_court_lookup("q", [{"role": "user", "content": "hi"}])["petitioner"] == "Asha"


# --- payload handling ----------------------------------------------------------
def test_order_text_matches_exact_file_and_judgment_comes_first(upstream, tmp_path):
    client = ECourtsClient(api_key=VALID_KEY, base_url=upstream.url, store_path=str(tmp_path / "s.sqlite3"))
    case = client.get_case(KNOWN_CNR, WHO)
    assert [o["kind"] for o in case["orders"]] == ["judgment", "order"]
    assert case["orders"][0]["text"] == "The accused is convicted under section 138."
    assert case["orders"][1]["text"] == "Summons to issue."


def test_prompt_prefers_judgment_text_and_keeps_the_operative_end():
    head, tail = "H" * MAX_JUDGMENT_HEAD_CHARS, "T" * MAX_JUDGMENT_TAIL_CHARS
    text = head + "M" * 50000 + tail
    case = normalize_case(
        {
            "courtCaseData": {
                "cnr": KNOWN_CNR,
                "petitioners": ["A"],
                "respondents": ["B"],
                "interimOrders": [{"orderDate": "2025-09-01", "orderUrl": "order-2.pdf"}],
                "judgmentOrders": [{"orderDate": "2025-01-01", "orderType": "Judgement - of Main Case", "orderUrl": "order-1.pdf"}],
            },
            "files": {
                "files": [
                    {"pdfFile": "x-order-1.pdf", "markdownContent": text},
                    {"pdfFile": "x-order-2.pdf", "markdownContent": "later interim"},
                ]
            },
        }
    )
    prompt = case_to_prompt_context(case)
    assert "dated 2025-01-01" in prompt and "later interim" not in prompt
    assert prompt.endswith("T" * 100) and "M" * 100 not in prompt


def test_prompt_says_when_no_order_text_exists():
    assert "not available" in case_to_prompt_context(normalize_case({"courtCaseData": {"cnr": KNOWN_CNR}}))


def test_routine_orders_are_not_called_judgments():
    # Live data: 241 "judgmentOrders", nearly all records of proceedings.
    case = normalize_case(
        {
            "courtCaseData": {
                "judgmentOrders": [
                    {"orderDate": "2026-02-12", "orderType": "ROP - of Main Case", "orderUrl": "order-241.pdf"},
                    {"orderDate": "2025-01-09", "orderType": "Judgement - of Main Case", "orderUrl": "order-228.pdf"},
                ]
            }
        }
    )
    assert [(o["date"], o["kind"]) for o in case["orders"]] == [("2026-02-12", "order"), ("2025-01-09", "judgment")]
    prompt = case_to_prompt_context(case)
    assert prompt.index("Judgment dated 2025-01-09") < prompt.index("Order dated 2026-02-12")
    assert "could not be read" in prompt


def test_live_quirks_in_case_records():
    case = normalize_case(
        {"courtCaseData": {"courtName": "N/A", "state": "N/A", "cnrCourtCode": "SCIN01", "decisionDate": "2025-01-09", "nextHearingDate": "2025-01-09"}}
    )
    assert case["courtName"] == "Supreme Court of India"
    assert case["state"] is None
    assert case["nextHearingDate"] is None, "a decided case has no upcoming hearing"
    pending = normalize_case({"courtCaseData": {"courtCode": "DLND02", "nextHearingDate": "2026-12-01"}})
    assert pending["courtName"] == "DLND02" and pending["nextHearingDate"] == "2026-12-01"


def test_matches_parties():
    result = {"petitioners": ["Abhishek Kumar", "Ajit Kumar"], "respondents": ["Union of India through Secretary"]}
    assert matches_parties(result, "Abhishek Kumar", "Union of India")
    assert matches_parties(result, "abhishek kumar")
    assert not matches_parties(result, "Abhishek Sharma")
    assert not matches_parties(result, "Abhishek Kumar", "State of Bihar")
    assert not matches_parties({"petitioners": ["Abhishek"], "respondents": []}, "Abhishek Kumar")
    assert not matches_parties(result), "no party given means no match"


def test_pick_best_result():
    assert pick_best_result([]) is None
    pending, decided = {"cnr": "A"}, {"cnr": "B", "decisionDate": "2025-01-01"}
    assert pick_best_result([pending, decided]) == decided
    assert pick_best_result([pending]) == pending


def test_malformed_payloads_do_not_crash():
    assert normalize_case({})["title"] == "Unknown vs Unknown"
    weird = {"courtCaseData": {"petitioners": "solo", "judges": None, "interimOrders": [1, None]}, "files": "x"}
    assert normalize_case(weird)["petitioners"] == ["solo"]
    assert normalize_search({"results": None}) == []
    assert normalize_search({"results": [{"cnr": None}, {}]}) == []
