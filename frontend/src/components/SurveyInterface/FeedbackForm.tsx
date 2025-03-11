import React from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText
} from '@chakra-ui/react';

export interface FeedbackFormProps {
  feedback: string;
  onChange: (feedback: string) => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ feedback, onChange }) => {
  return (
    <Box 
      p={5} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor="brand.border"
      bg="brand.darkCard"
      className="cyber-card"
    >
      <Heading 
        as="h3" 
        size="md" 
        mb={4} 
        color="brand.primary"
        className="neon-text"
      >
        Feedback (Optional)
      </Heading>
      
      <Text mb={4}>
        Please explain why you preferred one response over the other, or any other thoughts you'd like to share.
      </Text>
      
      <FormControl>
        <Textarea
          value={feedback}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your feedback here..."
          size="md"
          bg="brand.darkAlt"
          borderColor="brand.border"
          _hover={{ borderColor: "brand.primary" }}
          _focus={{ 
            borderColor: "brand.primary",
            boxShadow: "0 0 0 1px #FF00FF"
          }}
          minHeight="120px"
          className="neon-border"
          resize="vertical"
        />
        <FormHelperText opacity={0.7}>
          Your detailed feedback helps improve AI systems.
        </FormHelperText>
      </FormControl>
    </Box>
  );
};

export default FeedbackForm;