import React from 'react';
import { Box, Flex, Heading, Spacer, Text, useColorModeValue } from '@chakra-ui/react';
import LogoIcon from './LogoIcon';

const Header: React.FC = () => {
  return (
    <Box 
      as="header" 
      bg="brand.darkAlt" 
      px={4} 
      py={3} 
      boxShadow="0 0 10px rgba(0, 0, 0, 0.5)"
      borderBottom="1px solid"
      borderColor="brand.border"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex maxW="container.xl" mx="auto" align="center">
        <Flex align="center">
          <LogoIcon size="40px" />
          <Heading 
            size="md" 
            fontWeight="bold" 
            letterSpacing="wider" 
            ml={3}
            color="brand.primary"
            className="neon-text"
          >
            AI COMPARISON
          </Heading>
        </Flex>
        
        <Spacer />
        
        <Flex 
          align="center" 
          opacity={0.8}
          _hover={{ opacity: 1 }}
          transition="opacity 0.3s ease"
        >
          <Text 
            fontSize="sm" 
            color="brand.secondary" 
            mr={2}
            fontFamily="mono"
          >
            RATE &bull; COMPARE &bull; FEEDBACK
          </Text>
          <Box 
            w="10px" 
            h="10px" 
            borderRadius="full" 
            bg="brand.primary" 
            className="loading-pulse"
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;