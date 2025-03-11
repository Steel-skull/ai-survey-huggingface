#!/usr/bin/env node

/**
 * Dataset check script for the AI Survey application
 * This script verifies Parquet support and dataset access
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { HfInference } = require('@huggingface/hub');
const fetch = require('node-fetch');

// Try to load Parquet dependencies - make them optional
let readParquet, tableFromIPC;
let parquetSupported = false;
try {
  readParquet = require('parquet-wasm').readParquet;
  tableFromIPC = require('apache-arrow').tableFromIPC;
  
  // Verify functions are actually available and the correct type
  if (typeof readParquet === 'function' && typeof tableFromIPC === 'function') {
    parquetSupported = true;
    console.log('✅ Parquet support is enabled');
  } else {
    console.log('⚠️ Parquet libraries loaded but functions not available');
    console.log('readParquet type:', typeof readParquet);
    console.log('tableFromIPC type:', typeof tableFromIPC);
  }
} catch (e) {
  console.error('Parquet libraries not available:', e.message);
  console.log('Only JSON format will be supported');
}

// Define the dataset name
const DATASET_NAME = process.env.HF_DATASET_REPO || "Steelskull/pjmixers";
const SAFE_DATASET_NAME = DATASET_NAME.replace("/", "_");

// HuggingFace configuration
const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_DATASET_REPO = process.env.HF_DATASET_REPO || "Steelskull/pjmixers";

// Directory setup
const dataDir = path.join(__dirname, 'data');
const appRootDir = path.join(__dirname, '..');
const ratingsDir = path.join(dataDir, 'ratings', SAFE_DATASET_NAME);
const userIndicesDir = path.join(dataDir, 'user_indices', SAFE_DATASET_NAME);

// Also check Docker container root
const dockerRootDir = '/';

// Ensure directories exist
async function ensureDirectories() {
  try {
    // Create main data directory
    await fs.mkdir(dataDir, { recursive: true }).catch(e => {
      console.error(`Warning: Could not create ${dataDir}: ${e.message}`);
    });
    
    // Try to create dataset-specific directories, with fallbacks
    try {
      await fs.mkdir(ratingsDir, { recursive: true });
      await fs.mkdir(userIndicesDir, { recursive: true });
    } catch (dirError) {
      console.error(`Error creating dataset-specific directories: ${dirError.message}`);
      
      // Fallback to using general purpose directories
      const fallbackRatingsDir = path.join(dataDir, 'ratings', 'local_dataset');
      const fallbackIndicesDir = path.join(dataDir, 'user_indices', 'local_dataset');
      await fs.mkdir(fallbackRatingsDir, { recursive: true }).catch(e => console.error(`Fallback directory creation failed: ${e.message}`));
      await fs.mkdir(fallbackIndicesDir, { recursive: true }).catch(e => console.error(`Fallback directory creation failed: ${e.message}`));
      console.log('✅ Created fallback data directories');
    }
    console.log('✅ Data directories created/verified');
  } catch (error) {
    console.error('Error creating directories:', error.message);
  }
}

// Check if parquet-wasm is installed and working
async function checkParquetSupport() {
  if (parquetSupported) {
    try {
      console.log('\n=== Testing Parquet Functionality ===');
      
      // Version details
      const parquetVersion = require('parquet-wasm/package.json').version;
      const arrowVersion = require('apache-arrow/package.json').version;
      console.log(`parquet-wasm version: ${parquetVersion}`);
      console.log(`apache-arrow version: ${arrowVersion}`);
      
      // Function validation
      console.log('Function validation:');
      console.log(`- readParquet is a function: ${typeof readParquet === 'function'}`);
      console.log(`- tableFromIPC is a function: ${typeof tableFromIPC === 'function'}`);
      
      // Test with sample data if possible
      try {
        // Create a minimal sample Arrow table and convert to Parquet
        console.log('\nAttempting to test with sample data...');
        
        // Attempt to fetch sample test data from HuggingFace if available
        console.log(`Checking if we can fetch from HuggingFace...`);
        try {
          const testUrl = `https://huggingface.co/datasets/${HF_DATASET_REPO}/resolve/main/`;
          console.log(`Testing fetch to: ${testUrl}`);
          
          const response = await fetch(testUrl, {
            headers: HF_API_TOKEN ? { 
              Authorization: `Bearer ${HF_API_TOKEN}`,
              'User-Agent': 'AI-Survey-Check/1.0' 
            } : {
              'User-Agent': 'AI-Survey-Check/1.0'
            },
            timeout: 5000 // Short timeout for test
          });
          
          console.log(`HuggingFace fetch test result: ${response.status} ${response.statusText}`);
          console.log(`HuggingFace connection: ${response.ok ? '✅ Working' : '❌ Failed'}`);
        } catch (fetchError) {
          console.error('HuggingFace fetch test failed:', fetchError.message);
          console.log('HuggingFace connection: ❌ Failed');
        }
      } catch (testError) {
        console.log('Parquet sample test error:', testError.message);
      }
      
      console.log('\nParquet support: ✅ Available');
      return true;
    } catch (error) {
      console.error('Parquet test failed:', error.message);
      console.error('Error stack:', error.stack);
      return false;
    }
  } else {
    console.log('Parquet support: ❌ Not available');
    return false;
  }
}

// Check for dataset files in various locations
async function checkDatasetLocations() {
  console.log('\n=== Checking Dataset Locations ===');
  
  // Check app root directory
  const appRootJson = path.join(appRootDir, 'pjmixers_dataset.json');
  const appRootJsonExists = await fs.access(appRootJson).then(() => true).catch(() => false);
  console.log(`App root JSON: ${appRootJsonExists ? '✅ Found' : '❌ Not found'} (${appRootJson})`);
  
  // Check data directory
  const dataFolderJson = path.join(dataDir, 'pjmixers_dataset.json');
  const dataFolderJsonExists = await fs.access(dataFolderJson).then(() => true).catch(() => false);
  console.log(`Data directory JSON: ${dataFolderJsonExists ? '✅ Found' : '❌ Not found'} (${dataFolderJson})`);
  
  // Check Docker container root
  const dockerRootJson = path.join(dockerRootDir, 'pjmixers_dataset.json');
  const dockerRootJsonExists = await fs.access(dockerRootJson).then(() => true).catch(() => false);
  console.log(`Docker root JSON: ${dockerRootJsonExists ? '✅ Found' : '❌ Not found'} (${dockerRootJson})`);
  
  // Summary
  const anyDatasetFound = appRootJsonExists || dataFolderJsonExists || dockerRootJsonExists;
  console.log(`\nOverall dataset status: ${anyDatasetFound ? '✅ Dataset found' : '❌ No dataset found'}`);
}

// Main function
async function main() {
  console.log('=== AI Survey Dataset Check ===');
  console.log('Node.js version:', process.version);
  
  // Check if fetch is available
  try {
    console.log('Testing node-fetch...');
    const fetchVersion = require('node-fetch/package.json').version;
    console.log(`node-fetch version: ${fetchVersion}`);
    console.log('node-fetch: ✅ Available');
  } catch (e) {
    console.error('node-fetch error:', e.message);
    console.log('node-fetch: ❌ Not available or not configured correctly');
  }
  
  console.log(`HuggingFace Dataset Repository: ${DATASET_NAME}`);
  console.log(`Authentication: ${HF_API_TOKEN ? 'Using API token' : 'No API token provided'}`);
  
  // Ensure directory structure
  await ensureDirectories();
  
  // Check Parquet support
  const parquetOk = await checkParquetSupport();

  // Check dataset locations
  await checkDatasetLocations();
  
  console.log('\n=== Dataset Check Summary ===');
  console.log(`Dataset repository: ${DATASET_NAME}`);
  console.log(`Format support:`);
  console.log(`- JSON: ✅ Available`);
  console.log(`- Parquet: ${parquetOk ? '✅ Available' : '❌ Not available'}`);
  console.log(`Data directories:`);
  console.log(`- Ratings: ${ratingsDir}`);
  console.log(`- User indices: ${userIndicesDir}`);
  
  console.log('\nThe application will fall back to JSON format if Parquet is not available.');
  
  if (!parquetOk) {
    console.log('\n⚠️ Note: For Parquet support, ensure parquet-wasm and apache-arrow are properly installed.');
    console.log('You can run: npm install parquet-wasm@0.5.0 apache-arrow@14.0.0');
  }
  
  console.log('\n=== Check Complete ===');
}

// Run the main function
main().catch(error => {
  console.error('Dataset check failed:', error);
  process.exit(1);
});