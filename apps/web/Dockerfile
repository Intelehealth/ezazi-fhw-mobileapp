# eZAZI doctor webapp (apps/web) — static React/Vite SPA served by nginx.
#
# Build context must be the MONOREPO ROOT, not apps/web — this app depends on
# the @ezazi/api-client, @ezazi/config, @ezazi/types workspace packages, and
# npm workspaces needs the full tree to resolve them. From the repo root:
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_AUTH_GATEWAY_URL=https://... \
#     --build-arg VITE_PORTAL_URL=https://... \
#     --build-arg VITE_CONFIG_URL=https://... \
#     --build-arg VITE_RECAPTCHA_SITE_KEY=... \
#     --build-arg VITE_CLIENT_ID=default \
#     -t ezazi-web .
#
# All VITE_* build args get compiled into the JS bundle (Vite env vars are
# build-time, not runtime) — there is no way to change them by restarting
# the container, only by rebuilding the image.

# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Manifests only, for layer caching — this layer only invalidates when a
# package.json actually changes, not on every source edit. All workspaces
# must be present (not just apps/web + packages/*) or npm's workspace
# resolution errors on the ones missing from `workspaces` in package.json.
COPY package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json

# `npm install`, not `npm ci` — package-lock.json is gitignored in this repo
# (see .gitignore), so it won't exist in a fresh checkout for `npm ci` to
# validate against. Once the lockfile is committed, switch this to
# `npm ci` for reproducible, faster installs.
RUN npm install

# Source for apps/web and the @ezazi/* packages it imports — their
# package.json "main"/"types" point at raw src/index.ts (see
# packages/*/package.json), so no separate build step is needed for them.
COPY apps/web ./apps/web
COPY packages ./packages

ARG VITE_APP_ENV=production
ARG VITE_AUTH_GATEWAY_URL
ARG VITE_PORTAL_URL
ARG VITE_CONFIG_URL
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_CLIENT_ID=default

RUN printf 'VITE_APP_ENV=%s\nVITE_AUTH_GATEWAY_URL=%s\nVITE_PORTAL_URL=%s\nVITE_CONFIG_URL=%s\nVITE_RECAPTCHA_SITE_KEY=%s\nVITE_CLIENT_ID=%s\n' \
      "$VITE_APP_ENV" "$VITE_AUTH_GATEWAY_URL" "$VITE_PORTAL_URL" \
      "$VITE_CONFIG_URL" "$VITE_RECAPTCHA_SITE_KEY" "$VITE_CLIENT_ID" \
      > apps/web/.env.production

RUN npx turbo run typecheck build --filter=./apps/web...

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime

# SPA fallback (try_files ... /index.html) — without this, any client-side
# route (e.g. /auth/login) 404s on direct load/refresh because nginx looks
# for a literal file/folder that doesn't exist. See apps/web/src/routes/
# app.routes.tsx — this app uses createBrowserRouter, not createHashRouter.
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost/ || exit 1
