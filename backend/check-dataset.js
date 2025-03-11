#!/usr/bin/env node

/**
 * Advanced dataset check and fix script for the AI Survey application
 * 
 * Features:
 * - Verifies Parquet support and dataset access
 * - Provides detailed JSON validation and auto-repair
 * - Checks local dataset files for common formatting issues
 * - Supports both HuggingFace datasets and local JSON files
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

// Try to load HuggingFace and fetch dependencies if available
let HfInference, fetch;
let hfSupported = false;
try {
  HfInference = require('@huggingface/hub').HfInference;
  fetch = require('node-fetch');
  hfSupported = true;
  console.log('✅ HuggingFace integration is available');
} catch (e) {
  console.log('⚠️ HuggingFace integration not available:', e.message);
  console.log('Local dataset features only will be supported');
}

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
  }
} catch (e) {
  console.log('⚠️ Parquet libraries not available');
  console.log('Only JSON format will be supported');
}

// Define the dataset name
const DATASET_NAME = process.env.HF_DATASET_REPO || "PJMixers-Local-Dataset";
const SAFE_DATASET_NAME = DATASET_NAME.replace("/", "_");

// HuggingFace configuration
const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_DATASET_REPO = process.env.HF_DATASET_REPO || "Steelskull/pjmixers";

// Directory setup
const dataDir = path.join(__dirname, 'data');
const datasetDir = path.join(dataDir, 'dataset');
const appRootDir = path.join(__dirname, '..');
const ratingsDir = path.join(dataDir, 'ratings', SAFE_DATASET_NAME);
const userIndicesDir = path.join(dataDir, 'user_indices', SAFE_DATASET_NAME);

// Also check Docker container root
const dockerRootDir = '/';

// Potential dataset file paths to check
const datasetPaths = [
  path.join(dataDir, 'pjmixers_dataset.json'),
  path.join(datasetDir, 'pjmixers_dataset.json'),
  path.join(appRootDir, 'pjmixers_dataset.json'),
  path.join(dockerRootDir, 'pjmixers_dataset.json')
];

// Ensure directories exist
async function ensureDirectories() {
  try {
    // Create main data directory
    await fs.mkdir(dataDir, { recursive: true }).catch(e => {
      console.error(`Warning: Could not create ${dataDir}: ${e.message}`);
    });
    
    // Create dataset directory
    await fs.mkdir(datasetDir, { recursive: true }).catch(e => {
      console.error(`Warning: Could not create ${datasetDir}: ${e.message}`);
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
        // Attempt to fetch sample test data from HuggingFace if available
        if (hfSupported) {
          console.log('\nChecking if we can fetch from HuggingFace...');
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
        }
      } catch (testError) {
        console.log('Parquet sample test error:', testError.message);
      }
      
      console.log('\nParquet support: ✅ Available');
      return true;
    } catch (error) {
      console.error('Parquet test failed:', error.message);
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
  
  let foundPaths = [];
  
  // Check all potential dataset paths
  for (const filePath of datasetPaths) {
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    console.log(`${exists ? '✅ Found' : '❌ Not found'} - ${filePath}`);
    
    if (exists) {
      foundPaths.push(filePath);
    }
  }
  
  // Also look in the dataset directory for any JSON files
  try {
    const datasetFiles = await fs.readdir(datasetDir);
    const jsonFiles = datasetFiles.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length > 0) {
      console.log(`\nAdditional dataset files found in ${datasetDir}:`);
      for (const jsonFile of jsonFiles) {
        const fullPath = path.join(datasetDir, jsonFile);
        console.log(`✅ Found - ${fullPath}`);
        foundPaths.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors reading the dataset directory
  }
  
  // Summary
  console.log(`\nOverall dataset status: ${foundPaths.length > 0 ? '✅ Datasets found' : '❌ No datasets found'}`);
  
  return foundPaths;
}

/**
 * Gets error context around a position in the string
 */
function getErrorContext(str, position, contextSize = 20) {
  const start = Math.max(0, position - contextSize);
  const end = Math.min(str.length, position + contextSize);
  const contextStr = str.substring(start, end);
  
  // Calculate where to place the pointer
  const pointer = position - start;
  
  return { context: contextStr, pointer };
}

/**
 * Check for common JSON formatting issues and attempt to fix them
 */
function checkForCommonJsonIssues(data) {
  let modified = data;
  let issues = 0;
  
  // Check if it starts with a proper JSON character
  if (!/^\s*[\[\{]/.test(modified)) {
    console.warn('⚠️ JSON does not start with [ or { - might not be valid JSON');
    issues++;
  }
  
  // Check for trailing commas in arrays or objects (common mistake)
  const originalLength = modified.length;
  modified = modified.replace(/,(\s*\})/g, '$1').replace(/,(\s*\])/g, '$1');
  if (modified.length !== originalLength) {
    console.warn('⚠️ Fixed trailing commas in arrays or objects');
    issues++;
  }
  
  // Check for unquoted property names (common in JavaScript)
  const unquotedProps = /\{[\s\S]*?([a-zA-Z0-9_$]+)[\s\S]*?:/g;
  let match;
  while ((match = unquotedProps.exec(modified)) !== null) {
    // If the property isn't quoted
    if (modified[match.index + match[0].indexOf(match[1]) - 1] !== '"' && 
        modified[match.index + match[0].indexOf(match[1]) + match[1].length] !== '"') {
      console.warn(`⚠️ Found potentially unquoted property name: ${match[1]}`);
      issues++;
    }
  }
  
  // Check for multiple JSON objects without array wrapper
  if (/\}\s*\{/g.test(modified)) {
    console.warn('⚠️ Detected multiple JSON objects without array wrapper');
    console.warn('   This is not valid JSON. Each object needs to be separated by commas and wrapped in []');
    issues++;
  }
  
  return { dataClean: modified, issues };
}

/**
 * Splits text that contains multiple JSON objects into array of JSON strings
 */
function splitMultipleJsonObjects(data) {
  try {
    // More robust approach - balance brackets to find complete objects
    const objects = [];
    let startPos = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      
      // Handle string literals and escaping
      if (char === '\\' && !escapeNext) {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
      }
      
      escapeNext = false;
      
      // Only count brackets when not in a string
      if (!inString) {
        if (char === '{' || char === '[') {
          if (bracketCount === 0) {
            startPos = i; // Beginning of a new JSON object
          }
          bracketCount++;
        } else if (char === '}' || char === ']') {
          bracketCount--;
          
          // If we've closed all brackets, extract the object
          if (bracketCount === 0) {
            const objectStr = data.substring(startPos, i + 1);
            try {
              // Try to parse to ensure it's valid JSON
              JSON.parse(objectStr);
              objects.push(objectStr);
            } catch (e) {
              console.warn(`⚠️ Found invalid JSON object: ${e.message}`);
            }
          }
        }
      }
    }
    
    return objects;
  } catch (error) {
    console.error('Error splitting JSON objects:', error.message);
    return [];
  }
}

/**
 * Attempts to fix multiple JSON objects not in an array
 */
async function tryFixMultipleJsonObjects(data, filePath) {
  try {
    // Try to detect if this looks like multiple JSON objects
    const multiObjectPattern = /}\s*{/;
    if (multiObjectPattern.test(data)) {
      console.log('\nAttempting to fix multiple JSON objects...');
      
      const objects = splitMultipleJsonObjects(data);
      
      if (objects.length > 0) {
        console.log(`✅ Found ${objects.length} separate JSON objects`);
        
        const fixed = '[\n' + objects.join(',\n') + '\n]';
        const fixedPath = filePath.replace(/\.json$/, '.fixed.json');
        
        await fs.writeFile(fixedPath, fixed);
        console.log(`✅ Created a fixed version at ${fixedPath}`);
        
        // If the fixed JSON is valid, also update the original file
        try {
          JSON.parse(fixed); // Validate the fixed JSON
          
          // Create a backup of the original file
          const backupPath = filePath + '.bak';
          await fs.copyFile(filePath, backupPath);
          console.log(`✅ Created backup of original file at ${backupPath}`);
          
          // Update the original file
          await fs.writeFile(filePath, fixed);
          console.log(`✅ Updated the original file with the fixed JSON`);
          return true;
        } catch (e) {
          console.log('⚠️ The fixed JSON still has issues, please check the .fixed.json file manually');
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error trying to fix JSON:', error.message);
    return false;
  }
}

/**
 * Suggests fixes based on the error message
 */
async function suggestFixes(data, error, filePath) {
  const errorMessage = error.message || '';
  console.log('\n--- SUGGESTED FIXES ---');
  
  // Check for common JSON error patterns
  if (errorMessage.includes('Unexpected token')) {
    console.log('• This usually means there\'s a syntax error like a missing comma or bracket');
    console.log('• Check for missing commas between array items or object properties');
    console.log('• Make sure all strings are properly quoted with double quotes');
  }
  
  if (errorMessage.includes('Unexpected non-whitespace character after JSON')) {
    console.log('• You might have multiple JSON objects not properly formatted as an array');
    console.log('• Try wrapping your JSON with square brackets and separating objects with commas:');
    console.log('  [');
    console.log('    {...first object...},');
    console.log('    {...second object...}');
    console.log('  ]');
    
    // Attempt to fix multiple JSON objects
    const fixed = await tryFixMultipleJsonObjects(data, filePath);
    return fixed;
  }
  
  if (errorMessage.includes('Unexpected end of JSON input')) {
    console.log('• Your JSON is incomplete - check for missing closing brackets or braces');
    console.log('• Make sure all arrays [...] and objects {...] are properly closed');
  }
  
  return false;
}

/**
 * Validate a PJMixers JSON file
 */
async function validateJsonFile(filePath) {
  console.log(`\n=== Validating JSON file: ${filePath} ===`);
  
  try {
    // Check if the file exists
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    
    if (!exists) {
      console.error(`❌ File not found: ${filePath}`);
      return false;
    }
    
    // Read the JSON file
    console.log('✅ File found at:', filePath);
    const data = await fs.readFile(filePath, 'utf8');
    
    // Check file size
    const fileSizeBytes = Buffer.byteLength(data, 'utf8');
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    console.log(`📊 File size: ${fileSizeMB.toFixed(2)} MB (${fileSizeBytes.toLocaleString()} bytes)`);
    
    // Check for common JSON format issues before parsing
    let { dataClean, issues } = checkForCommonJsonIssues(data);
    
    // If we found issues, create a backup of the original file
    if (issues > 0) {
      const backupPath = filePath + '.bak';
      const backupExists = fsSync.existsSync(backupPath);
      
      if (!backupExists) {
        await fs.writeFile(backupPath, data);
        console.log(`✅ Created backup of original file at ${backupPath}`);
      }
    }
    
    // Try to parse the JSON
    let dataset;
    try {
      dataset = JSON.parse(dataClean);
      console.log('✅ JSON parsed successfully');
    } catch (error) {
      console.error('❌ Error parsing JSON:', error.message);
      
      // Extract the position from the error message
      const positionMatch = /position (\d+)/.exec(error.message);
      const lineColMatch = /line (\d+) column (\d+)/.exec(error.message);
      
      if (positionMatch) {
        const pos = parseInt(positionMatch[1]);
        const errorContext = getErrorContext(dataClean, pos);
        console.error('\nError context (showing 20 characters before and after error position):');
        console.error(errorContext.context);
        console.error(' '.repeat(Math.min(errorContext.pointer, 20)) + '^ Error around here');
      }
      
      if (lineColMatch) {
        const line = parseInt(lineColMatch[1]);
        const column = parseInt(lineColMatch[2]);
        
        // Get a few lines around the error
        const lines = dataClean.split('\n');
        const startLine = Math.max(0, line - 3);
        const endLine = Math.min(lines.length, line + 2);
        
        console.error('\nCode snippet around error:');
        for (let i = startLine; i < endLine; i++) {
          const lineNum = i + 1; // 1-based line numbers
          console.error(`${lineNum === line ? '>' : ' '} ${lineNum}: ${lines[i]}`);
          if (lineNum === line) {
            console.error(`   ${' '.repeat(column)}^ Error around here`);
          }
        }
      }
      
      // Try to suggest and apply fixes
      const fixed = await suggestFixes(data, error, filePath);
      return fixed;
    }
    
    // If we've reached this point, the JSON is valid
    // Check the dataset format
    if (Array.isArray(dataset)) {
      console.log('✅ Dataset is in array format with', dataset.length, 'items');
      
      // Check the first few items
      const sampleSize = Math.min(dataset.length, 3);
      for (let i = 0; i < sampleSize; i++) {
        const item = dataset[i];
        console.log(`\nSample ${i + 1}:`);
        checkItem(item);
      }
      
      // Check for valid conversations
      const validItems = dataset.filter(item => 
        item && item.conversations && Array.isArray(item.conversations) && item.conversations.length > 0
      );
      console.log(`✅ ${validItems.length} of ${dataset.length} items have valid conversations`);
      
      return true;
    } else if (dataset.conversations) {
      console.log('✅ Dataset is a single conversation object');
      checkItem(dataset);
      return true;
    } else {
      console.error('❌ Invalid dataset format - expected an array or object with "conversations" field');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking dataset:', error.message);
    return false;
  }
}

function checkItem(item) {
  // Check turn_prompt_hash
  if (item.turn_prompt_hash) {
    console.log('✅ turn_prompt_hash:', item.turn_prompt_hash);
  } else {
    console.log('⚠️ Missing turn_prompt_hash (will be auto-generated)');
    const contentToHash = JSON.stringify(item.conversations || {});
    const hash = crypto.createHash('sha256').update(contentToHash).digest('hex');
    console.log('  Generated hash would be:', hash);
  }
  
  // Check dataset_name
  console.log(item.dataset_name ? 
    `✅ dataset_name: ${item.dataset_name}` : 
    '⚠️ Missing dataset_name (optional)');
  
  // Check model_name
  console.log(item.model_name ? 
    `✅ model_name: ${item.model_name}` : 
    '⚠️ Missing model_name (optional)');
  
  // Check conversations
  if (Array.isArray(item.conversations)) {
    console.log(`✅ conversations: ${item.conversations.length} turns`);
    
    // Count by type
    const counts = item.conversations.reduce((acc, conv) => {
      acc[conv.from] = (acc[conv.from] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    // Check for think tags in gpt responses
    const gptResponses = item.conversations.filter(c => c.from === 'gpt');
    const withThink = gptResponses.filter(c => /<think>.*?<\/think>/s.test(c.value)).length;
    
    if (gptResponses.length > 0) {
      const percentage = Math.round((withThink / gptResponses.length) * 100);
      console.log(`  - ${withThink}/${gptResponses.length} (${percentage}%) gpt responses have <think> tags`);
    }
  } else {
    console.error('❌ Missing or invalid conversations array');
  }
}

// Main function
async function main() {
  console.log('=== AI Survey Dataset Check v2 ===');
  console.log('Node.js version:', process.version);
  
  // Ensure directory structure
  await ensureDirectories();
  
  // Check Parquet support
  const parquetOk = await checkParquetSupport();

  // Check for dataset locations
  const datasetFiles = await checkDatasetLocations();
  
  // Validate each dataset file found
  let validDatasets = 0;
  if (datasetFiles.length > 0) {
    console.log('\n=== Validating Dataset Files ===');
    for (const filePath of datasetFiles) {
      const isValid = await validateJsonFile(filePath);
      if (isValid) validDatasets++;
    }
  }
  
  console.log('\n=== Dataset Check Summary ===');
  console.log(`Dataset config: ${DATASET_NAME}`);
  console.log(`Format support:`);
  console.log(`- JSON: ✅ Available`);
  console.log(`- Parquet: ${parquetOk ? '✅ Available' : '❌ Not available'}`);
  console.log(`Data directories:`);
  console.log(`- Dataset: ${datasetDir}`);
  console.log(`- Ratings: ${ratingsDir}`);
  console.log(`Dataset files found: ${datasetFiles.length}`);
  console.log(`Valid datasets: ${validDatasets}`);
  
  if (datasetFiles.length === 0) {
    console.log('\n⚠️ No dataset files found. Please add a dataset file at one of these locations:');
    for (const path of datasetPaths) {
      console.log(`  - ${path}`);
    }
  }
  
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