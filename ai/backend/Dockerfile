# Use Node.js 16 as base image
FROM node:16-alpine

# Install debugging tools and dependencies
RUN apk add --no-cache curl python3 make g++

# Set working directory
WORKDIR /app

# Copy package.json first for better caching
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create directory for temporary uploads
RUN mkdir -p temp && chmod 777 temp

# Expose the port
EXPOSE 89

# Health check to verify service is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:89/ || exit 1

# Start the application
CMD ["node", "server.js"]