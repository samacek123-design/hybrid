import { useColorScheme } from 'react-native';

import { currentPalette, type Palette } from './tokens';

export function usePalette(): { c: Palette; scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { c: currentPalette(scheme), scheme };
}
