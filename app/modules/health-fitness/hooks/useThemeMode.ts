import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@health_fitness_theme_mode';

interface ThemeData {
  isDarkMode: boolean;
  lastUpdated: number;
}

/**
 * Custom hook to manage dark mode theme with AsyncStorage persistence
 * @returns {object} Theme state and toggle function
 */
export function useThemeMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from AsyncStorage on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        const themeData: ThemeData = JSON.parse(storedTheme);
        setIsDarkMode(themeData.isDarkMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (darkMode: boolean) => {
    try {
      const themeData: ThemeData = {
        isDarkMode: darkMode,
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeData));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    saveTheme(newMode);
  };

  return {
    isDarkMode,
    toggleTheme,
    isLoading,
  };
}
