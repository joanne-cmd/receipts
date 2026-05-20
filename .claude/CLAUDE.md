# Receipts — Claude Code Context

## Project

Receipts is an AI-powered consumer dispute agent. Users forward receipts to a dedicated Gmail inbox; an agent drafts legally-grounded dispute letters citing merchant policies, US regulations, and community playbooks retrieved via Atlas Vector Search. The user approves drafts in the Next.js dashboard, and the dispatcher sends them. Responses are classified and the agent escalates if needed.

## Workspace layout

```
receipts/
├── packages/
│   └── shared/          # @receipts/shared — Zod schemas, MongoDB client, Voyage stub
├── services/
│   ├── ingester/        # @receipts/ingester  — polls Gmail, creates Dispute records
│   ├── dispatcher/      # @receipts/dispatcher — sends approved drafts via Gmail
│   └── receipts-mcp/    # @receipts/receipts-mcp — MCP server (send_email, get_responses)
├── apps/
│   └── dashboard/       # Next.js 14 App Router — dispute inbox, detail, recovery views
└── scripts/
    └── seed-corpus/     # @receipts/seed-corpus — embeds & inserts policy/reg/playbook docs
```

## Key commands

```bash
pnpm install          # install all workspace deps
pnpm dev              # run all services concurrently (uses concurrently)
pnpm typecheck        # typecheck all packages
pnpm build            # build all packages
pnpm --filter @receipts/shared build           # build shared only
pnpm --filter @receipts/seed-corpus start      # run the seed script
```

## MongoDB collections

| Collection    | Schema          | Purpose                                     |
|---------------|-----------------|---------------------------------------------|
| `disputes`    | `DisputeSchema` | One document per user dispute               |
| `policies`    | `PolicySchema`  | Merchant policy text chunks + embeddings    |
| `regulations` | `RegulationSchema` | US regulation chunks + embeddings        |
| `playbooks`   | `PlaybookSchema`| Community dispute playbooks + embeddings    |

All collections need an Atlas Vector Search index on the `embedding` field (1024 dims, cosine).

## MCP Servers

- **mongodb** — `mongodb-mcp-server` — direct Atlas query/aggregation access
- **receipts-mcp** — `services/receipts-mcp` — `send_email` + `get_responses` tools

Run `pnpm --filter @receipts/receipts-mcp build` before using the MCP in Claude Code.
Then reload MCP with `/mcp` in Claude Code to see both tools.

## Week 1 focus

1. Fill `.env` with real `MONGODB_URI` and `VOYAGE_API_KEY`
2. Create Atlas Vector Search indexes (see Week 1 checklist in README)
3. Populate `scripts/seed-corpus/data/*.json` with real policy/regulation/playbook content
4. Wire the real Voyage fetch in `packages/shared/src/embeddings/voyage.ts`
5. Run `pnpm --filter @receipts/seed-corpus start` and verify docs in Atlas

## Hard rules

- **No API calls without env vars set** — check vars exist before any external call
- **Always validate with Zod** at all external boundaries (env, HTTP, DB reads)
- **Commit after each logical unit** — use conventional commits (`feat:`, `fix:`, `chore:`)
- **No `any`** — use `unknown` + Zod parse, or proper generics
- **ESM everywhere** — `"type": "module"` in all non-Next.js package.json files
- The dashboard is the only package without `"type": "module"` (Next.js handles its own bundling)
