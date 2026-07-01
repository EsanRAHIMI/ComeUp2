FROM node:20-alpine AS domain-build
WORKDIR /shared/domain
COPY shared/domain/package*.json ./
RUN npm ci
COPY shared/domain/ ./
RUN npm run build

FROM node:20-alpine AS deps
WORKDIR /app
COPY ui/package*.json ./
COPY --from=domain-build /shared/domain /shared/domain
RUN npm ci

FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY ui/ ./
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
