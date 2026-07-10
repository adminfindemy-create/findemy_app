import React, { createContext, useContext } from 'react';
import { lightTheme, darkTheme } from './theme';
import type { Theme } from './theme';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({
  mode,
  children,
}: {
  mode: 'light' | 'dark';
  children: React.ReactNode;
}) {
  const theme = mode === 'dark' ? darkTheme : lightTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
