# LeadHub API: production image for AWS App Runner / ECS Fargate / Elastic Beanstalk (Docker)
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

# Install production dependencies only (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App source (secrets are NOT copied: see .dockerignore; set them as AWS env vars / secrets)
COPY src ./src

# Run as the unprivileged "node" user that ships with the image
USER node

EXPOSE 8080

# Container-level health check (App Runner/ECS also configure their own against /api/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["node", "src/server.js"]
