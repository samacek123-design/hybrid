import { useResolvedTheme } from './ThemeProvider';
import type { Palette } from './tokens';

export function usePalette(): { c: Palette; scheme: 'light' | 'dark' } {
  return useResolvedTheme();
}
