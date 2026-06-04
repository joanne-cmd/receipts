# 🧾 Receipts — AI-Powered Consumer Dispute Agent

> **Built for the Google Cloud "Building Agents for Real-World Challenges" Hackathon**  
> Track: **Financial Services** | Deadline: June 11, 2026

**Receipts** is an autonomous AI agent that fights consumer disputes on your behalf. Paste any receipt or order confirmation email — the agent reads it, finds the relevant consumer law or merchant policy, drafts a professional dispute letter, and sends it to the merchant for you.

🌐 **Live Demo:** [receipts-dashboard-eight.vercel.app](https://receipts-dashboard-eight.vercel.app)

---

## The Problem

Every day, consumers lose money to undelivered packages, surprise charges, cancelled flights, and course refunds they never got. Most people don't dispute these charges because:
- They don't know their legal rights
- Writing a professional dispute letter is hard
- Finding the merchant's support email is tedious
- The process feels intimidating

**Receipts solves all of this automatically.**

---

## Demo

[![Receipts Demo](https://img.shields.io/badge/Watch-Demo%20Video-red?style=for-the-badge&logo=youtube)](https://youtube.com/TODO)

**Full pipeline in 30 seconds:**
1. Paste a receipt → AI extracts merchant, amount, issue type automatically
2. Click "Generate Draft" → Agent queries MongoDB knowledge base, cites consumer law, drafts email
3. Review and approve → Email sent to merchant automatically

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│              Next.js 14 Dashboard (Vercel)                      │
│         receipts-dashboard-eight.vercel.app                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
   ┌─────────────┐ ┌──────────┐ ┌──────────────────┐
   │  /api/      │ │ /api/    │ │  /api/            │
   │  disputes   │ │ extract- │ │  generate-draft   │
   │  (CRUD)     │ │ receipt  │ │                   │
   └──────┬──────┘ └────┬─────┘ └────────┬─────────┘
          │             │                │
          ▼             ▼                ▼
   ┌─────────────────────────────────────────────────┐
   │              MongoDB Atlas                       │
   │         receipts.btqhana.mongodb.net             │
   │  Collections: disputes, knowledge               │
   │  Indexes: knowledge_vector_index (AutoEmbed)    │
   │           knowledge_text_index (Atlas Search)   │
   └─────────────────────────────────────────────────┘
                       │
                       ▼
   ┌─────────────────────────────────────────────────┐
   │           Google Cloud Infrastructure           │
   │                                                 │
   │  ┌─────────────────────────────────────────┐   │
   │  │  Vertex AI Agent Engine (ADK)           │   │
   │  │  Gemini 2.5 Pro                         │   │
   │  │  Tool: search_knowledge                 │   │
   │  │  → queries MongoDB knowledge base       │   │
   │  └──────────────────┬──────────────────────┘   │
   │                     │                           │
   │  ┌──────────────────▼──────────────────────┐   │
   │  │  MongoDB MCP Proxy (Cloud Run)          │   │
   │  │  SSE + OpenAPI endpoints                │   │
   │  │  38 merchant policies + regulations     │   │
   │  └─────────────────────────────────────────┘   │
   │                                                 │
   │  ┌──────────────────┐  ┌─────────────────────┐ │
   │  │  Ingester        │  │  Dispatcher         │ │
   │  │  (Cloud Run)     │  │  (Cloud Run)        │ │
   │  │  Polls Gmail     │  │  Sends approved     │ │
   │  │  Creates disputes│  │  emails via Gmail   │ │
   │  └──────────────────┘  └─────────────────────┘ │
   └─────────────────────────────────────────────────┘
```

---

## How It Works

### 1. Receipt Ingestion (Automatic)
The **ingester** service runs on Cloud Run and polls Gmail every 30 seconds for order confirmations and receipts. When found, it creates a `Dispute` document in MongoDB Atlas.

### 2. Manual Submission (Dashboard)
Users can also paste any receipt directly into the dashboard. The `/api/extract-receipt` route calls **Gemini 2.5 Pro** to automatically extract:
- Merchant name
- Support email address
- Amount disputed
- Issue type (undelivered goods, billing error, cancellation, etc.)

### 3. Draft Generation (AI Agent)
The "Generate Draft" button calls our **Vertex AI Agent Engine** (ADK-based agent):
1. Agent calls `search_knowledge` tool → queries MongoDB Atlas knowledge base
2. MongoDB returns relevant merchant policies + consumer regulations (FTC, EC 261/2004, etc.)
3. Agent drafts a professional dispute email citing exact policies and law
4. Draft saved to MongoDB with `pending_approval` status

### 4. Human-in-the-Loop Approval
The user reviews the draft in the dashboard and clicks **Approve** or **Reject**. This is the human oversight step — no email is sent without explicit approval.

### 5. Dispatch
The **dispatcher** service polls for approved disputes every 60 seconds and sends the email via Gmail API on the user's behalf.

---

## MongoDB MCP Integration

We built a custom **MongoDB MCP Server** deployed on Google Cloud Run:

```
https://mongodb-mcp-proxy-920248197749.us-central1.run.app
```

The server implements the full MCP protocol specification:
- `GET /sse` — SSE transport endpoint (MCP protocol)
- `POST /message` — MCP message handler
- `GET /openapi.json` — OpenAPI spec for REST fallback
- `POST /query` — REST endpoint for direct queries

**Note on transport:** Vertex AI Agent Builder's MCP SSE client has a known platform limitation (returns `InternalError` on SSE connections). Our MCP server is fully spec-compliant — we access it via the OpenAPI REST fallback in the Vertex AI agent, which produces identical results. The MCP server code, SSE implementation, and tool definitions are fully compliant with the MCP specification.

**Knowledge Base:** 38 documents covering:
- E-commerce: Amazon, Jumia, Carrefour
- Travel: Kenya Airways, Ethiopian Airlines, RwandAir, Airbnb, EU EC 261/2004
- Ride-sharing: Uber (including Uber Cash international), Bolt
- Streaming/Education: Netflix, YouTube Premium, Udemy, Coursera, Skillshare
- Mobile Money: Safaricom M-PESA
- Consumer Law: FTC Mail Order Rule, US DoT regulations, CFPB guidelines

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Model | Gemini 2.5 Pro (Vertex AI) |
| Agent Framework | Google ADK (Agent Development Kit) |
| Agent Hosting | Vertex AI Agent Engine (Reasoning Engine) |
| Agent Builder | Vertex AI Agent Designer (visual flow) |
| MCP Server | Custom Node.js + @modelcontextprotocol/sdk |
| Database | MongoDB Atlas (text search + vector search) |
| Backend Services | Google Cloud Run (3 services) |
| Dashboard | Next.js 14 App Router + Tailwind + shadcn/ui |
| Frontend Hosting | Vercel |
| Email | Gmail API (OAuth2) |
| Language | TypeScript (strict ESM, monorepo) |
| Validation | Zod |
| Logging | Pino |

---

## Live Services

| Service | URL |
|---------|-----|
| Dashboard | https://receipts-dashboard-eight.vercel.app |
| MongoDB MCP Proxy | https://mongodb-mcp-proxy-920248197749.us-central1.run.app |
| Ingester | https://ingester-920248197749.us-central1.run.app |
| Dispatcher | https://dispatcher-920248197749.us-central1.run.app |
| Agent Engine | projects/920248197749/locations/us-central1/reasoningEngines/3908520294918127616 |

---

## Local Development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ |
| Google Cloud SDK | latest |
| MongoDB Atlas account | free tier works |

### Setup

```bash
git clone https://github.com/joanne-cmd/receipts.git
cd receipts
cp .env.example .env   # fill in required values
pnpm install
pnpm --filter dashboard dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@receipts.btqhana.mongodb.net/receipts

# Gmail OAuth2
GMAIL_CLIENT_ID=<your-client-id>
GMAIL_CLIENT_SECRET=<your-client-secret>
GMAIL_REFRESH_TOKEN=<your-refresh-token>
RECEIPTS_EMAIL_ADDRESS=<your-gmail-address>

# Google Cloud
GCP_PROJECT_ID=receipts-agent-2026
GCP_REGION=us-central1
VERTEX_REASONING_ENGINE_ID=projects/920248197749/locations/us-central1/reasoningEngines/3908520294918127616

# Service Account (base64 encoded JSON)
GOOGLE_SERVICE_ACCOUNT_KEY_B64=<base64-encoded-service-account-json>
```

---

## Project Structure

```
receipts/
├── apps/
│   └── dashboard/              # Next.js 14 dashboard (Vercel)
│       ├── app/
│       │   ├── page.tsx                    # Landing page
│       │   ├── dashboard/page.tsx          # Disputes dashboard
│       │   └── api/
│       │       ├── disputes/               # CRUD + PATCH approve/reject
│       │       ├── extract-receipt/        # Gemini extraction
│       │       └── disputes/[id]/
│       │           └── generate-draft/     # Agent Engine call
├── services/
│   ├── ingester/               # Gmail poller (Cloud Run)
│   ├── dispatcher/             # Email sender (Cloud Run)
│   ├── mongodb-mcp-proxy/      # MCP server (Cloud Run)
│   └── receipts-adk/           # Python ADK agent + Agent Engine deploy
└── packages/
    └── shared/                 # MongoDB schemas, db client, Zod types
```

---

## Supported Merchants & Regulations

| Category | Covered |
|----------|---------|
| E-commerce | Amazon, Jumia, Carrefour |
| Airlines | Kenya Airways, Ethiopian Airlines, RwandAir |
| Ride-sharing | Uber, Bolt |
| Accommodation | Airbnb |
| Streaming | Netflix, YouTube Premium |
| Education | Udemy, Coursera, Skillshare |
| Mobile Money | Safaricom M-PESA, Uber Cash International |
| Consumer Law | FTC (US), EC 261/2004 (EU/UK), DoT, CFPB, KCAA |

---

## Hackathon Track

**Financial Services** — Consumer dispute automation addresses a real financial problem: consumers losing money to merchants due to lack of knowledge about their rights. Receipts democratizes access to consumer protection law, making it as easy as pasting an email.

---

## License

MIT — see [LICENSE](LICENSE)