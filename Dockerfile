FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb bunfig.toml ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=8665
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8665
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "8665"]
