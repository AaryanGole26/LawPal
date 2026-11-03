"""Judgment lookups for the chatbot, using the eCourtsIndia partner API.

https://ecourtsindia.com/api/docs and https://ecourtsindia.com/api/pricing

The API bills per request, so every call goes through a persistent cache and a
daily spending guard. Only search and case detail are used. Case detail usually
has no order text (live responses return an empty `files` list, despite the
docs), so answers rest on the record's outcome and dates; the endpoints that
return text cost Rs 5.25 to Rs 7.50 per order and are deliberately not called.
"""
import json
import logging
import os
import re
import sqlite3
import threading
import time
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://webapi.ecourtsindia.com"
DEFAULT_STORE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".ecourts_cache.sqlite3")
CNR_RE = re.compile(r"^[A-Z]{4}\d{12}$")
CNR_IN_TEXT_RE = re.compile(r"\b[A-Za-z]{4}\d{12}\b")

# Pay-as-you-go prices from the pricing page, in rupees before GST.
SEARCH_COST = 0.60
CASE_COST = 1.50

DAY_SECONDS = 24 * 60 * 60
SEARCH_TTL_SECONDS = 7 * DAY_SECONDS
OPEN_CASE_TTL_SECONDS = DAY_SECONDS  # A pending case can change at any hearing.
DECIDED_CASE_TTL_SECONDS = 90 * DAY_SECONDS

SEARCH_PAGE_SIZE = 5
MAX_RETRIES = 2
MAX_RETRY_WAIT_SECONDS = 5

# Enough for a judgment's opening and its operative order at the end, without
# exhausting the LLM's token budget.
MAX_JUDGMENT_HEAD_CHARS = 2500
MAX_JUDGMENT_TAIL_CHARS = 6500

DECIDED_STATUSES = {"DISPOSED", "DISMISSED", "DECIDED", "ALLOWED"}


class ECourtsError(Exception):
    """An eCourts failure. `message` is safe to show to end users."""

    def __init__(self, status, code, message, retry_after=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.retry_after = retry_after


class BudgetExceeded(Exception):
    """A billed call was refused because a daily spending cap has been reached."""


def normalize_cnr(value):
    """Return the canonical CNR, or None if `value` is not a valid CNR."""
    if not isinstance(value, str):
        return None
    cleaned = re.sub(r"[\s-]", "", value).upper()
    return cleaned if CNR_RE.match(cleaned) else None


def find_cnrs(text, limit=1):
    """Return up to `limit` distinct CNRs mentioned in free text."""
    found = []
    for match in CNR_IN_TEXT_RE.findall(text or ""):
        cnr = normalize_cnr(match)
        if cnr and cnr not in found:
            found.append(cnr)
    return found[:limit]


def case_url(cnr):
    return f"https://ecourtsindia.com/cnr/{cnr}"


class Store:
    """SQLite cache and spend ledger, so neither is lost on restart."""

    def __init__(self, path):
        self.path = path
        self._lock = threading.Lock()
        with self._connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, expires REAL, value TEXT)")
            db.execute("CREATE TABLE IF NOT EXISTS spend (day TEXT, who TEXT, rupees REAL, PRIMARY KEY (day, who))")

    def _connect(self):
        return sqlite3.connect(self.path, timeout=10)

    def cache_get(self, key):
        with self._lock, self._connect() as db:
            row = db.execute("SELECT expires, value FROM cache WHERE key = ?", (key,)).fetchone()
        if not row or row[0] < time.time():
            return None
        return json.loads(row[1])

    def cache_set(self, key, value, ttl):
        with self._lock, self._connect() as db:
            db.execute(
                "INSERT OR REPLACE INTO cache (key, expires, value) VALUES (?, ?, ?)",
                (key, time.time() + ttl, json.dumps(value)),
            )

    @staticmethod
    def _today():
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def reserve(self, who, cost, user_limit, global_limit):
        """Record `cost` against today's caps, or raise BudgetExceeded."""
        day = self._today()
        with self._lock, self._connect() as db:
            spent = dict(db.execute("SELECT who, rupees FROM spend WHERE day = ?", (day,)).fetchall())
            if spent.get(who, 0) + cost > user_limit or spent.get("*", 0) + cost > global_limit:
                raise BudgetExceeded()
            for key in (who, "*"):
                db.execute(
                    "INSERT INTO spend (day, who, rupees) VALUES (?, ?, ?) "
                    "ON CONFLICT (day, who) DO UPDATE SET rupees = rupees + excluded.rupees",
                    (day, key, cost),
                )

    def refund(self, who, cost):
        """Failed requests and empty results are not billed by eCourts."""
        day = self._today()
        with self._lock, self._connect() as db:
            for key in (who, "*"):
                db.execute("UPDATE spend SET rupees = MAX(0, rupees - ?) WHERE day = ? AND who = ?", (cost, day, key))

    def spent_today(self, who="*"):
        with self._lock, self._connect() as db:
            row = db.execute("SELECT rupees FROM spend WHERE day = ? AND who = ?", (self._today(), who)).fetchone()
        return row[0] if row else 0


class ECourtsClient:
    def __init__(self, api_key=None, base_url=None, store_path=None, user_daily_limit=10.0, global_daily_limit=50.0, timeout=20, sleep=time.sleep):
        self.api_key = (api_key or "").strip()
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.user_daily_limit = user_daily_limit
        self.global_daily_limit = global_daily_limit
        self.timeout = timeout
        self._sleep = sleep
        self._store_path = store_path
        self._store = None
        self._store_lock = threading.Lock()

    @classmethod
    def from_env(cls):
        return cls(
            api_key=os.getenv("ECOURTS_API_KEY"),
            base_url=os.getenv("ECOURTS_API_BASE_URL"),
            store_path=os.getenv("ECOURTS_STORE_PATH"),
            user_daily_limit=float(os.getenv("ECOURTS_USER_DAILY_BUDGET_INR", "10")),
            global_daily_limit=float(os.getenv("ECOURTS_DAILY_BUDGET_INR", "50")),
        )

    @property
    def configured(self):
        return bool(self.api_key)

    @property
    def store(self):
        with self._store_lock:
            if self._store is None:
                self._store = Store(self._store_path or DEFAULT_STORE_PATH)
            return self._store

    def get_case(self, cnr, who):
        canonical = normalize_cnr(cnr)
        if not canonical:
            raise ECourtsError(400, "INVALID_CNR", "That is not a valid CNR.")
        key = f"case:{canonical}"
        cached = self.store.cache_get(key)
        if cached is not None:
            return cached

        data = self._billed_get(f"/api/partner/case/{canonical}", None, CASE_COST, who)
        case = normalize_case(data)
        decided = bool(case.get("decisionDate")) or case.get("status") in DECIDED_STATUSES
        self.store.cache_set(key, case, DECIDED_CASE_TTL_SECONDS if decided else OPEN_CASE_TTL_SECONDS)
        return case

    def search_cases(self, params, who):
        key = "search:" + json.dumps({**params, "pageSize": SEARCH_PAGE_SIZE}, sort_keys=True)
        cached = self.store.cache_get(key)
        if cached is not None:
            return cached

        data = self._billed_get("/api/partner/v2/search", {**params, "pageSize": SEARCH_PAGE_SIZE}, SEARCH_COST, who)
        results = normalize_search(data)
        if not results:
            self.store.refund(who, SEARCH_COST)  # Empty results are free.
        self.store.cache_set(key, results, SEARCH_TTL_SECONDS)
        return results

    def _billed_get(self, path, params, cost, who):
        if not self.configured:
            raise ECourtsError(503, "ECOURTS_NOT_CONFIGURED", "Court lookups are not set up.")
        self.store.reserve(who, cost, self.user_daily_limit, self.global_daily_limit)
        try:
            return self._request(path, params)
        except ECourtsError:
            self.store.refund(who, cost)
            raise

    def _request(self, path, params):
        url = f"{self.base_url}{path}"
        headers = {"Authorization": f"Bearer {self.api_key}", "Accept": "application/json"}

        for attempt in range(MAX_RETRIES + 1):
            is_last = attempt == MAX_RETRIES
            try:
                response = requests.get(url, params=params, headers=headers, timeout=self.timeout)
            except requests.Timeout:
                # Not retried: the upstream may have processed, and billed, the call.
                raise ECourtsError(504, "ECOURTS_TIMEOUT", "eCourts took too long to respond.")
            except requests.RequestException as exc:
                logger.warning("eCourts connection failed: %s", type(exc).__name__)
                if not is_last:
                    self._sleep(2 ** attempt)
                    continue
                raise ECourtsError(502, "ECOURTS_UNAVAILABLE", "Could not reach eCourts.")

            if response.ok:
                return _parse_success(response)

            retry_after = _parse_retry_after(response)
            transient = response.status_code == 429 or response.status_code >= 500
            wait = retry_after if retry_after is not None else 2 ** attempt
            if transient and not is_last and wait <= MAX_RETRY_WAIT_SECONDS:
                self._sleep(wait)
                continue
            raise _map_error(response, retry_after)

        raise ECourtsError(502, "ECOURTS_UNAVAILABLE", "Could not reach eCourts.")


def _parse_success(response):
    try:
        payload = response.json()
    except ValueError:
        raise ECourtsError(502, "ECOURTS_BAD_RESPONSE", "eCourts returned an unreadable response.")
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        raise ECourtsError(502, "ECOURTS_BAD_RESPONSE", "eCourts returned an unreadable response.")
    return data


def _parse_retry_after(response):
    try:
        return max(0, int(float(response.headers.get("Retry-After", ""))))
    except ValueError:
        return None


def _map_error(response, retry_after):
    """Keep credential and billing problems in the server log, not in front of users."""
    code = message = request_id = None
    try:
        payload = response.json()
        error = payload.get("error") or {}
        code, message = error.get("code"), error.get("message")
        request_id = (payload.get("meta") or {}).get("request_id")
    except (ValueError, AttributeError):
        pass

    status = response.status_code
    logger.warning("eCourts error status=%s code=%s message=%s request_id=%s", status, code, message, request_id)

    if status in (401, 403):
        logger.error("eCourts rejected the API key (%s). Check ECOURTS_API_KEY.", code)
        return ECourtsError(503, "ECOURTS_AUTH_FAILED", "Court lookups are temporarily unavailable.")
    if status == 402:
        logger.error("eCourts credits are exhausted (%s).", code)
        return ECourtsError(503, "ECOURTS_CREDITS_EXHAUSTED", "Court lookups are temporarily unavailable.")
    if status == 404:
        return ECourtsError(404, "CASE_NOT_FOUND", "No case was found.")
    if status == 429:
        return ECourtsError(429, "ECOURTS_RATE_LIMITED", "eCourts is busy.", retry_after)
    if status == 400:
        return ECourtsError(400, code or "ECOURTS_BAD_REQUEST", "eCourts rejected the lookup.")
    return ECourtsError(502, "ECOURTS_UNAVAILABLE", "eCourts is having problems.")


# ---------------------------------------------------------------------------
# Payload normalisation. Upstream fields are often null or absent, and some vary
# in type (actsAndSections is documented as both a string and an array).
# ---------------------------------------------------------------------------


def _strings(value):
    if value is None:
        return []
    if not isinstance(value, list):
        value = [value]
    return [str(item).strip() for item in value if item not in (None, "") and str(item).strip()]


def _text(value):
    if isinstance(value, list):
        return ", ".join(_strings(value))
    return str(value).strip() if value not in (None, "") else ""


def _dicts(value):
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def _clean(value):
    """Upstream uses the string N/A for missing values."""
    return None if value in (None, "", "N/A", "NA") else value


def _court_label(court_name, court_code):
    name = _clean(court_name)
    if name:
        return name
    code = _clean(court_code)
    if not code:
        return None
    return "Supreme Court of India" if str(code).startswith("SCIN") else str(code)


def _case_title(petitioners, respondents):
    first = petitioners[0] if petitioners else "Unknown"
    second = respondents[0] if respondents else "Unknown"
    return f"{first} vs {second}"


def normalize_search(data):
    results = []
    for item in _dicts(data.get("results")):
        if not item.get("cnr"):
            continue
        petitioners = _strings(item.get("petitioners"))
        respondents = _strings(item.get("respondents"))
        results.append(
            {
                "cnr": item.get("cnr"),
                "title": _case_title(petitioners, respondents),
                "petitioners": petitioners,
                "respondents": respondents,
                "status": item.get("caseStatus"),
                "caseType": item.get("caseType"),
                "decisionDate": _clean(item.get("decisionDate")),
                "nextHearingDate": _clean(item.get("nextHearingDate")),
                "court": _court_label(item.get("courtName"), item.get("courtCode")),
                "judges": _strings(item.get("judges")),
                "judgmentCount": item.get("judgmentCount"),
                "hasJudgments": item.get("hasJudgments"),
            }
        )
    return results


_NAME_NOISE = {"the", "and", "of", "through", "vs", "versus", "v", "mr", "mrs", "ms", "shri", "smt", "dr", "ors", "others", "another", "anr"}


def _name_tokens(name):
    return {t for t in re.findall(r"[a-z0-9]+", str(name).lower()) if t not in _NAME_NOISE and len(t) > 1}


def matches_parties(result, petitioner=None, respondent=None):
    """True only if every word of each named party appears on that side of the case.

    Common names match many unrelated people, and paying for and presenting the
    wrong person's case is the failure this guards against.
    """

    def on_side(name, side):
        wanted = _name_tokens(name)
        return bool(wanted) and any(wanted <= _name_tokens(party) for party in side)

    if petitioner and not on_side(petitioner, result.get("petitioners") or []):
        return False
    if respondent and not on_side(respondent, result.get("respondents") or []):
        return False
    return bool(petitioner or respondent)


def pick_best_result(results):
    """Prefer a case with a judgment, keeping the API's ranking otherwise."""
    for result in results:
        if result.get("decisionDate") or result.get("hasJudgments") or result.get("judgmentCount"):
            return result
    return results[0] if results else None


def normalize_case(data):
    case = data.get("courtCaseData") if isinstance(data.get("courtCaseData"), dict) else {}
    entity = data.get("entityInfo") if isinstance(data.get("entityInfo"), dict) else {}
    petitioners = _strings(case.get("petitioners"))
    respondents = _strings(case.get("respondents"))
    decision_date = _clean(case.get("decisionDate"))
    next_hearing = _clean(case.get("nextHearingDate")) or _clean(entity.get("nextDateOfHearing"))
    next_hearing = str(next_hearing)[:10] if next_hearing else None
    if next_hearing and decision_date and next_hearing <= decision_date:
        next_hearing = None  # Upstream repeats the last listing date on decided cases.
    return {
        "cnr": case.get("cnr") or entity.get("cnr"),
        "title": _case_title(petitioners, respondents),
        "caseType": case.get("caseType") or case.get("caseTypeRaw"),
        "status": case.get("caseStatus"),
        "purpose": case.get("purpose"),
        "disposalType": case.get("disposalType") or case.get("disposalTypeRaw"),
        "filingDate": case.get("filingDate"),
        "lastHearingDate": case.get("lastHearingDate") or entity.get("lastDateOfHearing"),
        "nextHearingDate": next_hearing,
        "decisionDate": decision_date,
        "courtName": _court_label(case.get("courtName"), case.get("cnrCourtCode") or case.get("courtCode") or case.get("courtComplexCode")),
        "district": _clean(case.get("district")),
        "state": _clean(case.get("state")),
        "judges": _strings(case.get("judges")),
        "petitioners": petitioners,
        "respondents": respondents,
        "actsAndSections": _text(case.get("actsAndSections")),
        "orders": _normalize_orders(case, data.get("files")),
    }


def _normalize_orders(case, files):
    """List orders newest first, judgments before others on the same date.

    `judgmentOrders` mostly holds routine records of proceedings, so an order
    only counts as a judgment if its type says so. `pdfFile` is CNR-prefixed while
    `orderUrl` is a bare filename, so they are matched on the filename suffix.
    """
    texts = {}
    file_items = files.get("files") if isinstance(files, dict) else None
    for item in _dicts(file_items):
        if item.get("pdfFile") and item.get("markdownContent"):
            texts[str(item["pdfFile"])] = str(item["markdownContent"])

    def text_for(filename):
        if filename:
            for pdf_file, content in texts.items():
                if pdf_file.endswith(str(filename)):
                    return content
        return None

    orders = []
    for items, label_field in ((case.get("judgmentOrders"), "orderType"), (case.get("interimOrders"), "description")):
        for item in _dicts(items):
            label = _text(item.get(label_field))
            orders.append(
                {
                    "kind": "judgment" if "judg" in label.lower() else "order",
                    "date": item.get("orderDate"),
                    "label": label,
                    "text": text_for(item.get("orderUrl")),
                }
            )
    orders.sort(key=lambda order: (order["date"] or "", order["kind"] == "judgment"), reverse=True)
    return orders


def _excerpt(text):
    if len(text) <= MAX_JUDGMENT_HEAD_CHARS + MAX_JUDGMENT_TAIL_CHARS:
        return text
    # The operative order is normally at the end, so the tail matters most.
    return f"{text[:MAX_JUDGMENT_HEAD_CHARS]}\n\n[... middle of the order omitted ...]\n\n{text[-MAX_JUDGMENT_TAIL_CHARS:]}"


def case_to_prompt_context(case):
    """Summarise a normalised case, with its latest judgment text, for the LLM."""
    lines = [
        f"CNR: {case.get('cnr')}",
        f"Parties: {case.get('title')}",
        f"Case type: {case.get('caseType')}",
        f"Status: {case.get('status')}",
        f"Court: {', '.join(str(v) for v in (case.get('courtName'), case.get('district'), case.get('state')) if v)}",
        f"Judges: {', '.join(case.get('judges') or []) or 'not listed'}",
        f"Filed: {case.get('filingDate')}",
        f"Decision date: {case.get('decisionDate') or 'none'}",
        f"Disposal: {case.get('disposalType') or 'none'}",
        f"Next hearing: {case.get('nextHearingDate') or 'none listed'}",
        f"Acts and sections: {case.get('actsAndSections') or 'not listed'}",
    ]
    orders = case.get("orders") or []
    judgments = [o for o in orders if o["kind"] == "judgment"]
    others = [o for o in orders if o["kind"] != "judgment"]
    for order in judgments[:3] + others[:3]:
        lines.append(f"{order['kind'].title()} dated {order['date']}: {order['label']}")
    if len(orders) > 6:
        lines.append(f"({len(orders) - min(len(judgments), 3) - min(len(others), 3)} further orders are not listed here.)")

    with_text = next((o for o in judgments if o.get("text")), None) or next((o for o in orders if o.get("text")), None)
    if with_text:
        lines.append(f"\nText of the {with_text['kind']} dated {with_text['date']}:\n{_excerpt(with_text['text'])}")
    else:
        lines.append(
            "\nThe text of the orders is not available in this record. State the outcome and dates above, say the reasoning "
            "could not be read, and do not describe what the court reasoned or held beyond that."
        )
    return "\n".join(lines)
