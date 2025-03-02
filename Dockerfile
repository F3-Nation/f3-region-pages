# Build stage
FROM node:20.18.2-slim AS builder
WORKDIR /app

# Build-time environment variables
ARG GOOGLE_SHEETS_API_KEY
ARG GOOGLE_SHEETS_ID
ARG GOOGLE_SHEETS_TAB_NAME

# Set environment variables for build
ENV GOOGLE_SHEETS_API_KEY=$GOOGLE_SHEETS_API_KEY
ENV GOOGLE_SHEETS_ID=$GOOGLE_SHEETS_ID
ENV GOOGLE_SHEETS_TAB_NAME=$GOOGLE_SHEETS_TAB_NAME

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20.18.2-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Runtime environment variables
ENV GOOGLE_SHEETS_API_KEY=$GOOGLE_SHEETS_API_KEY
ENV GOOGLE_SHEETS_ID=$GOOGLE_SHEETS_ID
ENV GOOGLE_SHEETS_TAB_NAME=$GOOGLE_SHEETS_TAB_NAME

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]