# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and built files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/tools/ui-theme/themes-export ./dist/tools/ui-theme/themes-export

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Expose the port the app runs on
EXPOSE ${PORT}

# Start the application
CMD ["node", "dist/index.js"]
