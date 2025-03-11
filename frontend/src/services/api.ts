// API service for communicating with the FastAPI backend

// Constants
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://127.0.0.1:3001/api';

// Types
export interface Conversation {
  from: string;
  value: string;
  name?: string;
}

export interface SampleData {
  turn_prompt_hash: string;
  dataset_name?: string;
  model_name?: string;
  generation_settings?: string;
  conversations: Conversation[];
  // New metadata from backend
  total_available?: number;
  is_last_sample?: boolean;
}

export interface Rating {
  turn_prompt_hash: string;
  label: boolean;
  timestamp?: string;
}

export interface DatasetInfo {
  name: string;
  totalSamples: number;
}

/**
 * Fetches dataset info from the backend
 * 
 * @returns Promise with dataset metadata
 */
export const fetchDatasetInfo = async (): Promise<DatasetInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dataset/info`);
    if (!response.ok) {
      throw new Error(`Error fetching dataset info: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching dataset info:', error);
    // Fallback in case the API fails
    return { 
      name: "Sample Dataset",
      totalSamples: 10
    };
  }
};

/**
 * Fetches a conversation sample from the backend
 * 
 * @param index The index of the sample to fetch
 * @returns Promise with the sample data
 */
export const fetchSample = async (index: number): Promise<SampleData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/samples/${index}`);
    if (!response.ok) {
      console.warn(`Warning when fetching sample ${index}: ${response.statusText}`);
      // Instead of throwing an error, we'll try again with index 0
      // This helps recover from out-of-range errors
      if (response.status === 400) {
        console.log("Recovering from index error by fetching first sample");
        const recoveryResponse = await fetch(`${API_BASE_URL}/samples/0`);
        if (recoveryResponse.ok) {
          return await recoveryResponse.json();
        }
      }
      // If recovery failed or it was another type of error, then throw
      throw new Error(`Error fetching sample: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching sample:', error);
    // Fallback to sample data if API fails
    return {
      ...sampleFallbackData,
      is_last_sample: true // Indicate this is a fallback
    };
  }
};

/**
 * Submits a rating to the backend
 * 
 * @param rating The rating object to submit
 * @returns Promise with the API response
 */
export const submitRating = async (rating: Rating): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rating),
    });
    
    if (!response.ok) {
      throw new Error(`Error submitting rating: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting rating:', error);
    throw error;
  }
};

/**
 * Fetches all ratings for the current user
 * 
 * @returns Promise with an array of ratings
 */
export const fetchRatings = async (): Promise<Rating[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ratings`);
    if (!response.ok) {
      throw new Error(`Error fetching ratings: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return [];
  }
};

/**
 * Generates a downloadable file of the user's ratings
 * 
 * @returns Promise with the download URL
 */
export const downloadRatings = async (): Promise<string> => {
  try {
    // For downloadable content, we'll return the direct API URL
    // The browser will handle the file download when this URL is accessed
    return `${API_BASE_URL}/ratings/download`;
  } catch (error) {
    console.error('Error downloading ratings:', error);
    throw error;
  }
};

/**
 * Fetches user progress information
 * 
 * @returns Promise with progress data
 */
export const fetchProgress = async (): Promise<{completed: number, timestamp?: string}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ratings/progress`);
    if (!response.ok) {
      throw new Error(`Error fetching progress: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching progress:', error);
    return { completed: 0 };
  }
};

// Fallback sample data in case the API fails
const sampleFallbackData: SampleData = {
  turn_prompt_hash: "sample-123",
  dataset_name: "sample_dataset",
  model_name: "QwQ",
  conversations: [
    {
      from: "system",
      value: "You are a helpful AI assistant."
    },
    {
      from: "human",
      value: "Explain quantum computing in simple terms."
    },
    {
      from: "gpt",
      value: "<think>I'll explain quantum computing by comparing it to classical computing and using simple analogies.</think>Quantum computing uses quantum bits or 'qubits' that can exist in multiple states simultaneously, unlike classical bits (0 or 1). This property called 'superposition' allows quantum computers to process vast amounts of information simultaneously. While classical computers calculate sequentially, quantum computers can explore multiple possibilities at once, making them potentially much faster for certain problems like encryption, complex simulations, and optimization problems. Think of it like checking every path in a maze at the same time instead of one by one."
    }
  ]
};