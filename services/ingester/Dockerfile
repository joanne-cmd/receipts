FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@9
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/ingester/package.json ./services/ingester/package.json
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile
COPY packages/shared ./packages/shared
COPY services/ingester ./services/ingester
RUN pnpm --filter @receipts/shared build
RUN pnpm --filter @receipts/ingester build
RUN addgroup --system --gid 1001 receipts && adduser --system --uid 1001 --ingroup receipts receipts
USER receipts
CMD ["node", "services/ingester/dist/index.js"]
