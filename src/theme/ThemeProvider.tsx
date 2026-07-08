/**
 * Resolves the effective color scheme from app state (`themeMode`) rather
 * than the OS directly, so every screen agrees on light/dark and the user
 * can override the system setting from Settings.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useStore } from '@/lib/store';

import { currentPalette, type Palette } from './tokens';

interface ThemeValue {
  c: Palette;
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { state } = useStore();
  const scheme = state.themeMode === 'system' ? systemScheme : state.themeMode;
  const value = useMemo<ThemeValue>(() => ({ c: currentPalette(scheme), scheme }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useResolvedTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useResolvedTheme must be used inside ThemeProvider');
  return ctx;
}
