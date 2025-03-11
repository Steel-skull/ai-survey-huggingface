#!/usr/bin/env node

/**
 * Health check script for the AI Survey application
 * This script can be used by Docker health checks to ensure the service is running
 */

const http = require('http');

// The port the application is running on
const port = process.env.PORT || 3001;

// Perform a health check request to the API
const checkApi = () => {
  return new Promise((resolve, reject) => {
    const options = {
      host: 'localhost',
      port: port,
      path: '/api',
      timeout: 2000
    };

    const req = http.get(options, (res) => {
      if (res.statusCode === 200) {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response && response.message === 'Survey API is running') {
              resolve(true);
            } else {
              resolve(false);
            }
          } catch (e) {
            resolve(false);
          }
        });
      } else {
        resolve(false);
      }
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.abort();
      resolve(false);
    });
  });
};

// Check if the frontend assets are being served
const checkFrontend = () => {
  return new Promise((resolve, reject) => {
    const options = {
      host: 'localhost',
      port: port,
      path: '/',
      timeout: 2000
    };

    const req = http.get(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.abort();
      resolve(false);
    });
  });
};

// Run both checks and exit with appropriate code
async function runHealthCheck() {
  try {
    const [apiHealthy, frontendHealthy] = await Promise.all([
      checkApi(),
      checkFrontend()
    ]);

    if (apiHealthy && frontendHealthy) {
      console.log('Health check passed: Both API and frontend are operational');
      process.exit(0); // Successful exit
    } else {
      console.error(`Health check failed: API: ${apiHealthy}, Frontend: ${frontendHealthy}`);
      process.exit(1); // Failed exit
    }
  } catch (error) {
    console.error('Health check error:', error);
    process.exit(1); // Failed exit
  }
}

// Run the health check
runHealthCheck();