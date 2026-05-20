FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json    ./packages/shared/package.json
COPY services/receipts-mcp/package.json ./services/receipts-mcp/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared      ./packages/shared
COPY services/receipts-mcp ./services/receipts-mcp

RUN pnpm --filter @receipts/shared      build
RUN pnpm --filter @receipts/receipts-mcp build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 receipts \
 && adduser  --system --uid 1001 --ingroup receipts receipts

COPY --from=builder --chown=receipts:receipts /app/services/receipts-mcp/dist ./dist
COPY --from=builder --chown=receipts:receipts /app/node_modules               ./node_modules
COPY --from=builder --chown=receipts:receipts /app/packages                   ./packages

USER receipts

EXPOSE 8080

CMD ["node", "dist/index.js", "--transport", "sse"]
