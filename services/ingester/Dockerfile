FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/ingester/package.json ./services/ingester/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY services/ingester ./services/ingester

RUN pnpm --filter @receipts/shared build
RUN pnpm --filter @receipts/ingester build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 receipts \
 && adduser  --system --uid 1001 --ingroup receipts receipts

COPY --from=builder --chown=receipts:receipts /app/services/ingester/dist ./dist
COPY --from=builder --chown=receipts:receipts /app/node_modules          ./node_modules
COPY --from=builder --chown=receipts:receipts /app/packages              ./packages

USER receipts

CMD ["node", "dist/index.js"]
