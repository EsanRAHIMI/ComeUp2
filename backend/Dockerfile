FROM node:20-alpine AS domain-build
WORKDIR /shared/domain
COPY shared/domain/package*.json ./
RUN npm ci
COPY shared/domain/ ./
RUN npm run build

FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
COPY --from=domain-build /shared/domain /shared/domain
RUN npm ci

FROM deps AS build
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    BIND_HOST=0.0.0.0
COPY backend/package*.json ./
COPY --from=domain-build /shared/domain /shared/domain
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]
