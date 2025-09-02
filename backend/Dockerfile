# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
# Using --only=production will not install devDependencies
RUN npm install --only=production

# Copy the rest of the application's code
COPY . .

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Define the command to run the app
CMD ["node", "server.js"]
