# Receipts — AI-Powered Consumer Dispute Agent

Receipts is an autonomous AI agent that fights consumer disputes on your behalf. Forward a receipt or describe a billing problem, and Receipts drafts legally-grounded dispute letters, tracks merchant responses, and escalates to chargebacks or regulatory complaints when needed — all without you lifting a finger.

## Architecture

The system is a TypeScript ESM monorepo (pnpm workspaces). An **ingester** service polls a dedicated Gmail inbox for forwarded receipts and creates `Dispute` records in MongoDB Atlas. A **dispatcher** service watches for approved drafts and sends them via Gmail. A **receipts-mcp** server exposes MCP tools (`send_email`, `get_responses`) so a Claude agent can draft, revise, and escalate letters while citing policy documents, regulations, and community playbooks retrieved via Atlas Vector Search. A **dashboard** Next.js app lets the user review AI-generated drafts, approve or reject them, and track their recovery progress.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ |
| MongoDB Atlas Flex | any region |
| Voyage AI key | voyage-3 model access |
| GCP project | Cloud Run + Gmail API enabled |

## Setup

```bash
git clone https://github.com/your-org/receipts.git
cd receipts
cp .env.example .env          # fill in all required values
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dispute dashboard.

## Services

| Service | Package | Description |
|---------|---------|-------------|
| `ingester` | `@receipts/ingester` | Polls Gmail for forwarded receipts, parses them, creates Dispute records |
| `dispatcher` | `@receipts/dispatcher` | Watches for approved drafts and sends dispute emails via Gmail |
| `receipts-mcp` | `@receipts/receipts-mcp` | MCP server exposing `send_email` and `get_responses` tools for the Claude agent |
| `dashboard` | `dashboard` | Next.js 14 App Router UI for reviewing drafts and tracking recovery |

## Tech Stack

- **Runtime**: Node.js 20, TypeScript 5.5 (strict mode, ESM)
- **Monorepo**: pnpm workspaces
- **Database**: MongoDB Atlas Flex with Vector Search (1024-dim Voyage embeddings)
- **Embeddings**: Voyage AI `voyage-3`
- **AI protocol**: Model Context Protocol (MCP) with Claude
- **UI**: Next.js 14 App Router, Tailwind CSS, shadcn/ui
- **Logging**: pino
- **Validation**: Zod (all runtime boundaries)
- **Deployment**: Google Cloud Run (Docker, alpine)

## Hackathon Context

Built for the **Google Cloud "Building Agents for Real-World Challenges"** hackathon.  
Submission deadline: **June 12 2026**.

## Environment Variables

See `.env.example` for the full list. Required at runtime:

```
MONGODB_URI           – Atlas connection string
VOYAGE_API_KEY        – Voyage AI key for embeddings
GMAIL_CLIENT_ID       – OAuth2 client ID
GMAIL_CLIENT_SECRET   – OAuth2 client secret
GMAIL_REFRESH_TOKEN   – OAuth2 refresh token for the receipts inbox
RECEIPTS_EMAIL_ADDRESS – The Gmail address that receives forwarded receipts
```
