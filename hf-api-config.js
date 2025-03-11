#!/usr/bin/env node

/**
 * This script modifies the API base URL for HuggingFace Spaces deployment
 * Run this script after building the frontend to update the API URLs
 */

const fs = require('fs');
const path = require('path');

// Path to the built index.html file
const indexPath = path.join(__dirname, 'backend', 'frontend', 'dist', 'index.html');

// Update the API_BASE_URL to work in HuggingFace Spaces
async function updateApiConfig() {
  try {
    // Check if the file exists
    if (!fs.existsSync(indexPath)) {
      console.error('Error: index.html not found at path:', indexPath);
      return;
    }

    // Read the HTML file
    let htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Replace API URL configuration to use relative URLs
    // This will work regardless of the HuggingFace Space URL
    htmlContent = htmlContent.replace(
      /const API_BASE_URL = .*?;/g,
      'const API_BASE_URL = "/api";'
    );

    // Write the modified content back
    fs.writeFileSync(indexPath, htmlContent);
    
    console.log('Successfully updated API configuration for HuggingFace Spaces deployment');
  } catch (error) {
    console.error('Error updating API configuration:', error);
  }
}

// Run the update function
updateApiConfig();