import React from 'react';

// Common timezone options
export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Manila', label: 'Philippines (PHT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' }
];

const TimezoneSelector = ({ value, onChange, required = false, className = '' }) => {
  return (
    <div className={className}>
      <label htmlFor="timezone" className="form-label">
        <i className="bi bi-globe me-2"></i>
        Your Timezone <span className="text-danger">*</span>
      </label>
      <select
        className="form-select"
        id="timezone"
        value={value}
        onChange={onChange}
        required={required}
        style={{ fontSize: '16px' }} // Prevent zoom on iOS
      >
        <option value="">Select your timezone...</option>
        {TIMEZONE_OPTIONS.map(tz => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
      <div className="form-text text-muted">
        This ensures accurate time tracking for your location
      </div>
    </div>
  );
};

export default TimezoneSelector;