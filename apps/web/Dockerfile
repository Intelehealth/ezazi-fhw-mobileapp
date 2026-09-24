# Build context must be the monorepo root, e.g.:
#   docker build -f apps/web/Dockerfile -t ezazi-web .
# This is required because apps/web depends on the workspace packages
# under packages/* (@ezazi/api-client, @ezazi/config, @ezazi/types).

FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json

RUN npm ci

COPY packages ./packages
COPY apps/web ./apps/web

RUN npx turbo run build --filter=./apps/web...

FROM nginx:alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
