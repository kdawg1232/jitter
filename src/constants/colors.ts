export const colors = {
  // Primary colors
  primary: '#A259FF',      // Medium Slate Blue - main interactive elements
  secondary: '#C18DFF',    // Lavender - secondary buttons, progress indicators
  background: '#1F1F1F',   // Eerie Black - dark background elements
  surface: '#F9F9FB',      // Seasalt - card backgrounds, light sections
  border: '#E0E0E0',       // Platinum - borders, strokes, secondary text
  
  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Text colors
  text: {
    primary: '#000000',
    secondary: '#666666',
    disabled: '#9E9E9E',
    inverse: '#FFFFFF',
  },
  
  // Opacity variations
  opacity: {
    primary: 'rgba(162, 89, 255, 0.1)',
    secondary: 'rgba(193, 141, 255, 0.1)',
    background: 'rgba(31, 31, 31, 0.8)',
    surface: 'rgba(249, 249, 251, 0.9)',
  }
} as const; 