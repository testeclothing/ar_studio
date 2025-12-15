FROM node:18-bullseye-slim

# Install system dependencies for node-canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set up app
WORKDIR /app
COPY package*.json ./

# Install NPM packages
RUN npm install

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# Expose port and start
EXPOSE 3000
CMD ["node", "server.js"]