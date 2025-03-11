import React from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  Button, 
  VStack, 
  HStack,
  useColorModeValue,
  Skeleton
} from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';

export interface ResponseCardProps {
  title: string;
  content: string;
  rating: number;
  onRatingChange: (rating: number) => void;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

const ResponseCard: React.FC<ResponseCardProps> = ({
  title,
  content,
  rating,
  onRatingChange,
  isLoading,
  isSelected,
  onSelect
}) => {
  // Custom styling for the selected card
  const borderColor = isSelected ? "brand.primary" : "brand.border";
  const bgColor = isSelected ? "rgba(255, 0, 255, 0.1)" : "brand.darkCard";
  const boxShadow = isSelected ? "0 0 15px rgba(255, 0, 255, 0.5)" : "none";
  
  return (
    <Box 
      flex="1" 
      p={5} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor={borderColor}
      bg={bgColor}
      boxShadow={boxShadow}
      transition="all 0.3s ease"
      className={isSelected ? "neon-border cyber-card" : "cyber-card"}
      _hover={{
        boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
      }}
    >
      {/* Card header */}
      <Flex 
        justifyContent="space-between" 
        alignItems="center" 
        mb={4}
      >
        <Heading 
          size="md" 
          color={isSelected ? "brand.primary" : "white"}
          className={isSelected ? "neon-text" : ""}
        >
          {title}
        </Heading>
        
        <Button
          size="sm"
          variant={isSelected ? "solid" : "outline"}
          onClick={onSelect}
          className="neon-button"
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </Flex>
      
      {/* Card content */}
      <Box 
        minHeight="200px" 
        bg="brand.darkAlt" 
        p={4} 
        borderRadius="md" 
        mb={4}
        position="relative"
        overflow="auto"
      >
        <Skeleton isLoaded={!isLoading} fadeDuration={1} height="100%">
          <Text 
            whiteSpace="pre-wrap" 
            fontSize="sm"
          >
            {content}
          </Text>
        </Skeleton>
        
        {/* Circuit pattern overlay */}
        <Box 
          position="absolute"
          inset={0}
          opacity={0.03}
          pointerEvents="none"
          bgImage="linear-gradient(to right, rgba(255, 0, 255, 0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 0, 255, 0.8) 1px, transparent 1px)"
          bgSize="20px 20px"
        />
      </Box>
      
      {/* Rating stars */}
      <HStack spacing={2} justify="center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Box 
            key={star}
            as="button"
            aria-label={`Rate ${star} stars`}
            onClick={() => onRatingChange(star)}
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              transform: "scale(1.2)",
            }}
          >
            <StarIcon 
              w={6} 
              h={6} 
              color={star <= rating ? "brand.primary" : "gray.600"}
              className={star <= rating ? "neon-text" : ""}
            />
          </Box>
        ))}
      </HStack>
      
      <Text 
        textAlign="center" 
        mt={1} 
        fontSize="sm" 
        color={rating ? "brand.primary" : "gray.500"}
        className={rating ? "neon-text" : ""}
      >
        {rating ? `${rating}/5 Stars` : "Rate this response"}
      </Text>
    </Box>
  );
};

export default ResponseCard;