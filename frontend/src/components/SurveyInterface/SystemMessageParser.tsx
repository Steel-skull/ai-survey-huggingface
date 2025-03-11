import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Text, 
  Heading, 
  HStack,
  VStack,
  Badge,
  Divider,
  Button,
  Collapse
} from '@chakra-ui/react';
import DOMPurify from 'dompurify';

interface SystemMessageParserProps {
  systemMessage: string;
}

const SystemMessageParser: React.FC<SystemMessageParserProps> = ({ systemMessage }) => {
  const [tags, setTags] = useState<string[]>([]);
  const [parsedSystemMessage, setParsedSystemMessage] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (!systemMessage) return;

    // Extract the raw system message from HTML
    const div = document.createElement('div');
    div.innerHTML = systemMessage;
    const rawSystemMessage = div.textContent || '';

    // Parse tags
    const tagsMatch = rawSystemMessage.match(/Tags: \(([^)]+)\)/);
    if (tagsMatch && tagsMatch[1]) {
      const tagsList = tagsMatch[1].split(';').map(tag => tag.trim());
      setTags(tagsList);
    }

    // Process the system message
    let processedMessage = rawSystemMessage;
    
    // Remove the tags section if it exists
    if (tagsMatch) {
      processedMessage = processedMessage.replace(tagsMatch[0], '').trim();
    }
    
    // Format the message for display
    processedMessage = formatSystemMessage(processedMessage);
    setParsedSystemMessage(processedMessage);
  }, [systemMessage]);

  // Format the system message with proper HTML
  const formatSystemMessage = (message: string): string => {
    // Replace double asterisks with bold tags
    let formatted = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formatted;
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Box
      className="system-box"
      mb={6}
      p={4}
      borderRadius="md"
      bg="brand.darkCard"
      border="1px solid"
      borderColor="brand.border"
    >
      <VStack spacing={4} align="stretch">
        <Heading as="h3" size="md" className="neon-text">System Message</Heading>
        
        {/* Tags Section */}
        {tags.length > 0 && (
          <Box>
            <Heading as="h4" size="sm" mb={2}>Tags:</Heading>
            <HStack spacing={2} flexWrap="wrap">
              {tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  colorScheme="purple" 
                  borderRadius="full" 
                  px={2} 
                  py={1}
                  variant="solid"
                >
                  {tag}
                </Badge>
              ))}
            </HStack>
          </Box>
        )}
        
        {/* Toggle Button */}
        <Button 
          onClick={toggleExpand} 
          variant="outline" 
          colorScheme="purple"
          size="sm"
          width="fit-content"
          borderRadius="md"
          className="neon-button"
        >
          {isExpanded ? "Hide System Prompt" : "Show System Prompt"}
        </Button>
        
        <Divider borderColor="brand.border" />
        
        {/* System Message Content - Collapsible */}
        <Collapse in={isExpanded} animateOpacity>
          <Box
            whiteSpace="pre-wrap"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(`<div class="system-message-content">${parsedSystemMessage}</div>`) 
            }}
            sx={{
              '.system-message-content': {
                p: 2,
                borderRadius: 'md',
                bg: 'rgba(0, 0, 0, 0.2)',
                whiteSpace: 'pre-line'
              }
            }}
          />
        </Collapse>
      </VStack>
    </Box>
  );
};

export default SystemMessageParser;