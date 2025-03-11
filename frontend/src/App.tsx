import React from 'react';
import { Box, Container, VStack } from '@chakra-ui/react';
import Header from './components/Header/Header';
import LandingPage from './components/LandingPage/LandingPage';
import SurveyInterface from './components/SurveyInterface/SurveyInterface';
import { useRatings } from './context/RatingContext';

const App: React.FC = () => {
  const { isComplete, hasStarted } = useRatings();
  
  return (
    <Box minH="100vh" bg="brand.dark" className="circuit-bg">
      <Header />
      
      <Container maxW="container.xl" py={10}>
        <VStack spacing={10} align="stretch">
          {isComplete ? (
            <LandingPage showThanks={true} />
          ) : (
            hasStarted ? <SurveyInterface />
 : <LandingPage showThanks={false} />
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default App;