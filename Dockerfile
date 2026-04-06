FROM node:24-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:24-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=build /app/build ./build
COPY drizzle.config.ts ./
COPY app/.server/db/migrations ./app/.server/db/migrations
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
