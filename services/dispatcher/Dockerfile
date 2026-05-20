FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/dispatcher/package.json ./services/dispatcher/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY services/dispatcher ./services/dispatcher

RUN pnpm --filter @receipts/shared build
RUN pnpm --filter @receipts/dispatcher build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 receipts \
 && adduser  --system --uid 1001 --ingroup receipts receipts

COPY --from=builder --chown=receipts:receipts /app/services/dispatcher/dist ./dist
COPY --from=builder --chown=receipts:receipts /app/node_modules              ./node_modules
COPY --from=builder --chown=receipts:receipts /app/packages                  ./packages

USER receipts

CMD ["node", "dist/index.js"]
