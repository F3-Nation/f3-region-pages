# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the F3 region-pages Next.js app, targeting Cloud Run.
#
# `next build` runs generateStaticParams() against the databases, so the build
# needs POSTGRES_URL and F3_DATA_WAREHOUSE_URL. These are passed as BuildKit
# secrets (never baked into a layer):
#
#   DOCKER_BUILDKIT=1 docker build \
#     --secret id=postgres_url,src=./.secrets/postgres_url \
#     --secret id=warehouse_url,src=./.secrets/warehouse_url \
#     -t <region>-docker.pkg.dev/<project>/<repo>/web:<tag> .
#
FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . .

# Skip lifecycle scripts: postinstall runs `skills:check` (dev tooling) which is
# unnecessary for a production build and may require network/state we don't have.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build-time DB access for generateStaticParams. Secrets are mounted only for
# this RUN and are not persisted into the image.
RUN --mount=type=secret,id=postgres_url \
    --mount=type=secret,id=warehouse_url \
    POSTGRES_URL="$(cat /run/secrets/postgres_url)" \
    F3_DATA_WAREHOUSE_URL="$(cat /run/secrets/warehouse_url)" \
    pnpm build

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# Next.js standalone output: server.js + a pruned node_modules live at the root
# of .next/standalone, with static assets and public/ copied alongside.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080

CMD ["node", "server.js"]
