"""Checks the eCourts integration against the live API using ECOURTS_API_KEY.

Run from the Server folder:

    python ecourts_smoke_test.py [CNR]

This spends real credits, up to Rs 2.10 (one search and one case detail), unless
the results are already cached. Pass a CNR to skip the search.
"""
import sys

import dotenv

from ecourts import ECourtsClient, ECourtsError, normalize_cnr, pick_best_result

WHO = "smoke-test"


def main():
    dotenv.load_dotenv()
    client = ECourtsClient.from_env()
    if not client.configured:
        print("ECOURTS_API_KEY is not set. Create a key at https://ecourtsindia.com/dashboard/api/keys")
        return 2

    try:
        cnr = normalize_cnr(sys.argv[1]) if len(sys.argv) > 1 else None
        if not cnr:
            results = client.search_cases({"query": "cheque bounce"}, WHO)
            print(f"Search OK: {len(results)} results")
            for result in results:
                print(f"  {result['cnr']} | {result['title']} | {result['status']} | decided {result['decisionDate']}")
            best = pick_best_result(results)
            if not best:
                print("No results to look up.")
                return 1
            cnr = best["cnr"]
        case = client.get_case(cnr, WHO)
    except ECourtsError as exc:
        print(f"FAILED: {exc.code}: {exc.message}")
        return 1

    with_text = [order for order in case["orders"] if order["text"]]
    print(f"Case OK: {case['cnr']} | {case['title']}")
    print(f"  Court: {case['courtName']}, {case['district']}, {case['state']}")
    print(f"  Status: {case['status']} | decided: {case['decisionDate']}")
    print(f"  Orders: {len(case['orders'])}, with text: {len(with_text)}")
    print(f"Spent today (estimate): Rs {client.store.spent_today():.2f}")

    empty = [field for field in ("cnr", "status", "courtName", "filingDate") if not case.get(field)]
    if empty:
        print(f"WARNING: expected fields are empty: {empty}. The API's response may differ from its docs.")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
