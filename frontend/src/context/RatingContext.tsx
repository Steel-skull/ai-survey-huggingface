import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  fetchSample, 
  submitRating, 
  fetchDatasetInfo, 
  fetchRatings,
  SampleData,
  Rating,
  downloadRatings
} from '../services/api';

// Define types for our context
interface RatingContextType {
  // Sample data state
  currentSample: SampleData | null;
  isLoading: boolean;
  
  // Ratings collection
  ratings: Rating[];
  
  // Current sample state
  currentIndex: number;
  totalSamples: number;
  datasetName: string;
  
  // Submission state
  isSubmitting: boolean;
  isComplete: boolean;
  hasStarted: boolean;
  
  // Actions
  rateGood: () => Promise<void>;
  rateBad: () => Promise<void>;
  skipSample: () => Promise<void>;
  downloadResults: () => Promise<string>;
  resetSurvey: () => void;
  startSurvey: () => void;
}

// Create the context with default values
const RatingContext = createContext<RatingContextType | undefined>(undefined);

// Provider component
export const RatingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Sample data state
  const [currentSample, setCurrentSample] = useState<SampleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Dataset info
  const [datasetName, setDatasetName] = useState<string>("");
  const [totalSamples, setTotalSamples] = useState<number>(0);
  // Limit to 50 samples per session
  const [sessionSampleLimit, setSessionSampleLimit] = useState<number>(50);
  // Track server-reported available samples
  const [serverTotalSamples, setServerTotalSamples] = useState<number | null>(null);
  
  // Current sample state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Ratings state
  const [ratings, setRatings] = useState<Rating[]>([]);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  // Survey start state
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  
  // Shuffled indices (to maintain the same order as the original app)
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  // Load dataset info when component mounts
  useEffect(() => {
    const initializeData = async () => {
      try {
        const info = await fetchDatasetInfo();
        setDatasetName(info.name);
        // Store actual total for reference
        const actualTotal = info.totalSamples;
        // Limit displayed total to either the actual total or 50, whichever is smaller
        setTotalSamples(Math.min(actualTotal, sessionSampleLimit));
        
        // Generate shuffled indices for all samples
        const allIndices = Array.from({ length: actualTotal }, (_, i) => i);
        // Shuffle the indices - Fisher-Yates algorithm
        for (let i = allIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }
        
        // Take only the first 50 (or fewer if dataset is smaller)
        const sessionIndices = allIndices.slice(0, sessionSampleLimit);
        setShuffledIndices(sessionIndices);
        
        // Load existing ratings
        const existingRatings = await fetchRatings();
        setRatings(existingRatings);
        
        // Filter out already rated samples
        // We need to load each sample to check if it's already rated
        // This is not the most efficient way but necessary as we store the hash
        // and don't have the mapping of indices to hashes
        let unratedIndex = 0;
        
        if (existingRatings.length > 0) {
          const ratedHashes = new Set(existingRatings.map(r => r.turn_prompt_hash));
          
          // Find the first unrated sample
          for (let i = 0; i < sessionIndices.length; i++) {
            const sampleIndex = sessionIndices[i];
            const sample = await fetchSample(sampleIndex);
            if (!ratedHashes.has(sample.turn_prompt_hash)) {
              unratedIndex = i;
              break;
            }
          }
        }
        
        loadSample(unratedIndex);
      } catch (error) {
        console.error('Error initializing survey:', error);
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

  // Load a new sample
  const loadSample = async (index: number) => {
    if (index >= totalSamples) {
      // If we've reached the session limit, mark as complete
      setIsComplete(true);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Get the actual index from our shuffled array
      const sampleIndex = shuffledIndices[index];
      const sample = await fetchSample(sampleIndex);
      setCurrentSample(sample);

      // If server reports a different total, sync with that
      if (sample.total_available && sample.total_available !== totalSamples) {
        console.log(`Syncing with server-reported sample count: ${sample.total_available}`);
        setServerTotalSamples(sample.total_available);
        // We don't update totalSamples to keep our UI consistent, but we'll use serverTotalSamples for validation
      }

      // Check if this is the last sample
      if (sample.is_last_sample) {
        console.log("Server indicates this is the last sample");
        setIsComplete(true);
      }
      
      // If this sample is already rated, skip to next
      if (ratings.some(r => r.turn_prompt_hash === sample.turn_prompt_hash)) {
        return skipSample();
      }

      // Make sure we don't exceed bounds
      const safeIndex = Math.min(index, serverTotalSamples ? serverTotalSamples - 1 : totalSamples - 1);
      setCurrentIndex(safeIndex);
    } catch (error) {
      console.error('Error loading sample:', error);
      // Recovery: if we hit an error, try loading the first sample
      if (index !== 0) {
        console.log("Attempting to recover by loading first sample");
        setTimeout(() => loadSample(0), 1000); // Add delay to avoid immediate retry
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to find the next unrated sample
  const checkAndLoadNextUnratedSample = async (startIndex: number) => {
    // Create set of rated hashes for fast lookup
    const ratedHashes = new Set(ratings.map(r => r.turn_prompt_hash));
    
    // Check each index starting from startIndex
    for (let i = startIndex; i < shuffledIndices.length; i++) {
      try {
        const sampleIndex = shuffledIndices[i];
        const sample = await fetchSample(sampleIndex);
        
        // If this sample hasn't been rated yet, load it
        if (!ratedHashes.has(sample.turn_prompt_hash)) {
          setCurrentSample(sample);
          setCurrentIndex(i);
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        console.error('Error checking sample:', error);
      }
    }
    
    // If we get here, all samples have been rated
    setIsComplete(true);
    setIsLoading(false);
    return false;
  };
  
  // Rate the current sample as "good"
  const rateGood = async () => {
    await rateSample(true);
  };

  // Rate the current sample as "bad"
  const rateBad = async () => {
    await rateSample(false);
  };

  // Common rating function
  const rateSample = async (isGood: boolean) => {
    if (!currentSample) return;
    
    setIsSubmitting(true);
    try {
      const rating: Rating = {
        turn_prompt_hash: currentSample.turn_prompt_hash,
        label: isGood,
        timestamp: new Date().toISOString()
      };
      
      await submitRating(rating);
      
      // Add to local ratings
      setRatings([...ratings, rating]);
      
      // Load next sample
      loadSample(currentIndex + 1);
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip the current sample
  const skipSample = async () => {
    // Ensure we stay within bounds
    const nextIndex = currentIndex + 1;
    const maxIndex = serverTotalSamples || totalSamples;
    
    if (nextIndex >= maxIndex) {
      setIsComplete(true);
      return;
    }
    
    await loadSample(nextIndex);
  };

  // Download results
  const downloadResults = async (): Promise<string> => {
    try {
      return await downloadRatings();
    } catch (error) {
      console.error('Error downloading ratings:', error);
      return '';
    }
  };

  // Reset the entire survey
  const resetSurvey = () => {
    setCurrentIndex(0);
    
    // Re-shuffle the indices to get a new set of 50 questions
    const refreshIndices = async () => {
      try {
        const info = await fetchDatasetInfo();
        const actualTotal = info.totalSamples;
        
        // Generate new shuffled indices
        const allIndices = Array.from({ length: actualTotal }, (_, i) => i);
        for (let i = allIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }
        
        // Take only the first 50
        const sessionIndices = allIndices.slice(0, sessionSampleLimit);
        setShuffledIndices(sessionIndices);
      } catch (error) {
        console.error('Error refreshing indices:', error);
      }
    };
    
    refreshIndices();
    setHasStarted(false);
    setIsComplete(false);
  };

  // Start the survey
  const startSurvey = () => {
    setHasStarted(true);
    loadSample(0);
  };

  // Context value
  const value: RatingContextType = {
    currentSample,
    isLoading,
    ratings,
    currentIndex,
    totalSamples,
    datasetName,
    isSubmitting,
    isComplete,
    hasStarted,
    rateGood,
    rateBad,
    skipSample,
    downloadResults,
    resetSurvey,
    startSurvey,
  };

  return (
    <RatingContext.Provider value={value}>
      {children}
    </RatingContext.Provider>
  );
};

// Custom hook to use the rating context
export const useRatings = (): RatingContextType => {
  const context = useContext(RatingContext);
  if (context === undefined) {
    throw new Error('useRatings must be used within a RatingProvider');
  }
  return context;
};