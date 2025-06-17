
import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';


interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      {theme === 'light' ? (
        <MoonIcon className="w-6 h-6 text-white" />
      ) : (
        <SunIcon className="w-6 h-6 text-white" />
      )}
    </button>
  );
};