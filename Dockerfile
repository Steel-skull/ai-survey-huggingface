# HuggingFace Space Dockerfile for AI Survey Application
# Optimized for direct deployment to HuggingFace Spaces
# Pulls code directly from GitHub repository

# Use Node.js as base image
FROM node:18-slim

# Install git, wget, and ca-certificates for HTTPS connections
RUN apt-get update && apt-get install -y git wget ca-certificates && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Clone the repository (using master branch)
RUN git clone -b master https://github.com/Steel-skull/ai-survey-huggingface.git .

# Install frontend dependencies
RUN cd frontend && npm install

# Install backend dependencies including HuggingFace hub package
# Install dependencies in the correct order to ensure proper resolution
WORKDIR /app/backend
RUN npm install node-fetch@2.6.7
RUN npm install @huggingface/hub@0.8.3
RUN npm install apache-arrow@14.0.0
RUN npm install parquet-wasm@0.5.0
WORKDIR /app

# Build the frontend
RUN cd frontend && npm run build

# Create directory structure for backend to serve frontend
RUN mkdir -p backend/frontend/dist
RUN cp -r frontend/dist/* backend/frontend/dist/

# Run API configuration script for proper URLs in production
RUN node hf-api-config.js

# HuggingFace configuration
# Set environment variables for dataset access
ENV HF_DATASET_REPO="Steelskull/pjmixers"
ENV CACHE_HF_DATASET="true"
# HF_API_TOKEN can be provided at runtime for private repos

# Set up persistent storage for ratings and user indices
# HuggingFace Spaces provides /data as persistent storage
RUN mkdir -p /data/ratings && \
    mkdir -p /data/ratings/local_dataset && \
    mkdir -p /data/user_indices && \
    mkdir -p /data/user_indices/local_dataset

# Make the data directories world-writable for persistence in Hugging Face
RUN chmod -R 777 /data/ratings && \
    chmod -R 777 /data/user_indices

# Create directories in the app structure and set correct permissions
RUN mkdir -p /app/backend/data && \
    chmod -R 777 /app/backend/data

# Link data directories instead of direct symlinks to specific paths
# Set up symbolic links to the persistent storage
RUN ln -sf /data/ratings /app/backend/data/ratings && \
    ln -sf /data/user_indices /app/backend/data/user_indices

# Ensure check-dataset script exists and is executable
RUN test -f /app/backend/check-dataset.js && chmod +x /app/backend/check-dataset.js || echo "Warning: check-dataset.js not found"

# Set environment to production
ENV NODE_ENV=production
ENV PORT=7860

# Expose the port HuggingFace expects (7860)
EXPOSE 7860

# Create a startup script that ensures database directories exist
RUN echo '#!/bin/sh\n\
# Set variables\n\
\n\
# Check for dataset in Docker container root and link if needed\n\
if [ -f /pjmixers_dataset.json ]; then\n\
  echo "Found dataset file in Docker container root"\n\
fi\n\
\n\
export SAFE_DATASET_NAME="PJMixers-Local-Dataset"\n\
\n\
# Create and set permissions for data directories\n\
mkdir -p /data/ratings/$SAFE_DATASET_NAME\n\
mkdir -p /data/ratings\n\
mkdir -p /data/user_indices/$SAFE_DATASET_NAME\n\
mkdir -p /app/backend/data\n\
chmod -R 777 /data/ratings\n\
chmod -R 777 /data/user_indices\n\
chmod -R 777 /app/backend/data\n\
chmod -R 777 /\n\
\n\
# Check for dataset files in Docker container root\n\
echo "Checking for dataset files in Docker container root:"\n\
ls -la /pjmixers_dataset* 2>/dev/null || echo "No dataset files found in container root"\n\
\n\
# Link Docker root dataset files if they exist\n\
[ -f /pjmixers_dataset.json ] && ln -sf /pjmixers_dataset.json /app/pjmixers_dataset.json && echo "Linked JSON dataset from container root"\n\
[ -f /pjmixers_dataset.parquet ] && ln -sf /pjmixers_dataset.parquet /app/pjmixers_dataset.parquet && echo "Linked Parquet dataset from container root"\n\
chmod -R 777 /app/pjmixers_dataset* 2>/dev/null || echo "No dataset files to set permissions for"\n\
\n\
# Verify directory creation\n\
echo "Persistent directories created:"\n\
ls -la /data\n\
ls -la /data/ratings\n\
ls -la /data/user_indices\n\
\n\
# Report HuggingFace dataset repository\n\
echo "HuggingFace dataset repository: $HF_DATASET_REPO"\n\
\n\
# Check symlinks\n\
echo "Checking symlinks:"\n\
ls -la /app/backend/data\n\
\n\
# Check Parquet support\n\
echo "Checking dataset and Parquet support..."\n\
cd /app/backend && node check-dataset.js\n\
\n\
# Start the application\n\
echo "Starting server..."\n\
echo "The server may take a moment to start if it needs to download the dataset from HuggingFace"\n\
cd /app/backend && PORT=7860 node server.js' > /app/start.sh

RUN chmod +x /app/start.sh

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD node /app/healthcheck.js

# Run the application
CMD ["/app/start.sh"]