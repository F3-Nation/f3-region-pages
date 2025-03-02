# Build stage
FROM node:20.18.2-slim AS builder
WORKDIR /app

# Build-time environment variables
ARG GOOGLE_SHEETS_JSON_URL
ARG POSTGRES_URL

# Set environment variables for build
ENV GOOGLE_SHEETS_JSON_URL=$GOOGLE_SHEETS_JSON_URL
ENV POSTGRES_URL=$POSTGRES_URL

COPY package*.json ./
RUN npm install
COPY . .
# Skip database migrations during build
RUN npm run next:build

# Production stage
FROM node:20.18.2-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Runtime environment variables
ENV GOOGLE_SHEETS_JSON_URL=$GOOGLE_SHEETS_JSON_URL
ENV POSTGRES_URL=$POSTGRES_URL

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
# Copy migration files for runtime migrations
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Cloud Run will set PORT environment variable
ENV PORT=3000
EXPOSE $PORT

# Use the non-root user for better security
USER node

# Run migrations at startup and then start the app
CMD ["npm", "run", "start:with-migrations"]