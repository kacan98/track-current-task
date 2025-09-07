import { useSettings } from '../../contexts/SettingsContext';
import { useCommitValidation } from '../modals/CommitsModal/hooks/useCommitValidation';
import type { SettingKey } from '../modals/SettingsPage';

interface SettingsInputProps {
  settingKey: SettingKey;
  label: string;
  type?: 'text' | 'url' | 'time' | 'number';
  placeholder?: string;
  className?: string;
  showValidation?: boolean;
}

export function SettingsInput({ 
  settingKey, 
  label, 
  type = 'text', 
  placeholder, 
  className = '',
  showValidation = false
}: SettingsInputProps) {
  const settings = useSettings();
  const { validateRegex } = useCommitValidation();
  
  const value = settings?.getSetting(settingKey) || '';
  const validationError = showValidation && settingKey === 'taskIdRegex' ? validateRegex(value) : null;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Handle number inputs with rounding logic from SettingsPage
    if (type === 'number' && newValue !== '') {
      if (settingKey === 'scrumDailyDurationMinutes') {
        const minutes = Math.round(parseFloat(newValue) / 5) * 5;
        newValue = String(minutes);
      } else {
        const minutes = Math.round(parseFloat(newValue) / 30) * 30;
        newValue = String(minutes);
      }
    }
    
    settings?.updateSetting(settingKey, newValue);
  };
  
  return (
    <div>
      <label htmlFor={settingKey} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id={settingKey}
        type={type}
        value={value}
        onChange={handleChange}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
          validationError 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-200 focus:ring-blue-500'
        } ${className}`}
        placeholder={placeholder}
      />
      {validationError && (
        <p className="mt-1 text-sm text-red-600">
          {validationError}
        </p>
      )}
    </div>
  );
}