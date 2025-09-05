import { createContext, useContext, useState, type ReactNode } from 'react';
import { SETTINGS_FIELDS, type SettingKey } from '../components/modals/SettingsPage';

interface SettingsContextType {
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => void;
  getSetting: (key: SettingKey) => string;
  getBooleanSetting: (key: SettingKey) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    const loaded: Record<string, string> = {};
    SETTINGS_FIELDS.forEach(f => {
      loaded[f.key] = localStorage.getItem(f.key) || ('defaultValue' in f ? f.defaultValue : '');
    });
    return loaded;
  });

  const updateSetting = (key: string, value: string) => {
    localStorage.setItem(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getSetting = (key: SettingKey): string => {
    return settings[key] || '';
  };

  const getBooleanSetting = (key: SettingKey): boolean => {
    return settings[key] === 'true';
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, getSetting, getBooleanSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}