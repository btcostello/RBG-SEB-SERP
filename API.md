# lifeproj Projection API — Integration Guide (v1)

A small HTTP/JSON API that runs a universal-life illustration (a month-by-month
account-value projection) and returns an annual report plus a compliance summary.
This document is everything you need to call it from another service.

- **Base URL:** `https://<your-deployment-host>` (e.g. the Railway URL for this app)
- **Content type:** `application/json` for all request bodies and responses
- **Version:** `v1` (stable; breaking changes will ship under a new prefix)

---

## 1. Authentication

The projection endpoint is gated by an API key. Send it in a request header:

```
X-API-Key: <your-key>
```

- A missing or wrong key returns **401** `{"error": "unauthorized", ...}`.
- `GET /api/v1/health` and `GET /api/v1/schema` are **open** (no key) so you can
  probe liveness and discover the contract before you have credentials.
- Ask the API owner for a key. Keys are configured server-side and can be rotated
  without code changes.

---

## 2. Endpoints

| Method | Path                | Auth | Purpose                                    |
|--------|---------------------|------|--------------------------------------------|
| GET    | `/api/v1/health`    | none | Liveness check → `{"status": "ok"}`        |
| GET    | `/api/v1/schema`    | none | Self-describing field catalog (live docs)  |
| POST   | `/api/v1/project`   | key  | Run a projection; returns the full results |

> `GET /api/v1/schema` returns the authoritative, always-current field list
> (names, types, enums, defaults, and an example). If anything in this document
> ever disagrees with `/schema`, trust `/schema`.

---

## 3. Request body — the canonical policy

`POST /api/v1/project` takes a single JSON object describing the policy.

**Required:** `issue_age`, `gender`, `health`, `face_amount`. Everything else has a
default. Unknown keys are ignored.

| Field                   | Type    | Default        | Notes |
|-------------------------|---------|----------------|-------|
| `issue_age`             | integer | — (required)   | 0–120. Age at issue. |
| `gender`                | string  | — (required)   | `"M"` or `"F"`. |
| `health`                | string  | — (required)   | Risk class — must match exactly (see below). |
| `face_amount`           | number  | — (required)   | Initial / year-1 face. Compliance + target-premium basis. |
| `face_schedule`         | object  | `{}`           | Sparse `{year: face}` breakpoints; empty ⇒ flat `face_amount`. |
| `product_type`          | string  | `"VUL"`        | `"VUL"` or `"IUL"`. |
| `db_option`             | string  | `"A"`          | `"A"` = level, `"B"` = increasing. |
| `annual_premium`        | number  | `0`            | Year-1 annual premium. |
| `premium_schedule`      | object  | `{}`           | Sparse `{year: annual premium}`; a `0` breakpoint stops premium. |
| `premium_mode`          | string  | `"annual"`     | `"annual"`, `"semiannual"`, `"quarterly"`, `"monthly"`. |
| `distribution_amount`   | number  | `0`            | Year-1 annual distribution (withdrawal/loan). |
| `distribution_schedule` | object  | `{}`           | Sparse `{year: amount}`; a `0` breakpoint stops. |
| `distribution_type`     | string  | `"withdrawal"` | `"withdrawal"`, `"loan"`, `"indexed_loan"`. |
| `credited_rate`         | number  | `0.05`         | Annual crediting rate, 0–1. |
| `maturity_age`          | integer | `121`          | 1–121; must be greater than `issue_age`. |
| `qualification_test`    | string  | `"GPT"`        | `"GPT"` or `"CVAT"`. |
| `rate_7702_gpt`         | number  | `0.04`         | 7702 GPT interest basis, 0–1. |
| `rate_7702_cvat`        | number  | `0.04`         | 7702 CVAT interest basis, 0–1. |
| `rate_7702a`            | number  | `0.04`         | 7702A interest basis, 0–1. |

**Health / risk class** must be one of these exact strings:

- `Preferred Best Non Tobacco`
- `Preferred Non Tobacco`
- `Standard Plus Non Tobacco`
- `Standard Non Tobacco`
- `Preferred Tobacco`
- `Standard Tobacco`

**Schedules** are objects keyed by policy year (as strings in JSON), e.g.
`"premium_schedule": {"1": 8000, "21": 0}` pays $8,000/yr starting year 1 and stops
at year 21. Values carry forward until the next breakpoint.

### Optional: solve for a premium

Instead of projecting a fixed premium, you can ask the engine to solve the **level
annual premium** that hits a target **net surrender value** at a given year or age.
Add a `solve` block:

```json
"solve": { "value": 100000, "when": 20, "basis": "year" }
```

- `value` (required) — target net surrender value.
- `when` (required) — policy year (`basis: "year"`) or attained age (`basis: "age"`).
- `basis` — `"year"` (default) or `"age"`.

When a solve runs, the resolved premium is reflected in the echoed `policy` and in
`summary.initial_annual_premium`.

### Example request

```json
{
  "issue_age": 40,
  "gender": "M",
  "health": "Standard Non Tobacco",
  "product_type": "IUL",
  "face_amount": 500000,
  "db_option": "A",
  "annual_premium": 8000,
  "premium_schedule": { "1": 8000, "21": 0 },
  "premium_mode": "annual",
  "credited_rate": 0.05,
  "qualification_test": "GPT"
}
```

---

## 4. Response body (200)

A successful projection returns the full results — the same data the web UI renders.
Top-level keys:

| Key            | Type           | Description |
|----------------|----------------|-------------|
| `report`       | array          | One row per policy year (the annual illustration). |
| `charges`      | array          | Per-year charge breakdown. |
| `credits`      | array          | Per-year credit breakdown. |
| `loans`        | array          | Per-year loan detail. |
| `summary`      | object         | Initial values + key compliance premiums. |
| `solve`        | object \| null | Solve result, or `null` when no solve was requested. |
| `gpt_adjusted` | boolean        | True if premiums were capped by the Guideline Premium Test. |
| `mec_adjusted` | boolean        | True if premiums were reduced by the 7702A 7-pay (MEC) limit. |
| `policy`       | object         | The resolved policy echoed back in canonical form (read the solved premium here). |

**`report[]` rows:**

| Field           | Description |
|-----------------|-------------|
| `policy_year`   | 1, 2, 3, … |
| `age`           | End-of-year attained age (display convention). |
| `attained_age`  | Attained age (true). |
| `premium`       | Premium paid that year. |
| `account_value` | Total account value (incl. loan collateral) at year end. |
| `death_benefit` | Death benefit at year end. |
| `status`        | In force / lapsed indicator. |

**`charges[]`:** `policy_year`, `age`, `premium_load`, `cost_of_insurance`,
`expense_charge`, `unit_charge`, `total_charges`.

**`credits[]`:** `policy_year`, `age`, `interest`, `persistency`, `loan_credit`,
`total_credits`.

**`loans[]`:** `policy_year`, `age`, `new_loan`, `loan_interest`, `eoy_loan_balance`.

**`summary`:** `initial_face_amount`, `initial_annual_premium`,
`initial_target_premium`, `initial_seven_pay_premium`, `initial_cvat_nsp`,
`guideline_single_premium`, `guideline_level_premium_a`, `guideline_level_premium_b`,
`lapse_year` (null if the policy stays in force).

Report/summary numbers are rounded to cents.

---

## 5. Errors

| Status | `error`              | Meaning |
|--------|----------------------|---------|
| 400    | `validation_failed`  | Bad request body. See `details[]` (below). |
| 401    | `unauthorized`       | Missing/invalid `X-API-Key`. |
| 422    | `projection_failed`  | Valid input, but the engine couldn't complete (e.g. a rate-table lookup miss). See `message`. |

Validation errors return **every** problem at once:

```json
{
  "error": "validation_failed",
  "details": [
    { "field": "gender", "message": "must be one of M, F" },
    { "field": "issue_age", "message": "is required" }
  ]
}
```

---

## 6. Quick start

```bash
# 1. Check it's up (no auth)
curl https://<host>/api/v1/health

# 2. Read the live contract (no auth)
curl https://<host>/api/v1/schema

# 3. Run a projection (auth required)
curl -X POST https://<host>/api/v1/project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-key>" \
  -d '{
        "issue_age": 40, "gender": "M",
        "health": "Standard Non Tobacco",
        "face_amount": 500000, "annual_premium": 8000,
        "product_type": "IUL"
      }'
```

Python:

```python
import requests

resp = requests.post(
    "https://<host>/api/v1/project",
    headers={"X-API-Key": "<your-key>"},
    json={
        "issue_age": 40, "gender": "M",
        "health": "Standard Non Tobacco",
        "face_amount": 500000, "annual_premium": 8000,
        "product_type": "IUL",
    },
)
resp.raise_for_status()
data = resp.json()
for row in data["report"]:
    print(row["policy_year"], row["account_value"], row["death_benefit"])
```

---

## 7. Notes for integrators

- **Stateless.** Each `POST /api/v1/project` is a pure function of its body — no
  sessions, no stored state. Safe to retry.
- **Discover, don't hardcode.** Pull enums/defaults from `GET /api/v1/schema` if you
  want to stay in lockstep with the server.
- **Round-trip.** The `policy` in the response is the canonical input shape; you can
  feed it straight back into a later request.
