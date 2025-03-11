import React from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Heading,
  Divider,
  Tooltip
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

export interface RatingControlsProps {
  modelARating: number;
  modelBRating: number;
  preferredModel: 'A' | 'B' | null;
  onModelAChange: (rating: number) => void;
  onModelBChange: (rating: number) => void;
  onPreferredModelChange: (model: 'A' | 'B' | null) => void;
}

const RatingControls: React.FC<RatingControlsProps> = ({
  modelARating,
  modelBRating,
  preferredModel,
  onModelAChange,
  onModelBChange,
  onPreferredModelChange
}) => {
  // Helper to determine if the user can select a preferred model
  const canSelectPreference = modelARating > 0 && modelBRating > 0;
  
  // Custom styling for selected buttons
  const getButtonStyle = (model: 'A' | 'B' | null) => {
    const isSelected = preferredModel === model;
    return {
      bg: isSelected ? 'brand.primary' : 'transparent',
      color: isSelected ? 'white' : 'gray.300',
      borderColor: isSelected ? 'brand.primary' : 'brand.border',
      _hover: {
        bg: isSelected ? 'brand.primary' : 'rgba(255, 0, 255, 0.1)',
        boxShadow: isSelected ? '0 0 15px rgba(255, 0, 255, 0.5)' : '0 0 10px rgba(255, 0, 255, 0.3)',
      }
    };
  };
  
  return (
    <Box 
      p={5} 
      borderRadius="lg" 
      bg="brand.darkCard"
      borderWidth="1px" 
      borderColor="brand.border"
      className="cyber-card"
    >
      <Heading 
        as="h3" 
        size="md" 
        mb={4} 
        color="brand.primary"
        className="neon-text"
      >
        Overall Preference
      </Heading>
      
      <Text mb={4}>
        Which response do you prefer overall? Select one:
      </Text>
      
      {/* Preference selection buttons */}
      <HStack spacing={4} justify="center" mb={4}>
        <Tooltip 
          label={!canSelectPreference ? "Please rate both responses first" : "Select Model A as preferred"} 
          placement="top"
        >
          <Button
            flex="1"
            py={6}
            variant="outline"
            isDisabled={!canSelectPreference}
            onClick={() => onPreferredModelChange('A')}
            className="neon-button"
            {...getButtonStyle('A')}
          >
            <VStack>
              <Text>Model A</Text>
              {preferredModel === 'A' && (
                <CheckCircleIcon color="white" />
              )}
            </VStack>
          </Button>
        </Tooltip>
        
        <Tooltip 
          label={!canSelectPreference ? "Please rate both responses first" : "Both are equally good/bad"} 
          placement="top"
        >
          <Button
            flex="1"
            py={6}
            variant="outline"
            isDisabled={!canSelectPreference}
            onClick={() => onPreferredModelChange(null)}
            className="neon-button"
            {...getButtonStyle(null)}
          >
            <VStack>
              <Text>Tie</Text>
              {preferredModel === null && canSelectPreference && (
                <CheckCircleIcon color="white" />
              )}
            </VStack>
          </Button>
        </Tooltip>
        
        <Tooltip 
          label={!canSelectPreference ? "Please rate both responses first" : "Select Model B as preferred"} 
          placement="top"
        >
          <Button
            flex="1"
            py={6}
            variant="outline"
            isDisabled={!canSelectPreference}
            onClick={() => onPreferredModelChange('B')}
            className="neon-button"
            {...getButtonStyle('B')}
          >
            <VStack>
              <Text>Model B</Text>
              {preferredModel === 'B' && (
                <CheckCircleIcon color="white" />
              )}
            </VStack>
          </Button>
        </Tooltip>
      </HStack>
      
      {/* Current selections summary */}
      <Box p={3} bg="brand.darkAlt" borderRadius="md">
        <HStack spacing={4} justify="space-around">
          <VStack>
            <Text fontWeight="bold">Model A Rating</Text>
            <Text 
              fontSize="xl" 
              color={modelARating > 0 ? "brand.primary" : "gray.500"}
              className={modelARating > 0 ? "neon-text" : ""}
            >
              {modelARating > 0 ? `${modelARating}/5` : "Not Rated"}
            </Text>
          </VStack>
          
          <Divider orientation="vertical" height="50px" />
          
          <VStack>
            <Text fontWeight="bold">Preference</Text>
            <Text 
              fontSize="xl" 
              color="brand.primary"
              className="neon-text"
            >
              {!canSelectPreference 
                ? "Rate Both First" 
                : preferredModel === null 
                  ? "Tie" 
                  : `Model ${preferredModel}`}
            </Text>
          </VStack>
          
          <Divider orientation="vertical" height="50px" />
          
          <VStack>
            <Text fontWeight="bold">Model B Rating</Text>
            <Text 
              fontSize="xl" 
              color={modelBRating > 0 ? "brand.primary" : "gray.500"}
              className={modelBRating > 0 ? "neon-text" : ""}
            >
              {modelBRating > 0 ? `${modelBRating}/5` : "Not Rated"}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </Box>
  );
};

export default RatingControls;