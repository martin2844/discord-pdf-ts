# Use Node.js LTS version
FROM node:18.14.0

# Install system dependencies for PDF processing
RUN apt-get update && apt-get install -y \
    ghostscript \
    graphicsmagick \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .

# Build the application
RUN npm run build

# Copy views directory to dist
RUN cp -r src/views dist/

# Create volume directory for SQLite database
RUN mkdir -p /usr/src/app/data

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]