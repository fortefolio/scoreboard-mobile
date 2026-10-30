/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const ScoreBoardTheme = {
  background: '#0c1324',
  surface: '#0c1324',
  surfaceDim: '#0c1324',
  surfaceContainerLowest: '#070d1f',
  surfaceContainerLow: '#151b2d',
  surfaceContainer: '#191f31',
  surfaceContainerHigh: '#23293c',
  surfaceContainerHighest: '#2e3447',
  onSurface: '#dce1fb',
  onSurfaceVariant: '#94a3b8',
  primary: '#c3c0ff',
  primaryContainer: '#4f46e5',
  onPrimary: '#1d00a5',
  onPrimaryContainer: '#dad7ff',
  secondary: '#4edea3',
  secondaryContainer: '#00a572',
  tertiary: '#ffb690',
  tertiaryContainer: '#a04500',
  error: '#ffb4ab',
  errorContainer: '#93000a',
  borderGhost: 'rgba(255, 255, 255, 0.05)',
  borderSubtle: 'rgba(255, 255, 255, 0.10)',
  borderAccent: 'rgba(79, 70, 229, 0.30)',
  gold: '#fbbf24',
} as const;

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    backgroundElement: '#e2e8f0',
    backgroundSelected: '#cbd5e1',
    textSecondary: '#64748b',
    surface: '#ffffff',
    surfaceElevated: '#f1f5f9',
    border: '#e2e8f0',
    primary: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  dark: {
    text: '#dce1fb',
    background: '#0c1324',
    backgroundElement: '#151b2d',
    backgroundSelected: '#191f31',
    textSecondary: '#94a3b8',
    surface: '#151b2d',
    surfaceElevated: '#23293c',
    border: 'rgba(255, 255, 255, 0.05)',
    primary: '#4f46e5',
    success: '#4edea3',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
