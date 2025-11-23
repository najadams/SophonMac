FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p data/db

# Expose port
EXPOSE 3021

# Start the application
CMD ["node", "index.js"]
