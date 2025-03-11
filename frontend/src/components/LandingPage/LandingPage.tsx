import React from 'react';
import { 
  Box, 
  Button, 
  Center, 
  Heading, 
  Text, 
  VStack, 
  Container,
  Flex,
  useColorModeValue,
  Divider,
  Icon
} from '@chakra-ui/react';
import { ArrowForwardIcon, StarIcon } from '@chakra-ui/icons';
import { useRatings } from '../../context/RatingContext';
import MarkdownRenderer from '../SurveyInterface/MarkdownRenderer';

interface LandingPageProps {
  showThanks?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ showThanks = false }) => {
  const { resetSurvey, startSurvey } = useRatings();
  
  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={12} align="stretch">
        {/* Hero Section */}
        <Box 
          p={10} 
          borderRadius="xl" 
          borderWidth="1px" 
          borderColor="brand.border"
          bg="brand.darkCard"
          boxShadow="lg"
          position="relative"
          overflow="hidden"
          className="cyber-card"
        >
          {/* Circuit background */}
          <Box 
            position="absolute"
            inset={0}
            opacity={0.05}
            pointerEvents="none"
            className="circuit-bg"
          />
          
          <VStack spacing={6} align="center" zIndex={1} position="relative">
            {/* Content based on whether showing thanks or initial landing */}
            {showThanks ? (
              <>
                <Heading 
                  size="xl" 
                  textAlign="center"
                  className="neon-text"
                  color="brand.primary"
                >
                  Thank You For Your Feedback!
                </Heading>
                
                <Flex justify="center" mt={4}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon 
                      key={star} 
                      as={StarIcon} 
                      w={8} 
                      h={8} 
                      color="brand.primary" 
                      m={1}
                      className="neon-text" 
                    />
                  ))}
                </Flex>
                
                <Text fontSize="lg" textAlign="center" opacity={0.9}>
                  Your feedback helps improve AI systems. Your ratings have been successfully submitted.
                </Text>
                
                <Button 
                  rightIcon={<ArrowForwardIcon />}
                  onClick={resetSurvey}
                  size="lg"
                  mt={4}
                  className="neon-button"
                >
                  Start New Survey
                </Button>
              </>
            ) : (
              <>
                <Heading 
                  size="xl" 
                  textAlign="center"
                  className="neon-text"
                  color="brand.primary"
                >
                  (SFW/NSFW) RP User Preference Survey
                </Heading>
                
                <Box textAlign="left" width="100%">
                  <MarkdownRenderer content={`
In this survey, you will be presented with a system turn, conversation history, and a QwQ generation continuing that conversation.
You must then rate if the QwQ output is good or bad.

**You are only rating the QwQ generation, and its thoughts.**

If the conversation history is very bad, but the QwQ generation is good, it is a good sample.
Please read each sample carefully and decide whether you think it is **good** or **bad** in ***your opinion***.

Apart from the rating being your own opinion, I would appreciate you marking *any refusals as **bad***.

**Rating:**

- **👍 Thumbs Up (Good):**  If you think the sample is generally good, coherent, relevant, and of high quality.
- **👎 Thumbs Down (Bad):** If you find the sample to be poor, incoherent, irrelevant, or low quality.
- **Skip:** If you are unsure or don't want to rate the current sample.
                  `} />
                </Box>
                
                <Button 
                  rightIcon={<ArrowForwardIcon />}
                  onClick={showThanks ? resetSurvey : startSurvey}
                  size="lg"
                  mt={6}
                  className="neon-button"
                >
                  Agree and Start
                </Button>
              </>
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default LandingPage;