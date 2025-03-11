import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Color scheme config
const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,

};

// Custom colors based on the ferret/AI image
const colors = {
  brand: {
    primary: '#00e5ff', // Neon cyan/blue from the skull
    secondary: '#9115ff', // Purple accent complementary to the blue
    dark: '#0A0E14', // Darker base background
    darkAlt: '#121820', // Slightly lighter dark for cards
    darkCard: '#161C25', // Card background color
    lightText: '#E0F7FF', // Light blue-tinted text
    border: '#20303D', // Darker blue-tinted border
    success: '#00D6A4', // Success color
    error: '#FF3D3D', // Error color
    accent: '#6C2E00', // Brown accent (like the horns)
    horns: '#8B4513', // Horn color
    suit: '#1F1F1F', // Suit color from the image
    shadow: '#050709', // Deep shadow color
    highlight: '#41C6FF', // Bright highlight color
    
    // User message styling (blue)
    user: 'rgba(0, 120, 255, 0.2)',
    userBorder: 'rgb(0, 140, 255)',
    
    // Assistant message styling (green)
    assistant: 'rgba(0, 200, 100, 0.2)',
    assistantBorder: 'rgb(0, 220, 120)',
    
    // Think message styling (red)
    think: 'rgba(255, 50, 50, 0.2)',
    thinkBorder: 'rgb(255, 70, 70)',
    
    // Post-think message styling
    postThink: 'rgba(0, 200, 100, 0.2)',
    postThinkBorder: 'rgb(0, 220, 120)',
  },
};

// Custom font stacks
const fonts = {
  heading: `'Orbitron', 'Blender Pro', sans-serif`,
  body: `'Inter', 'Rajdhani', sans-serif`,
  mono: `'Roboto Mono', monospace`,
};

// Component style overrides
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'bold',
      borderRadius: 'md',
      _focus: {
        boxShadow: '0 0 0 3px rgba(0, 229, 255, 0.4)',
      },
    },
    variants: {
      solid: {
        bg: 'brand.primary',
        color: 'brand.dark',
        fontWeight: '800',
        _hover: {
          bg: 'brand.primary',
          opacity: 0.9,
          boxShadow: '0 0 15px rgba(0, 229, 255, 0.6)',
        },
      },
      outline: {
        borderColor: 'brand.border',
        color: 'brand.lightText',
        borderWidth: '2px',
        _hover: {
          bg: 'rgba(0, 229, 255, 0.1)',
          borderColor: 'brand.primary',
          boxShadow: '0 0 10px rgba(0, 229, 255, 0.3)',
        },
      },
    },
  },
  Heading: {
    baseStyle: {
      fontFamily: 'heading',
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      textShadow: '0 0 5px rgba(0, 229, 255, 0.4)',
    },
  },
  Card: {
    baseStyle: {
      bg: 'brand.darkCard',
      borderRadius: 'md',
      overflow: 'hidden',
      borderWidth: '2px',
      borderColor: 'brand.primary',
      boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)',
    },
  },
  Input: {
    variants: {
      filled: {
        field: {
          bg: 'brand.darkAlt',
          borderColor: 'brand.border',
          color: 'brand.lightText',
          _hover: {
            bg: 'brand.darkAlt',
            borderColor: 'brand.primary',
          },
          _focus: {
            bg: 'brand.darkAlt',
            borderColor: 'brand.primary',
 
            boxShadow: '0 0 0 1px brand.primary',
          },
        },
      },
    },
    defaultProps: {
      variant: 'filled',
    },
  },
  Textarea: {
    variants: {
      filled: {
        bg: 'brand.darkAlt',
        borderColor: 'brand.border',
 
        borderWidth: '2px',
        _hover: {
          bg: 'brand.darkAlt',
          borderColor: 'brand.primary',
        },
        _focus: {
          bg: 'brand.darkAlt',
          borderColor: 'brand.primary',
        },
      },
    },
    defaultProps: {
      variant: 'filled',
    },
  },
  Progress: {
    baseStyle: {
      track: {
        bg: 'brand.darkAlt',
      },
      filledTrack: {
        bg: 'brand.primary',
        boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
      },
    },
  },
  Divider: {
    baseStyle: {
      borderColor: 'brand.border',
      opacity: 0.6,
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'brand.darkCard',
        borderColor: 'brand.primary',
        borderWidth: '1px',
      },
    },
  },
};

// Custom breakpoints
const breakpoints = {
  sm: '30em',
  md: '48em',
  lg: '62em',
  xl: '80em',
  '2xl': '96em',
};

// Build the theme
const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  breakpoints,
  styles: {
    global: {
      body: {
        bg: 'brand.dark',
        color: 'brand.lightText',
        backgroundImage: 'linear-gradient(to bottom, brand.dark, #101921)',
      },
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        bg: 'brand.dark',
      },
      '::-webkit-scrollbar-thumb': {
        bg: 'brand.border',
        borderRadius: 'full',
      },
      '::-webkit-scrollbar-thumb:hover': {
        bg: 'brand.primary',
      },
    },
  },
});

export default theme;