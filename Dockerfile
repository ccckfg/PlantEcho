FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/desktop/package.json apps/desktop/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY apps/server apps/server
COPY packages/shared packages/shared

RUN npm run build --workspace @dyn/shared \
  && npm run build --workspace @dyn/server \
  && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=8787 \
  DYN_DATA_DIR=/app/data \
  DB_PROVIDER=postgres

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/server/package.json apps/server/package.json
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist

RUN mkdir -p /app/data

EXPOSE 8787 1883

CMD ["npm", "run", "start", "--workspace", "@dyn/server"]
