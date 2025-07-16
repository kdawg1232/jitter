export const Colors = {
  // Background colors
  canvas: '#F3ECFF', // Entire app background - soft pastel lavender
  cardBg: '#E6DBFF', // Slider card, FAQ items, calendar tiles
  cardStroke: '#D4C8F2', // Soft outline on cards
  
  // Primary colors
  primaryGreen: '#2FBD60', // Big ✔︎ icon, CTAs
  primaryBlue: '#5F70FF', // "set up / refresh" buttons
  
  // Accent colors
  accentOrange: '#FFD56B', // Toggles, slider fill
  accentRed: '#FF4B4B', // Alert dot, destructive actions
  pastelGreen: '#D4F7D6', // Highlight behind date cell
  
  // Text colors
  textPrimary: '#000000', // Large headings, list titles
  textSecondary: '#6E6A7F', // Subtitle copy
  textTertiary: '#B3B0C5', // Inactive icons, muted labels
  
  // Utility colors
  divider: '#DAD6EF', // Thin horizontal rules
  white: '#FFFFFF', // Button text, slider knob
};

export const Fonts = {
  // SF Pro Rounded font family (iOS system fonts)
  bigTitle: {
    fontFamily: 'System', // Will use SF Pro Rounded on iOS
    fontWeight: '800' as const, // Heavy/Bold
    fontSize: 34,
  },
  sectionHeading: {
    fontFamily: 'System',
    fontWeight: '600' as const, // Semibold
    fontSize: 17,
  },
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const, // Regular
    fontSize: 15,
    letterSpacing: -0.15, // -1% letter spacing
  },
  caption: {
    fontFamily: 'System',
    fontWeight: '500' as const, // Medium
    fontSize: 11,
  },
  button: {
    fontFamily: 'System',
    fontWeight: '600' as const, // Semibold
    fontSize: 17,
  },
};

export const Theme = {
  colors: Colors,
  fonts: Fonts,
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
}; 