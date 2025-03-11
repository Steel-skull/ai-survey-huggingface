import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'dompurify';
import { Box } from '@chakra-ui/react';
import '../../styles/messageColors.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  // Sanitize the content
  const sanitizedContent = DOMPurify.sanitize(content);
  
  return (
    <Box className={`markdown-content ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer;