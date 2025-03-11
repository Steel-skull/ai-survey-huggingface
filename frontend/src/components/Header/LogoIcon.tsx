import React from 'react';
import { Box } from '@chakra-ui/react';

interface LogoIconProps {
  size?: string;
  className?: string;
}

const LogoIcon: React.FC<LogoIconProps> = ({ size = "50px", className = "" }) => {
  return (
    <Box 
      as="svg" 
      width={size} 
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`logo-glow ${className}`}
    >
      {/* AI Letters with circuit pattern styling */}
      <g>
        {/* A Letter */}
        <path
          d="M30 80L15 20H25L35 65L45 20H55L40 80H30Z"
          fill="transparent"
          stroke="#FF00FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Circuit pattern on A */}
        <path
          d="M20 50H50M25 35H45M30 65H40"
          stroke="#FF00FF"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
        
        {/* I Letter */}
        <path
          d="M65 20H80M72.5 20V80M65 80H80"
          stroke="#FF00FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Circuit pattern on I */}
        <path
          d="M65 35H80M65 50H80M65 65H80"
          stroke="#FF00FF"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
        
        {/* Decorative elements */}
        <circle cx="25" cy="20" r="3" fill="#00BFFF" />
        <circle cx="72.5" cy="50" r="3" fill="#00BFFF" />
        <circle cx="40" cy="80" r="3" fill="#00BFFF" />
      </g>
      
      {/* Glow effect */}
      <filter id="glow">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </Box>
  );
};

export default LogoIcon;