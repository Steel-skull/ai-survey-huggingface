#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Tool to split large JSON datasets into smaller files
 * 
 * Usage:
 *   node split-dataset.js [options]
 * 
 * Options:
 *   --input       Input JSON file path (default: backend/data/dataset/pjmixers_dataset.json)
 *   --output-dir  Output directory for split files (default: backend/data/dataset/split)
 *   --chunk-size  Number of items per file (for array datasets) (default: 1000)
 *   --by-key      Split by root object keys (for object datasets) (default: false)
 *   --prefix      Output filename prefix (default: 'chunk')
 * 
 * Examples:
 *   Split by chunks:
 *     node split-dataset.js --chunk-size 500
 * 
 *   Split by object keys:
 *     node split-dataset.js --by-key
 * 
 *   Custom input and output:
 *     node split-dataset.js --input custom-data.json --output-dir ./split-data
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  input: 'backend/data/dataset/pjmixers_dataset.json',
  outputDir: 'backend/data/dataset/split',
  chunkSize: 1000,
  byKey: false,
  prefix: 'chunk'
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--input' && i + 1 < args.length) {
    options.input = args[++i];
  } else if (arg === '--output-dir' && i + 1 < args.length) {
    options.outputDir = args[++i];
  } else if (arg === '--chunk-size' && i + 1 < args.length) {
    options.chunkSize = parseInt(args[++i], 10);
  } else if (arg === '--by-key') {
    options.byKey = true;
  } else if (arg === '--prefix' && i + 1 < args.length) {
    options.prefix = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    console.log(fs.readFileSync(__filename, 'utf8').split('/**')[1].split('*/')[0]);
    process.exit(0);
  }
}

console.log('Splitting dataset with options:', options);

// Ensure the output directory exists
try {
  fs.mkdirSync(options.outputDir, { recursive: true });
  console.log(`Created output directory: ${options.outputDir}`);
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error('Error creating output directory:', err);
    process.exit(1);
  }
}

// Read and parse the JSON file
try {
  console.log(`Reading file: ${options.input}`);
  const data = JSON.parse(fs.readFileSync(options.input, 'utf8'));
  
  if (Array.isArray(data)) {
    splitArray(data, options);
  } else if (typeof data === 'object' && data !== null) {
    if (options.byKey) {
      splitByKeys(data, options);
    } else {
      console.log('Input is an object but --by-key not specified, treating as a single item array');
      splitArray([data], options);
    }
  } else {
    console.error('Input is not an array or object, cannot split');
    process.exit(1);
  }
} catch (err) {
  console.error('Error processing file:', err);
  process.exit(1);
}

/**
 * Split an array of items into multiple files
 */
function splitArray(array, options) {
  const totalItems = array.length;
  const totalChunks = Math.ceil(totalItems / options.chunkSize);
  
  console.log(`Splitting array with ${totalItems} items into ${totalChunks} chunks`);
  
  let processedItems = 0;
  let chunkIndex = 0;
  
  while (processedItems < totalItems) {
    const chunk = array.slice(processedItems, processedItems + options.chunkSize);
    const fileName = `${options.prefix}-${String(chunkIndex).padStart(5, '0')}.json`;
    const filePath = path.join(options.outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(chunk, null, 2));
    
    console.log(`Wrote ${chunk.length} items to ${filePath}`);
    
    processedItems += chunk.length;
    chunkIndex++;
  }
  
  console.log(`Successfully split dataset into ${chunkIndex} files`);
}

/**
 * Split an object by its keys into multiple files
 */
function splitByKeys(obj, options) {
  const keys = Object.keys(obj);
  console.log(`Splitting object with ${keys.length} keys`);
  
  keys.forEach(key => {
    const fileName = `${options.prefix}-${key}.json`;
    const filePath = path.join(options.outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(obj[key], null, 2));
    
    console.log(`Wrote key "${key}" to ${filePath}`);
  });
  
  console.log(`Successfully split object by ${keys.length} keys`);
}