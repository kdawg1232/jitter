import { colors } from './colors';

export const typography = {
  fontFamily: 'Inter',
  heading: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    color: colors.text.primary,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 24,
    color: colors.text.primary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.text.primary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: colors.text.secondary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    color: colors.text.inverse,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
    color: colors.text.primary,
  },
} as const; 