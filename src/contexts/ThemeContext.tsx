import React, { createContext, useState, useMemo } from 'react';
import { DarkColors, LightColors } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { Shadows } from '@/constants/shadows';

interface ThemeType {
  colors: typeof DarkColors;
  spacing: typeof Spacing;
  typography: typeof Typography;
  shadows: typeof Shadows;
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    full: number;
  };
  button: {
    height: number;
    borderRadius: number;
    minWidth: number;
  };
  input: {
    height: number;
    borderRadius: number;
    borderWidth: number;
  };
  card: {
    borderRadius: number;
    padding: number;
  };
  iconButton: {
    size: number;
    borderRadius: number;
  };
  avatar: {
    small: number;
    medium: number;
    large: number;
  };
}

interface ThemeContextType {
  theme: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = useMemo(() => ({
    colors: isDarkMode ? DarkColors : LightColors,
    spacing: Spacing,
    typography: Typography,
    shadows: Shadows,
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      xxl: 20,
      full: 9999,
    },
    button: {
      height: 52,
      borderRadius: 8,
      minWidth: 120,
    },
    input: {
      height: 52,
      borderRadius: 8,
      borderWidth: 1,
    },
    card: {
      borderRadius: 12,
      padding: 16,
    },
    iconButton: {
      size: 48,
      borderRadius: 12,
    },
    avatar: {
      small: 32,
      medium: 48,
      large: 64,
    },
  }), [isDarkMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
