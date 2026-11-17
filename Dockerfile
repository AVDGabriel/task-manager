# Stage 1: Build the federated bundle (dist/mf-manifest.json & remoteEntry.js)
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time auth for @avdgabriel scoped packages (GitHub Packages)
ARG GITHUB_PACKAGES_TOKEN
ARG NODE_AUTH_TOKEN

COPY package.json package-lock.json ./

RUN if [ -n "$GITHUB_PACKAGES_TOKEN" ] || [ -n "$NODE_AUTH_TOKEN" ]; then \
      TOKEN="${GITHUB_PACKAGES_TOKEN:-$NODE_AUTH_TOKEN}"; \
      echo "@avdgabriel:registry=https://npm.pkg.github.com" > .npmrc && \
      echo "//npm.pkg.github.com/:_authToken=${TOKEN}" >> .npmrc; \
    fi && \
    npm ci && \
    rm -f .npmrc

COPY . .
RUN npm run build

# Stage 2: Serve static assets with Nginx + CORS headers for Module Federation
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
