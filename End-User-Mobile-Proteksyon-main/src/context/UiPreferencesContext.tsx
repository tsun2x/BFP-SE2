import React, { createContext, useContext, useMemo, useState } from 'react';

export type TextSizeOption = 'small' | 'medium' | 'large';

type UiPalette = {
  pageBg: string;
  cardBg: string;
  headerBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  inputBg: string;
  chipBg: string;
  chipText: string;
};

type UiPreferencesContextValue = {
  textSize: TextSizeOption;
  setTextSize: (value: TextSizeOption) => void;
  darkModeEnabled: boolean;
  setDarkModeEnabled: (value: boolean) => void;
  fontScale: number;
  palette: UiPalette;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | undefined>(undefined);

export const UiPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [textSize, setTextSize] = useState<TextSizeOption>('medium');
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const fontScale = textSize === 'small' ? 0.9 : textSize === 'large' ? 1.15 : 1;

  const palette = useMemo<UiPalette>(
    () =>
      darkModeEnabled
        ? {
            pageBg: '#0f1115',
            cardBg: '#1b1f27',
            headerBg: '#7e1f1d',
            border: '#303644',
            textPrimary: '#f4f6fb',
            textSecondary: '#b8c0d0',
            inputBg: '#12161d',
            chipBg: '#212736',
            chipText: '#c6cfde',
          }
        : {
            pageBg: '#f5f5f5',
            cardBg: '#ffffff',
            headerBg: '#E53935',
            border: '#dddddd',
            textPrimary: '#333333',
            textSecondary: '#666666',
            inputBg: '#ffffff',
            chipBg: '#ffffff',
            chipText: '#555555',
          },
    [darkModeEnabled],
  );

  const value = useMemo(
    () => ({
      textSize,
      setTextSize,
      darkModeEnabled,
      setDarkModeEnabled,
      fontScale,
      palette,
    }),
    [textSize, darkModeEnabled, fontScale, palette],
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
};

export const useUiPreferences = () => {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) {
    throw new Error('useUiPreferences must be used within UiPreferencesProvider');
  }
  return ctx;
};
