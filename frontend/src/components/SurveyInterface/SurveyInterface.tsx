import React from 'react';
import '../../styles/messageColors.css';
import { 
  Box, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Button, 
  Progress,
  useToast,
  Flex,
  Spinner,
  Divider,
  ButtonGroup,
  Icon,
} from '@chakra-ui/react';
import { FaThumbsUp, FaThumbsDown, FaStepForward, FaFileDownload } from 'react-icons/fa';
import { useRatings } from '../../context/RatingContext';
import DOMPurify from 'dompurify';
import SystemMessageParser from './SystemMessageParser';
import MarkdownRenderer from './MarkdownRenderer';
import { Conversation } from '../../services/api';

interface SurveyInterfaceProps {
  onComplete?: () => void;
}

const SurveyInterface: React.FC<SurveyInterfaceProps> = ({ onComplete }) => {
  const toast = useToast();
  
  // Use our RatingContext
  const {
    currentSample,
    isLoading,
    currentIndex,
    totalSamples,
    datasetName,
    isSubmitting,
    isComplete,
    rateGood,
    rateBad,
    skipSample,
    downloadResults,
  } = useRatings();
  
  // State for formatted HTML
  const [systemMessage, setSystemMessage] = React.useState('');
  const [messages, setMessages] = React.useState<{
    type: 'human' | 'gpt' | 'think' | 'post-think';
    content: string;
    name?: string;
    key: string;
  }[]>([]);
  
  
  // Process conversations whenever the current sample changes
  React.useEffect(() => {
    if (currentSample) {
      processConversations(currentSample.conversations);
    }
  }, [currentSample]);
  
  // Download ratings handler
  const handleDownloadRatings = async () => {
    try {
      const fileUrl = await downloadResults();
      
      // Create temporary link element to trigger download
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = `ratings-${datasetName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: 'Ratings downloaded',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error downloading ratings:', error);
      toast({
        title: 'Error downloading ratings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handler for good rating button
  const handleRateGood = async () => {
    try {
      await rateGood();
      toast({
        title: 'Rating submitted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      if (isComplete && onComplete) {
        onComplete();
        toast({
          title: 'Survey complete!',
          description: 'You have rated all samples.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error submitting rating',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handler for bad rating button
  const handleRateBad = async () => {
    try {
      await rateBad();
      toast({
        title: 'Rating submitted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      if (isComplete && onComplete) {
        onComplete();
        toast({
          title: 'Survey complete!',
          description: 'You have rated all samples.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error submitting rating',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Handler for skip button
  const handleSkip = async () => {
    try {
      await skipSample();
      
      if (isComplete) {
        toast({
          title: 'No more samples',
          description: 'You have reached the end of the survey.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error('Error skipping sample:', error);
    }
  };
  
  // Process conversations to format as HTML (same logic as in the original Gradio app)
  const processConversations = (conversations: Conversation[]) => {
    const newMessages: { type: 'human' | 'gpt' | 'think' | 'post-think'; content: string; name?: string; key: string }[] = [];
    let systemMessageBox = '';
    
    for (const turn of conversations || []) {
      let turnValue = turn.value.trim();
      
      // Process <think> tags
      const thinkMatch = /<think>(.*?)<\/think>/s.exec(turnValue);
      if (thinkMatch) {
        const thinkContent = thinkMatch[1].trim();
        newMessages.push({
          type: 'think',
          content: `**__QwQ Thoughts__**\n\n${thinkContent}`,
          key: `think-${newMessages.length}`
        });
        turnValue = turnValue.replace(/<think>.*?<\/think>/s, '').trim();
      }
      
      // Process post-think content
      if (thinkMatch && turnValue) {
        newMessages.push({
          type: 'post-think',
          content: `**__QwQ Response__**\n\n${turnValue}`,
          key: `post-think-${newMessages.length}`
        });
        turnValue = '';
      }
      
      // Format based on sender
      if (turn.from === 'system') {
        systemMessageBox += `
<div class="system-message-box">
<div class="system-message-content"><b><u>System</u></b>\n${turnValue}</div>
</div>`;
      } else if (turn.from === 'human') {
        if (turnValue) {
          newMessages.push({ type: 'human', content: `**__User__**\n\n${turnValue}`, key: `human-${newMessages.length}` });
        }
      } else if (turn.from === 'gpt') {
        if (turnValue) {
          newMessages.push({ type: 'gpt', content: `**__Assistant__**\n\n${turnValue}`, key: `gpt-${newMessages.length}` });
        }
      } else if (turn.from === 'human-chat') {
        if (turnValue) {
          newMessages.push({ type: 'human', content: `**__User__**\n\n${turn.name?.trim()}: ${turnValue}`, name: turn.name, key: `human-chat-${newMessages.length}` });
        }
      } else if (turn.from === 'gpt-chat') {
        if (turnValue) {
          newMessages.push({ type: 'gpt', content: `**__Assistant__**\n\n${turn.name?.trim()}: ${turnValue}`, name: turn.name, key: `gpt-chat-${newMessages.length}` });
        }
      }
    }
    
    setSystemMessage(systemMessageBox);
    setMessages(newMessages);
  };
  
  return (
    <Box 
      width="100%" 
      maxWidth="900px" 
      mx="auto"
      px={4}
      className="skull-theme-container"
      sx={{
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, brand.primary, transparent)',
          zIndex: 1,
        }
      }}
    >
      {/* Progress bar */}
      <Box mb={8} mt={4}>
        <HStack justify="space-between" mb={3}>
          <Text 
            fontWeight="bold" 
            textShadow="0 0 5px brand.primary" 
            color="brand.lightText"
            letterSpacing="1px"
          >
            Sample {currentIndex + 1} of {totalSamples}
          </Text>
          <Text 
            fontWeight="bold" 
            textShadow="0 0 5px brand.primary" 
            color="brand.lightText"
            letterSpacing="1px"
          >
            {Math.round(((currentIndex + 1) / totalSamples) * 100)}% Complete
          </Text>
        </HStack>
        <Progress 
          value={((currentIndex + 1) / totalSamples) * 100} 
          size="sm"
          sx={{
            '& > div': {
              background: 'brand.primary',
              boxShadow: '0 0 10px brand.primary',
            }
          }}
          borderRadius="md"
          bg="brand.darkAlt"
          height="8px"
        />
      </Box>
      
      {isLoading ? (
        <Flex 
          justify="center" 
          align="center" 
          height="400px"
          bg="rgba(0,0,0,0.2)"
          borderRadius="md"
          border="1px solid"
          borderColor="brand.border"
        >
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="brand.darkAlt"
            color="brand.primary"
            size="xl"
          />
        </Flex>
      ) : (
        <>
          {/* System message */}
          {systemMessage && <SystemMessageParser systemMessage={systemMessage} />}
          
          {/* Chat container */}
          <Box
            className="chat-box"
            mb={6}
            width="100%" 
            borderRadius="md"
            bg="brand.darkAlt" 
            border="2px solid"
            borderColor="brand.border"
            overflow="visible" 
            boxShadow="0 0 15px rgba(0, 229, 255, 0.15)"
            position="relative"
            sx={{
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '-1px',
                left: '10%',
                right: '10%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, brand.primary, transparent)',
              }
            }}
          >
            <Box className="chat-container" p={4}>
              {messages.map((message) => (
                <Box 
                  key={message.key} 
                  className={`${message.type}-message`}
                >
                  <Box 
                    className={
                      message.type === 'think' 
                        ? 'think-content' 
                        : message.type === 'post-think' 
                          ? 'post-think-content' 
                          : 'message-content'
                    }
                  >
                    <MarkdownRenderer content={message.content} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
          
          {/* Rating buttons */}
          <Box 
            className="rating-container"
            py={6}
            mt={2}
            borderTop="1px solid" 
            borderColor="brand.border"
            borderRadius="md" 
            bg="brand.darkAlt" 
            backdropFilter="blur(10px)" 
            boxShadow="0 0 15px rgba(0, 229, 255, 0.1)"
          >
            <Heading 
              as="h3" 
              size="md" 
              mb={5}
              textAlign="center" 
              color="brand.primary" 
              textShadow="0 0 8px rgba(0, 229, 255, 0.5)" 
              letterSpacing="1px"
            >
              RATE THIS QwQ OUTPUT
            </Heading>
            
            <ButtonGroup spacing={5} width="100%" justifyContent="center">
              <Button
                leftIcon={<Icon as={FaThumbsUp} />}
                onClick={handleRateGood}
                isLoading={isSubmitting}
                loadingText="Submitting"
                size="lg"
                px={8}
                bg="brand.primary"
                color="brand.dark"
                fontWeight="bold"
                _hover={{ 
                  transform: 'translateY(-2px)', 
                  boxShadow: '0 0 15px rgba(0, 229, 255, 0.6)' 
                }}
                boxShadow="0 0 10px rgba(0, 229, 255, 0.3)"
              >
                Good
              </Button>
              
              <Button
                leftIcon={<Icon as={FaThumbsDown} />}
                onClick={handleRateBad}
                isLoading={isSubmitting}
                loadingText="Submitting"
                size="lg"
                px={8}
                bg="brand.error"
                color="white"
                fontWeight="bold"
                _hover={{ 
                  transform: 'translateY(-2px)', 
                  boxShadow: '0 0 15px rgba(255, 61, 61, 0.6)' 
                }}
                boxShadow="0 0 10px rgba(255, 61, 61, 0.3)"
              >
                Bad
              </Button>
              
              <Button
                leftIcon={<Icon as={FaStepForward} />}
                onClick={handleSkip}
                isDisabled={isSubmitting}
                size="lg"
                variant="outline"
                borderColor="brand.border"
                borderWidth="2px"
                color="brand.lightText"
                _hover={{ 
                  borderColor: 'brand.primary',
                  boxShadow: '0 0 10px rgba(0, 229, 255, 0.3)' 
                }}
              >
                Skip
              </Button>
            </ButtonGroup>
          </Box>
          
          <Divider 
            my={6} 
            borderColor="brand.border" 
            opacity={0.6}
            sx={{
              background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.3), transparent)'
            }}
          />
          
          {/* Download button */}
          <Box textAlign="center" mt={4} mb={8}>
            <Button
              leftIcon={<Icon as={FaFileDownload} />}
              onClick={handleDownloadRatings}
              isLoading={isSubmitting}
              loadingText="Downloading"
              variant="outline"
              size="md"
              borderColor="brand.border"
              borderWidth="2px"
              color="brand.lightText"
              _hover={{ 
                borderColor: 'brand.primary',
                boxShadow: '0 0 10px rgba(0, 229, 255, 0.3)' 
              }}
              px={6}
            >
              Download My Ratings
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SurveyInterface;