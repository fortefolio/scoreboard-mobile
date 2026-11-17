/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const ScoreBoardTheme = {
  /* Unslop Ink Neutral Ramp for Precision Sports Telemetry */
  background: '#0b0d14',
  surface: '#0b0d14',
  surfaceDim: '#07080d',
  surfaceContainerLowest: '#07080d',
  surfaceContainerLow: '#0f121a',
  surfaceContainer: '#11141c',
  surfaceContainerHigh: '#161a24',
  surfaceContainerHighest: '#1a1e28',
  onSurface: '#eef0f5',
  onSurfaceVariant: '#a3a9b8',
  textMuted: '#7a8296',
  primary: '#6366f1',
  primaryContainer: '#4f46e5',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#eef0f5',
  secondary: '#4cc38a',
  secondaryContainer: '#15803d',
  tertiary: '#f59e0b',
  tertiaryContainer: '#b45309',
  liveCrimson: '#f43f5e',
  error: '#e5484d',
  errorContainer: '#991b1b',
  borderGhost: 'rgba(238, 240, 245, 0.05)',
  borderSubtle: 'rgba(238, 240, 245, 0.08)',
  borderAccent: 'rgba(99, 102, 241, 0.25)',
  gold: '#f59e0b',
} as const;

export const Typography = {
  digital: {
    fontFamily: 'Digital7Mono',
  },
  digitalLogo: {
    fontFamily: 'Digital7',
  },
  tabularNums: {
    fontVariant: ['tabular-nums' as const],
  },
} as const;

export const Colors = {
  light: {
    text: '#111827',
    background: '#f5f7fa',
    backgroundElement: '#eceff4',
    backgroundSelected: '#e2e8f0',
    textSecondary: '#4b5565',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    border: 'rgba(17, 24, 39, 0.08)',
    primary: '#4f46e5',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626',
  },
  dark: {
    text: '#eef0f5',
    background: '#0b0d14',
    backgroundElement: '#0f121a',
    backgroundSelected: '#161a24',
    textSecondary: '#a3a9b8',
    surface: '#11141c',
    surfaceElevated: '#1a1e28',
    border: 'rgba(238, 240, 245, 0.08)',
    primary: '#6366f1',
    success: '#4cc38a',
    warning: '#f59e0b',
    danger: '#e5484d',
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
