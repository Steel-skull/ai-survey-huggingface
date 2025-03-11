import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import App from './App';
import theme from './styles/theme';
import './styles/animations.css';
import { RatingProvider } from './context/RatingContext';

// Render the application
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <RatingProvider>
        <App />
      </RatingProvider>
    </ChakraProvider>
  </React.StrictMode>
);