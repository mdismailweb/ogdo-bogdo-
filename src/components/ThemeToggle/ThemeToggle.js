import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? (
        <span style={{ fontSize: '1.2rem' }}>☀️</span>
      ) : (
        <span style={{ fontSize: '1.2rem' }}>🌙</span>
      )}
    </button>
  );
};

export default ThemeToggle;