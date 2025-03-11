# AI Survey Application

A multi-user survey application for collecting AI assistant quality ratings, with support for deployment on HuggingFace Spaces.

## Features

- Full-stack application with React frontend and Node.js backend
- Support for multiple concurrent users with data isolation
- Optimized for deployment in HuggingFace Spaces
- Docker support for easy deployment across environments
- Direct streaming from HuggingFace Datasets repository
- Support for both JSON and Parquet dataset formats
- Randomized survey presentation for unbiased feedback collection

## Architecture

The application uses an integrated architecture where:

- A single Node.js server handles both API requests and serves the frontend
- User data is stored in separate files, identified by hashed IP addresses
- Each user receives a randomized set of 50 samples to rate
- Dataset is automatically retrieved from the configured HuggingFace repository
- Supports both JSON and Parquet data formats with the same data structure

## Repository Structure

```
├── backend/                # Node.js Express backend
│   ├── api/                # API routes
│   ├── data/               # Data storage
│   └── server.js           # Main server file
├── frontend/               # React TypeScript frontend
│   ├── public/             # Static assets
│   └── src/                # Source code
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Main Docker configuration
└── huggingface-space-dockerfile  # HuggingFace-specific Docker config
```

## Deployment Options

### Local Development

```bash
# Start the backend
cd backend
npm install
npm run dev

# For Parquet support, install additional dependencies
cd backend
npm install apache-arrow@14.0.0
npm install parquet-wasm@0.5.0

# To validate Parquet format files
node check-dataset.js

# Start the frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# Build and start with Docker Compose
docker-compose up -d
```

### Environment Variables

The application supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `HF_API_TOKEN` | HuggingFace API token (for private repos) | (none) |
| `HF_DATASET_REPO` | HuggingFace dataset repository | `Steel-skull/ai-survey-dataset` |
| `CACHE_HF_DATASET` | Cache HuggingFace dataset locally | `true` |
| `SAFE_DATASET_NAME` | Name for local dataset storage | `PJMixers-Local-Dataset` |

### HuggingFace Spaces Integration

The application is configured to run seamlessly on HuggingFace Spaces:

1. Data is retrieved directly from the configured HuggingFace dataset repository
2. Supports both `dataset.json` and `dataset.parquet` formats from the repository
3. Persistent storage ensures user ratings are maintained between restarts

## Dataset Format Support

This application supports two dataset file formats:

### JSON Format
- Standard JSON array of objects
- File should be named `dataset.json` on HuggingFace or `pjmixers_dataset.json` locally
- Each object represents a conversation sample

### Parquet Format (New)
- Apache Parquet columnar storage format
- File should be named `dataset.parquet` on HuggingFace or `pjmixers_dataset.parquet` locally
- More efficient for large datasets (smaller file size, faster loading)
- Same data structure as the JSON format

The application automatically checks for Parquet format first, then falls back to JSON if needed. 
Both formats can coexist, with Parquet taking precedence when available.
