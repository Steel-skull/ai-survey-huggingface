const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

// Define the dataset name
// Using the same dataset name as in server.js for consistency
const DATASET_NAME = process.env.HF_DATASET_REPO || "PJMixers-Local-Dataset";
const SAFE_DATASET_NAME = DATASET_NAME.replace("/", "_");

// Helper to get user-specific file path
const getUserRatingsFilePath = (req) => {
  const userIp = req.ip || req.connection.remoteAddress;
  const fileHash = crypto.createHash('sha256').update(userIp).digest('hex');
  const fileName = `${fileHash}.json`;
  
  // Primary path that might have permission issues if dataset name contains special chars
  const primaryPath = path.join(__dirname, '../../data/ratings', SAFE_DATASET_NAME, fileName);
  
  // Check if the directory for the primary path exists and is writable
  try {
    return primaryPath;
  } catch (error) {
    return path.join(__dirname, '../../data/ratings', 'local_dataset', fileName);
  }
};

// Helper to read ratings from file
const getRatingsFromFile = async (req) => {
  try {
    const filePath = getUserRatingsFilePath(req);
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    
    if (!exists) {
      return [];
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading ratings file:', error);
    return [];
  }
};

// Helper to write ratings to file
const writeRatingsToFile = async (req, ratings) => {
  try {
    const filePath = getUserRatingsFilePath(req);
    const dataDir = path.dirname(filePath);
    
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (mkdirError) {
      console.error(`Error creating ratings directory: ${mkdirError.message}`);
      
      // Try fallback location with simple name
      const fallbackDir = path.join(__dirname, '../../data/ratings', 'local_dataset');
      const fallbackPath = path.join(fallbackDir, path.basename(filePath));
      await fs.mkdir(fallbackDir, { recursive: true }).catch(e => console.error(`Fallback directory error: ${e.message}`));
      await fs.writeFile(fallbackPath, JSON.stringify(ratings, null, 2));
      return true;
    }
    await fs.writeFile(filePath, JSON.stringify(ratings, null, 2)).catch(e => console.error(`File write error: ${e.message}`));
    
    return true;
  } catch (error) {
    console.error('Error writing ratings file:', error);
    return false;
  }
};

// GET all ratings for the current user
router.get('/', async (req, res) => {
  try {
    const ratings = await getRatingsFromFile(req);
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new rating
router.post('/', async (req, res) => {
  try {
    const ratings = await getRatingsFromFile(req);
    const { turn_prompt_hash, label } = req.body;
    
    if (!turn_prompt_hash || label === undefined) {
      return res.status(400).json({ error: 'Missing required fields (turn_prompt_hash, label)' });
    }
    
    // Check if this sample has already been rated
    const existingRatingIndex = ratings.findIndex(r => r.turn_prompt_hash === turn_prompt_hash);
    
    if (existingRatingIndex !== -1) {
      // Update existing rating
      ratings[existingRatingIndex].label = label;
      ratings[existingRatingIndex].timestamp = new Date().toISOString();
    } else {
      // Add new rating with timestamp
      const newRating = {
        turn_prompt_hash,
        label,
        timestamp: new Date().toISOString()
      };
      
      ratings.push(newRating);
    }
    
    if (await writeRatingsToFile(req, ratings)) {
      res.status(201).json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save rating' });
    }
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET ratings download (generates a downloadable file)
router.get('/download', async (req, res) => {
  try {
    const ratings = await getRatingsFromFile(req);
    const filePath = getUserRatingsFilePath(req);
    
    // If the file doesn't exist yet, create it
    const dirExists = fsSync.existsSync(path.dirname(filePath));
    
    if (!dirExists) {
      try {
        fsSync.mkdirSync(path.dirname(filePath), { recursive: true });
      } catch (mkdirError) {
        console.error(`Error creating download directory: ${mkdirError.message}`);
        // Use fallback directory
        const fallbackDir = path.join(__dirname, '../../data/ratings', 'local_dataset');
        fsSync.mkdirSync(fallbackDir, { recursive: true });
      }
    }
    
    if (!fsSync.existsSync(filePath)) {
      fsSync.writeFileSync(filePath, JSON.stringify(ratings, null, 2));
    }
    
    res.download(filePath, `ratings-${SAFE_DATASET_NAME}.json`, err => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download ratings file' });
      }
    });
  } catch (error) {
    console.error('Error generating download:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET endpoint to fetch user progress
router.get('/progress', async (req, res) => {
  try {
    const ratings = await getRatingsFromFile(req);
    res.json({
      completed: ratings.length,
      timestamp: ratings.length > 0 ? ratings[ratings.length - 1].timestamp : null
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoints for backward compatibility
router.post('/bulk', async (req, res) => {
  try {
    const ratings = await getRatingsFromFile(req);
    const newRatings = req.body;
    
    if (!Array.isArray(newRatings)) {
      return res.status(400).json({ error: 'Expected an array of ratings' });
    }
    
    // Add timestamp to each rating if not present
    const processedRatings = newRatings.map(rating => ({
      ...rating,
      timestamp: rating.timestamp || new Date().toISOString()
    }));
    
    // Merge with existing ratings, replacing any with the same turn_prompt_hash
    const updatedRatings = [...ratings];
    
    for (const newRating of processedRatings) {
      const index = updatedRatings.findIndex(r => r.turn_prompt_hash === newRating.turn_prompt_hash);
      if (index !== -1) {
        updatedRatings[index] = newRating;
      } else {
        updatedRatings.push(newRating);
      }
    }
    
    if (await writeRatingsToFile(req, updatedRatings)) {
      res.status(201).json({ success: true, count: processedRatings.length });
    } else {
      res.status(500).json({ error: 'Failed to save ratings' });
    }
  } catch (error) {
    console.error('Error saving bulk ratings:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;