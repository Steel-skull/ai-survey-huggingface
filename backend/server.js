const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fetch = require('node-fetch');
const { HfInference } = require('@huggingface/hub');
const https = require('https');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');

// Create a custom agent for better https handling
const agent = new https.Agent({
  keepAlive: true,
  timeout: 60000 // Longer timeout for large dataset downloads
});

// Try to load Parquet dependencies - make them optional
let readParquet, tableFromIPC;
let parquetSupported = false;
try {
  readParquet = require('parquet-wasm').readParquet;
  tableFromIPC = require('apache-arrow').tableFromIPC;
  
  // Do a simple test to verify parquet dependencies are working
  if (typeof readParquet === 'function' && typeof tableFromIPC === 'function') {
    parquetSupported = true;
    console.log('✅ Parquet support is enabled');
    console.log(`parquet-wasm version: ${require('parquet-wasm/package.json').version}`);
    console.log(`apache-arrow version: ${require('apache-arrow/package.json').version}`);
  } else {
    console.log('⚠️ Parquet libraries loaded but functions not available');
    console.log('readParquet type:', typeof readParquet);
    console.log('tableFromIPC type:', typeof tableFromIPC);
  }
} catch (e) {
  console.error('Parquet libraries not available:', e.message);
  console.log('⚠️ Only JSON format will be supported');
}

// HuggingFace configuration
const HF_API_TOKEN = process.env.HF_API_TOKEN || "";
const HF_DATASET_REPO = process.env.HF_DATASET_REPO || "Steelskull/pjmixers";


// Define the dataset name
const DATASET_NAME = HF_DATASET_REPO;
const SAFE_DATASET_NAME = DATASET_NAME.replace("/", "_");


// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Dataset storage
let dataset = [];

// Fetch dataset from HuggingFace
async function fetchDatasetFromHuggingFace() {
  try {
    console.log(`Attempting to fetch dataset from HuggingFace: ${HF_DATASET_REPO}`);
    console.log(`Using node-fetch version: ${require('node-fetch/package.json').version}`);
    
    // Verify fetch is a function
    if (typeof fetch !== 'function') {
      console.error('Error: fetch is not a function');
      console.log('fetch type:', typeof fetch);
      return null;
    }
    
    // Only try Parquet if the libraries are available
    if (parquetSupported) {
      // Try to fetch the dataset in Parquet format first
      console.log('Trying Parquet format...');
      const parquetUrl = `https://huggingface.co/datasets/${HF_DATASET_REPO}/resolve/main/data.parquet`;
      console.log(`Attempting to fetch Parquet from: ${parquetUrl}`);
      
      try {
        const headers = HF_API_TOKEN ? { 
          Authorization: `Bearer ${HF_API_TOKEN}`,
          'User-Agent': 'AI-Survey-App/1.0'
        } : {
          'User-Agent': 'AI-Survey-App/1.0'
        };

        console.log('Request headers:', JSON.stringify(headers, null, 2));
        
        let response = await fetch(parquetUrl, {
          agent,
          headers,
          timeout: 30000 // 30 second timeout
        });
      
  
        if (response.ok) {
          console.log('✅ Found Parquet dataset, parsing...');
          return await parseParquetDataset(response);
        } else {
          console.log(`⚠️ Parquet fetch failed with status: ${response.status} ${response.statusText}`);
          // Log more details about the response
          console.log('Response headers:', JSON.stringify(response.headers.raw(), null, 2));
          const responseText = await response.text().catch(() => 'Could not read response text');
          console.log('Response body preview:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
        }
      } catch (fetchError) {
        console.error('Error during Parquet fetch:', fetchError);
        console.log('Fetch error details:', fetchError.stack || 'No stack trace available');
      }
      console.log('Parquet not found or error accessing it, falling back to JSON format...');
    }
    
    // If Parquet format isn't available, fall back to JSON
    console.log('Trying JSON format...');
    return await fetchJsonDataset();
  } catch (error) {
    console.error('Error fetching dataset from HuggingFace:', error.message);
    if (error.response) {
      console.error('API response details:', await error.response.text().catch(() => 'No response text'));
    }
    return null; // Return null to indicate failure, so we can fall back to local dataset
  }
}

async function fetchJsonDataset() {
  try {
    // Stream dataset from HuggingFace dataset repository
    const datasetUrl = `https://huggingface.co/datasets/${HF_DATASET_REPO}/resolve/main/data.json`;
    console.log(`Attempting to fetch JSON from: ${datasetUrl}`);
    
    // Fetch the dataset
    try {
      const headers = HF_API_TOKEN ? { 
        Authorization: `Bearer ${HF_API_TOKEN}`,
        'User-Agent': 'AI-Survey-App/1.0'
      } : {
        'User-Agent': 'AI-Survey-App/1.0'
      };
      
      console.log('Request headers:', JSON.stringify(headers, null, 2));
      
      const response = await fetch(datasetUrl, {
        agent,
        headers,
        timeout: 30000 // 30 second timeout
      });
  
    
    if (!response.ok) {
        console.error(`Failed to fetch dataset from HuggingFace: ${response.status} ${response.statusText}`);
        console.log('Response headers:', JSON.stringify(response.headers.raw(), null, 2));
        const responseText = await response.text().catch(() => 'Could not read response text');
        console.log('Response body preview:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
        throw new Error(`Failed to fetch dataset: ${response.status} ${response.statusText}`);
     } 
  
        const jsonData = await response.json();
      console.log(`✅ Successfully fetched dataset from HuggingFace with ${Array.isArray(jsonData) ? jsonData.length : 1} items`);
    
      // Process the dataset
      let processedData;
      if (Array.isArray(jsonData)) {
        processedData = jsonData.map(processDatasetItem);
      } else if (jsonData.conversations) {
        processedData = [processDatasetItem(jsonData)];
      } else {
        throw new Error('Invalid dataset format from HuggingFace');
      }
    
  
      return processedData;
    } catch (fetchError) {
      console.error('Error during fetch operation:', fetchError);
      if (fetchError.code === 'ENOTFOUND') {
        console.error('Network error: Host not found. Check your internet connection.');
      } else if (fetchError.type === 'request-timeout') {
        console.error('Request timed out. The server took too long to respond.');
      }
      console.log('Fetch error stack:', fetchError.stack || 'No stack trace available');
      throw fetchError;
    }
  } catch (error) {
    console.error('Error fetching JSON dataset from HuggingFace:', error.message);
    console.log('Error type:', error.name);
    console.log('Error stack:', error.stack || 'No stack trace available');
    return null;
  }
}

async function parseParquetDataset(response) {
  try {
    if (!parquetSupported || !readParquet || !tableFromIPC) {
      throw new Error('Parquet support is not available');
    }
    
    try {
      // Get the binary data from the response
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
    
      console.log(`Received Parquet data: ${buffer.length} bytes`);
      
      if (buffer.length === 0) {
        throw new Error('Received empty buffer from Parquet response');
      }
      
      // Parse the Parquet data using parquet-wasm
      console.log('Parsing Parquet data with parquet-wasm...');
      try {
        const arrowTable = readParquet(buffer);
        if (!arrowTable) {
          throw new Error('Failed to read Parquet data - readParquet returned null/undefined');
        }
        
        console.log('Converting to Arrow table...');
        const table = tableFromIPC(arrowTable);
        if (!table) {
          throw new Error('Failed to convert Arrow table - tableFromIPC returned null/undefined');
        }
      
        console.log(`Arrow table created with ${table.numRows} rows and ${table.schema.fields.length} columns`);
        
        // Convert Arrow table to JavaScript objects
        const jsonData = [];
        for (let i = 0; i < table.numRows; i++) {
          const row = {};
          for (const field of table.schema.fields) {
            const column = table.getColumn(field.name);
            row[field.name] = column.get(i);
          }
          jsonData.push(row);
        }
      
    
        console.log(`✅ Successfully parsed Parquet dataset with ${jsonData.length} items`);
      
    
        // Process the dataset the same way as JSON
        let processedData;
        if (Array.isArray(jsonData)) {
          processedData = jsonData.map(processDatasetItem);
        } else if (jsonData.conversations) {
          processedData = [processDatasetItem(jsonData)];
        } else {
          throw new Error('Invalid dataset format from Parquet file');
        }
      
        return processedData;
      } catch (parseError) {
        console.error('Parquet parsing error:', parseError);
        console.log('Error stack:', parseError.stack || 'No stack trace available');
        throw parseError;
      }
    } catch (parsingError) {
      console.error('Error during Parquet parsing:', parsingError);
      console.log('Parquet parsing error details:', parsingError.stack || 'No stack trace available');
      throw parsingError;
    }
  } catch (error) {
    console.error('Error parsing Parquet dataset:', error.message);
    console.log('Error type:', error.name);
    console.log('Error stack:', error.stack || 'No stack trace available');
    return null;
  }
}

// Initialize the app with data
async function initializeApp() {
  try {
    // Load from local PJMixers JSON file
    // Check root directory first, then fall back to data directory
    // Also check Docker container root directory
    
    // App root paths
    const rootDataPath = path.join(__dirname, '..', 'pjmixers_dataset.json');
    const rootParquetPath = path.join(__dirname, '..', 'pjmixers_dataset.parquet');
    
    // App data directory paths
    const dataFolderPath = path.join(__dirname, 'data', 'pjmixers_dataset.json');
    const dataFolderParquetPath = path.join(__dirname, 'data', 'pjmixers_dataset.parquet');
    
    // Docker container root paths
    const dockerRootJsonPath = '/pjmixers_dataset.json';
    const dockerRootParquetPath = '/pjmixers_dataset.parquet';
    
    // Check if files exist in various locations
    const rootJsonExists = await fs.access(rootDataPath).then(() => true).catch(() => false);
    const rootParquetExists = parquetSupported && await fs.access(rootParquetPath).then(() => true).catch(() => false);
    const dataFolderJsonExists = await fs.access(dataFolderPath).then(() => true).catch(() => false);
    const dataFolderParquetExists = parquetSupported && await fs.access(dataFolderParquetPath).then(() => true).catch(() => false);
    
    // Determine which paths to use
    const localDataPath = rootJsonExists ? rootDataPath : dataFolderPath;
    const localParquetPath = rootParquetExists ? rootParquetPath : (dataFolderParquetExists ? dataFolderParquetPath : dockerRootParquetPath);
    
    // Check for Docker container root files
    const dockerRootJsonExists = await fs.access(dockerRootJsonPath).then(() => true).catch(() => false);
    const dockerRootParquetExists = parquetSupported && await fs.access(dockerRootParquetPath).then(() => true).catch(() => false);
    
    if (dockerRootJsonExists || dockerRootParquetExists) {
      console.log(`Dataset file(s) found in Docker container root directory`);
    }
    const jsonExists = rootJsonExists || dataFolderJsonExists || dockerRootJsonExists;
    const parquetExists = rootParquetExists || dataFolderParquetExists || dockerRootParquetExists;
    
    if (jsonExists || parquetExists) {
      const location = rootJsonExists || rootParquetExists ? 'root directory' : 'data folder';
      console.log(`Local dataset file(s) found in ${location}, but will try HuggingFace first`);
    } else {
      console.log('Local dataset files not found');
      console.log('Will try to fetch from HuggingFace');
    }
    
    // First, try to fetch from HuggingFace
    const hfDataset = await fetchDatasetFromHuggingFace();
    
    if (hfDataset && hfDataset.length > 0) {
      // Use the dataset from HuggingFace
      dataset = hfDataset;
      console.log(`Using dataset from HuggingFace with ${dataset.length} items`);
      
      // Optionally save a local copy for caching
      if (process.env.CACHE_HF_DATASET === 'true') {
        try {
          await fs.mkdir(path.dirname(localDataPath), { recursive: true });
          await fs.writeFile(localDataPath, JSON.stringify(dataset, null, 2));
          console.log('Saved a local cache of the HuggingFace dataset');
        } catch (cacheError) {
          console.error('Error caching HuggingFace dataset:', cacheError.message);
        }
      }
    } else {
      // Fall back to local dataset
      console.log('Falling back to local dataset');
      
      // Try parquet first if supported and available
      if (parquetExists && parquetSupported) {
        console.log('Trying local Parquet dataset...');
        try {
          const parquetPath = rootParquetExists ? rootParquetPath : 
                            dataFolderParquetExists ? dataFolderParquetPath : 
                            dockerRootParquetExists ? dockerRootParquetPath : null;
                            
          if (!parquetPath) {
            throw new Error('No valid Parquet file path found');
          }
          
          console.log(`Reading Parquet file from: ${parquetPath}`);
          const parquetData = await fs.readFile(parquetPath);
          console.log(`Read ${parquetData.length} bytes of Parquet data`);
          
          if (parquetData.length === 0) {
            throw new Error('Parquet file is empty');
          }
          
          // Only attempt to parse if the libraries are available
          if (parquetSupported && typeof readParquet === 'function' && typeof tableFromIPC === 'function') {
            const arrowTable = readParquet(parquetData);
            if (!arrowTable) {
              throw new Error('readParquet returned null/undefined');
            }
            
            const table = tableFromIPC(arrowTable);
            if (!table) {
              throw new Error('tableFromIPC returned null/undefined');
            }
            
            console.log(`Parsed Parquet table with ${table.numRows} rows and ${table.schema.fields.length} columns`);
            
            // Convert Arrow table to JavaScript objects
            const jsonData = [];
            for (let i = 0; i < table.numRows; i++) {
              const row = {};
              for (const field of table.schema.fields) {
                const column = table.getColumn(field.name);
                row[field.name] = column.get(i);
              }
              jsonData.push(row);
            }
            
            // Process the dataset
            if (Array.isArray(jsonData)) {
              dataset = jsonData.map(processDatasetItem);
            } else if (jsonData.conversations) {
              dataset = [processDatasetItem(jsonData)];
            } else {
              throw new Error('Invalid dataset format from local Parquet file');
            }
            
            console.log(`Loaded ${dataset.length} samples from local Parquet dataset`);
          } else {
            throw new Error('Parquet support is not available');
          }
        } catch (parquetError) {
          console.error('Error loading local Parquet dataset:', parquetError.message);
          console.log('Error stack:', parquetError.stack || 'No stack trace available');
          
          // Try JSON if it exists
          if (jsonExists) {
            console.log('Falling back to local JSON dataset...');
            await loadLocalJsonDataset(localDataPath);
          } else {
            dataset = [];
          }
        }
      } else if (jsonExists) {
        // Fall back to JSON dataset
        await loadLocalJsonDataset(localDataPath);
      } else if (dockerRootJsonExists) {
        // Try Docker container root files
        console.log('Checking Docker container root for dataset files...');
        console.log('Loading Docker root JSON dataset...');
        await loadLocalJsonDataset(dockerRootJsonPath);
      } else {
        console.error('No dataset available from HuggingFace or locally');
        // Initialize with empty dataset
        dataset = [];
        
        // Create directory if it doesn't exist
        await fs.mkdir(path.dirname(localDataPath), { recursive: true }).catch(e => {
          console.error(`Failed to create directory: ${e.message}`);
        });
      }
    }
    
    if (dataset.length === 0) {
      console.warn('WARNING: Running with an empty dataset');
    } else {
      console.log(`Dataset ready with ${dataset.length} samples`);
    }
    
    // Ensure ratings directory exists
    const ratingsDir = path.join(__dirname, 'data', 'ratings', SAFE_DATASET_NAME);
    try {
      await fs.mkdir(ratingsDir, { recursive: true });
      console.log(`Created ratings directory: ${ratingsDir}`);
    } catch (dirError) {
      console.error(`Error creating ratings directory: ${dirError.message}`);
      
      // Fallback: Try using a safer directory name without slashes
      const safeDir = path.join(__dirname, 'data', 'ratings', 'local_dataset');
      try {
        await fs.mkdir(safeDir, { recursive: true });
        console.log(`Created fallback ratings directory: ${safeDir}`);
      } catch (fallbackError) {
        console.error(`Error creating fallback directory: ${fallbackError.message}`);
      }
    }
    
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Helper function to load local JSON dataset
async function loadLocalJsonDataset(localDataPath) {
  try {
    // Load data from local JSON file
    console.log(`Reading local JSON dataset from: ${localDataPath}`);
    const data = await fs.readFile(localDataPath, 'utf8');
    let jsonData;
    
    try {
      // Try to parse the JSON data
      jsonData = JSON.parse(data);
      // Handle both array format and object with conversations array format
      if (Array.isArray(jsonData)) {
        dataset = jsonData.map(processDatasetItem);
      } else if (jsonData.conversations) {
        // Convert single conversation object to array format for compatibility
        dataset = [processDatasetItem(jsonData)];
      } else {
        console.error('Invalid JSON data format - missing conversations array');
        // Initialize with empty dataset
        dataset = [];
      }
      
      console.log(`Loaded ${dataset.length} samples from local JSON dataset`);
    } catch (error) {
      console.error('Error parsing JSON from local dataset file:', error.message);
      console.error('Please ensure your file contains valid JSON');
      
      // Try to fix common JSON issues and provide helpful debugging information
      try {
        // Try to parse with a more lenient JSON parser like JSON5 (not available by default)
        // For now, just provide better error details
        const errorPosition = error.message.match(/position (\d+)/);
        if (errorPosition && errorPosition[1]) {
          const pos = parseInt(errorPosition[1]);
          const errorContext = data.substring(Math.max(0, pos - 40), Math.min(data.length, pos + 40));
          console.error(`Error context around position ${pos}:\n"${errorContext}"`);
          console.error(`Check for issues like missing commas, unquoted properties, or trailing commas`);
        }
      } catch (e) {
        // Ignore additional errors during debugging
      }
      
      dataset = [];
    }
  } catch (localError) {
    console.error('Error loading local dataset:', localError.message);
    dataset = [];
  }
}

// Helper function to process dataset items
function processDatasetItem(item) {
  // Ensure the item has a turn_prompt_hash
  if (!item.turn_prompt_hash) {
    // Generate a deterministic hash if missing
    const contentToHash = JSON.stringify(item.conversations || {});
    item.turn_prompt_hash = crypto.createHash('sha256').update(contentToHash).digest('hex');
  }
  
  // You can add more processing steps here if needed
  // For example, ensure consistent structure, fix formatting, etc.
  
  return item;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Import routes
const ratingsRoutes = require('./api/routes/ratings');

// Helper functions for handling user-specific files
const getUserRatingsFilePath = (req) => {
  const userIp = req.ip || req.connection.remoteAddress;
  const fileHash = crypto.createHash('sha256').update(userIp).digest('hex');
  const fileName = `${fileHash}.json`;
  return path.join(__dirname, 'data', 'ratings', SAFE_DATASET_NAME, fileName);
};

// Get shuffled indices for a user
const getUserShuffledIndices = async (req) => {
  try {
    // Create unique user identifier hash
    const userHash = crypto.createHash('sha256').update(req.ip || req.connection.remoteAddress).digest('hex');
    
    // Try primary location
    let filePath = path.join(
      __dirname, 
      'data', 
      'user_indices', 
      SAFE_DATASET_NAME, 
      `${userHash}.json`
    );
    
    try {
      // Try to create the directory
      await fs.mkdir(path.dirname(filePath), { recursive: true });
    } catch (dirError) {
      console.error(`Error creating user indices directory: ${dirError.message}`);
      
      // Try fallback location with simple name
      filePath = path.join(__dirname, 'data', 'user_indices', 'local_dataset', `${userHash}.json`
);
       try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
      } catch (fallbackError) {
        console.error(`Error creating fallback directory: ${fallbackError.message}`);
      }
    }
    
    // Check if file exists
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    
    if (exists) {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } else {
      // Create shuffled indices
      const indices = Array.from({ length: dataset.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      
      await fs.writeFile(filePath, JSON.stringify(indices)).catch(e => console.error(`Failed to write indices file: ${e.message}`));
      return indices;
    }
  } catch (error) {
  
    console.error('Error getting shuffled indices:', error);
    return Array.from({ length: dataset.length }, (_, i) => i);
  }
};

// Use routes
app.use('/api/dataset/info', async (req, res) => {
  res.json({
    name: DATASET_NAME,
    totalSamples: dataset.length,
    formatSupport: {
      json: true,
      parquet: parquetSupported
    }
  });
});

app.use('/api/samples/:index', async (req, res) => {
  try {
    const userIndices = await getUserShuffledIndices(req);
    const requestedIndex = parseInt(req.params.index);
    
    // Handle out-of-range indices gracefully
    if (isNaN(requestedIndex) || requestedIndex < 0) {
      // For negative indices or non-numbers, redirect to the first sample
      return res.json(dataset[userIndices[0]]);
    }
    
    if (requestedIndex >= userIndices.length) {
      // For indices beyond the range, return the last sample
      // or we could redirect to the first sample with a flag indicating completion
      return res.json({
        ...dataset[userIndices[userIndices.length - 1]],
        is_last_sample: true
      });
    }
    
    const sampleIndex = userIndices[requestedIndex];
    
    // Add metadata to help frontend sync
    res.json({
      ...dataset[sampleIndex],
      total_available: userIndices.length
    });
  } catch (error) {
    console.error('Error fetching sample:', error);
    res.status(500).json({ error: 'Failed to retrieve sample' });
  }
});

app.use('/api/ratings', ratingsRoutes);

// Basic route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Survey API is running',
    endpoints: [
      '/api/dataset/info',
      '/api/samples/:index',
      '/api/ratings',
      '/api/ratings/user',
      '/api/ratings/download'
    ],
    formatSupport: {
      json: true,
      parquet: parquetSupported
    }
  });
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(publicPath));
  
  // Handle any requests that don't match the above
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Error handling middleware (after all other middleware and routes)
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: true,
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`Format support: JSON = true, Parquet = ${parquetSupported}`);
  });
}).catch(error => {
  console.error('Failed to initialize app:', error);
});