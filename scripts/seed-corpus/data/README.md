# Seed Corpus Data

Place JSON files here before running `pnpm --filter @receipts/seed-corpus start`.

Each file must be a JSON array of objects matching one of the schemas below (field names match the Zod schemas in `packages/shared/src/schemas/`). The seed script will embed each document via the Voyage API and upsert it into MongoDB.

---

## `policies.json` — Merchant Policy chunks

```json
[
  {
    "doc_type": "merchant_policy",
    "merchant": "amazon",
    "merchant_display": "Amazon",
    "category": "return",
    "title": "Amazon 30-Day Return Policy",
    "content": "Most items sold on Amazon.com can be returned within 30 days of receipt of shipment...",
    "source_url": "https://www.amazon.com/gp/help/customer/display.html?nodeId=GKM69DUUYKQWKWX7",
    "effective_date": "2024-01-01"
  }
]
```

Valid `category` values: `return` | `refund` | `cancellation` | `warranty` | `delivery` | `billing`

---

## `regulations.json` — US Consumer Regulations

```json
[
  {
    "doc_type": "regulation",
    "jurisdiction": "US",
    "authority": "FTC",
    "citation": "16 C.F.R. Part 435",
    "title": "FTC Mail Order Rule",
    "plain_english": "Sellers must ship within the promised time or offer a full refund.",
    "content": "When you advertise merchandise by mail, telephone, fax, or on the Internet...",
    "source_url": "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-435",
    "effective_date": "2014-06-13"
  }
]
```

Valid `authority` values: `FTC` | `DoT` | `CFPB` | `FRB`

---

## `playbooks.json` — Community Dispute Playbooks

```json
[
  {
    "doc_type": "playbook",
    "merchant": "delta",
    "issue_type": "cancellation_refund",
    "title": "Delta cancelled my flight — got full cash refund in 3 days",
    "summary": "Filed DOT complaint reference in email, got cash refund within 72 hours.",
    "outcome": "won",
    "amount_recovered": 487.00,
    "escalation_steps": [
      {
        "step": 1,
        "channel": "email",
        "template_hint": "Reference 14 CFR 259.5 and threaten DOT complaint"
      },
      {
        "step": 2,
        "channel": "dot_complaint",
        "template_hint": "File at airconsumer.dot.gov if no response in 7 days"
      }
    ],
    "source": "r/delta"
  }
]
```

Valid `outcome` values: `won` | `partial` | `lost` | `escalated`

Valid `issue_type` values: `undelivered_goods` | `wrong_charge` | `service_not_rendered` | `cancellation_refund` | `warranty_claim` | `billing_error`

Valid `channel` values: `email` | `chargeback` | `bbb` | `dot_complaint` | `ftc_complaint` | `small_claims`
