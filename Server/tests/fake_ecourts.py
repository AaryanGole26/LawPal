"""A real HTTP server imitating the eCourts partner API, using the documented
payload shapes and the live-observed error envelope."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

VALID_KEY = "eci_live_" + "t" * 32
KNOWN_CNR = "DLND020047882015"
PENDING_CNR = "MHAU010000012020"
NO_MATCH_TERM = "nosuchparty"

CASE_PAYLOAD = {
    "courtCaseData": {
        "cnr": KNOWN_CNR,
        "caseType": "CC",
        "caseStatus": "DISPOSED",
        "filingDate": "2024-02-21",
        "firstHearingDate": "2024-03-05",
        "nextHearingDate": None,
        "lastHearingDate": "2025-07-07",
        "decisionDate": "2025-07-07",
        "courtName": "Patiala House Court",
        "district": "New Delhi",
        "state": "DL",
        "disposalType": "Convicted",
        "petitioners": ["Asha Traders"],
        "respondents": ["Ravi Kumar", "Second Respondent"],
        "judges": ["Justice Example"],
        "actsAndSections": "Negotiable Instruments Act - 138",
        "interimOrders": [{"orderDate": "2024-10-27", "description": "Summons issued", "orderUrl": "order-1.pdf"}],
        "judgmentOrders": [{"orderDate": "2025-07-07", "orderType": "Final Judgment", "orderUrl": "order-10.pdf"}],
    },
    "entityInfo": {"cnr": KNOWN_CNR, "dateModified": "2025-08-01T00:00:00Z"},
    "files": {
        "files": [
            {"pdfFile": f"{KNOWN_CNR}-order-1.pdf", "markdownContent": "Summons to issue."},
            {"pdfFile": f"{KNOWN_CNR}-order-10.pdf", "markdownContent": "The accused is convicted under section 138."},
        ]
    },
}

PENDING_PAYLOAD = {
    "courtCaseData": {
        "cnr": PENDING_CNR,
        "caseStatus": "PENDING",
        "filingDate": "2025-01-01",
        "nextHearingDate": "2026-12-01",
        "courtName": "Aurangabad Court",
        "petitioners": ["Meera"],
        "respondents": ["State"],
    }
}

SEARCH_PAYLOAD = {
    "results": [
        {"cnr": PENDING_CNR, "caseStatus": "PENDING", "petitioners": ["Meera"], "respondents": ["State"], "courtCode": "MHAU01"},
        {
            "cnr": KNOWN_CNR,
            "caseStatus": "DISPOSED",
            "decisionDate": "2025-07-07",
            "petitioners": ["Asha Traders"],
            "respondents": ["Ravi Kumar"],
            "courtCode": "DLND02",
        },
    ],
    "totalHits": 2,
    "page": 1,
    "pageSize": 5,
    "hasNextPage": False,
    "facetMode": "counted",
}


class FakeECourts:
    """Records requests. `fail_with` queues (status, code, headers) failures."""

    def __init__(self):
        self.requests = []
        self.fail_with = []
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def _send(self, status, body, headers=None):
                raw = json.dumps(body).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                for key, value in (headers or {}).items():
                    self.send_header(key, value)
                self.end_headers()
                self.wfile.write(raw)

            def _error(self, status, code, headers=None):
                self._send(
                    status,
                    {"error": {"code": code, "message": f"upstream {code}", "details": None}, "meta": {"request_id": "r1"}},
                    headers,
                )

            def do_GET(self):
                parsed = urlparse(self.path)
                query = parse_qs(parsed.query)
                outer.requests.append({"path": parsed.path, "query": query, "auth": self.headers.get("Authorization")})
                if outer.fail_with:
                    status, code, headers = outer.fail_with.pop(0)
                    return self._error(status, code, headers)
                if self.headers.get("Authorization") != f"Bearer {VALID_KEY}":
                    return self._error(401, "INVALID_TOKEN")
                if parsed.path == f"/api/partner/case/{KNOWN_CNR}":
                    return self._send(200, {"data": CASE_PAYLOAD, "meta": {"request_id": "r2"}})
                if parsed.path == f"/api/partner/case/{PENDING_CNR}":
                    return self._send(200, {"data": PENDING_PAYLOAD, "meta": {"request_id": "r3"}})
                if parsed.path.startswith("/api/partner/case/"):
                    return self._error(404, "NOT_FOUND")
                if parsed.path == "/api/partner/v2/search":
                    if NO_MATCH_TERM in parsed.query:
                        return self._send(200, {"data": {"results": [], "totalHits": 0}, "meta": {"request_id": "r4"}})
                    return self._send(200, {"data": SEARCH_PAYLOAD, "meta": {"request_id": "r5"}})
                return self._error(404, "NOT_FOUND")

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()
