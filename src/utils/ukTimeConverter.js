/**
 * UK Time Conversion Utilities
 * 
 * Purpose: Convert between employee local time and UK time for storage
 * Storage Format: All times stored in UK timezone (Europe/London)
 * Display Format: Employees see their local timezone
 * 
 * CRITICAL: Maintains exact format compatibility
 * - Date format: "YYYY-MM-DD" (unchanged)
 * - Time format: "HH:MM" (unchanged)
 */

const UK_TIMEZONE = 'Europe/London';

/**
 * Convert employee's local time to UK time for backend storage
 * @param {string} localDate - Format: "YYYY-MM-DD" (e.g., "2025-10-21")
 * @param {string} localTime - Format: "HH:MM" (e.g., "09:00")
 * @returns {object} - { ukDate: "YYYY-MM-DD", ukTime: "HH:MM" }
 */
export const convertLocalToUK = (localDate, localTime) => {
  try {
    if (!localDate || !localTime) {
      console.warn('convertLocalToUK: Missing date or time', { localDate, localTime });
      return { ukDate: localDate, ukTime: localTime };
    }

    // Create date object in employee's local timezone
    const localDateTimeString = `${localDate}T${localTime}:00`;
    const localDateTime = new Date(localDateTimeString);

    // Convert to UK timezone
    const ukDateTimeString = localDateTime.toLocaleString('en-GB', {
      timeZone: UK_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Parse UK datetime string (format: "DD/MM/YYYY, HH:MM")
    const [datePart, timePart] = ukDateTimeString.split(', ');
    const [day, month, year] = datePart.split('/');
    
    // Format to match existing storage format
    const ukDate = `${year}-${month}-${day}`; // "YYYY-MM-DD"
    const ukTime = timePart; // "HH:MM"

    console.log('🔄 Time conversion (Local → UK):', {
      input: { localDate, localTime },
      output: { ukDate, ukTime }
    });

    return { ukDate, ukTime };
  } catch (error) {
    console.error('❌ convertLocalToUK error:', error);
    // Fallback: return original values if conversion fails
    return { ukDate: localDate, ukTime: localTime };
  }
};

/**
 * Convert UK time from backend to employee's local time for display
 * @param {string} ukDate - Format: "YYYY-MM-DD" (e.g., "2025-10-21")
 * @param {string} ukTime - Format: "HH:MM" (e.g., "17:00")
 * @returns {object} - { localDate: "YYYY-MM-DD", localTime: "HH:MM" }
 */
export const convertUKToLocal = (ukDate, ukTime) => {
  try {
    if (!ukDate || !ukTime) {
      console.warn('convertUKToLocal: Missing date or time', { ukDate, ukTime });
      return { localDate: ukDate, localTime: ukTime };
    }

    // Parse UK time as UTC date object
    const ukDateTimeString = `${ukDate}T${ukTime}:00`;
    const ukDateTime = new Date(ukDateTimeString);

    // Get employee's local timezone
    const employeeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert to employee's local timezone
    const localDateTimeString = ukDateTime.toLocaleString('en-GB', {
      timeZone: employeeTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Parse local datetime string (format: "DD/MM/YYYY, HH:MM")
    const [datePart, timePart] = localDateTimeString.split(', ');
    const [day, month, year] = datePart.split('/');
    
    // Format to match existing display format
    const localDate = `${year}-${month}-${day}`; // "YYYY-MM-DD"
    const localTime = timePart; // "HH:MM"

    console.log('🔄 Time conversion (UK → Local):', {
      input: { ukDate, ukTime },
      output: { localDate, localTime },
      timezone: employeeTimezone
    });

    return { localDate, localTime };
  } catch (error) {
    console.error('❌ convertUKToLocal error:', error);
    // Fallback: return original values if conversion fails
    return { localDate: ukDate, localTime: ukTime };
  }
};

/**
 * Get current date and time in UK timezone
 * @returns {object} - { date: "YYYY-MM-DD", time: "HH:MM" }
 */
export const getCurrentUKTime = () => {
  try {
    const now = new Date();

    const ukDateTimeString = now.toLocaleString('en-GB', {
      timeZone: UK_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const [datePart, timePart] = ukDateTimeString.split(', ');
    const [day, month, year] = datePart.split('/');
    
    const date = `${year}-${month}-${day}`; // "YYYY-MM-DD"
    const time = timePart; // "HH:MM"

    return { date, time };
  } catch (error) {
    console.error('❌ getCurrentUKTime error:', error);
    // Fallback to system time
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    return { date, time };
  }
};

/**
 * Get current date and time in employee's local timezone
 * @returns {object} - { date: "YYYY-MM-DD", time: "HH:MM" }
 */
export const getCurrentLocalTime = () => {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return {
    date: `${year}-${month}-${day}`, // "YYYY-MM-DD"
    time: `${hours}:${minutes}` // "HH:MM"
  };
};

/**
 * Check if employee is in UK timezone (no conversion needed)
 * @returns {boolean}
 */
export const isEmployeeInUK = () => {
  const employeeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return employeeTimezone === UK_TIMEZONE || 
         employeeTimezone === 'Europe/London' ||
         employeeTimezone === 'GB';
};

/**
 * Format time for display (keeps existing format)
 * @param {string} time - Format: "HH:MM"
 * @returns {string} - Same format: "HH:MM"
 */
export const formatTimeForDisplay = (time) => {
  if (!time) return '-';
  // Keep exact format, no changes
  return time;
};

/**
 * Format date for display (keeps existing format)
 * @param {string} date - Format: "YYYY-MM-DD"
 * @returns {string} - Same format: "YYYY-MM-DD"
 */
export const formatDateForDisplay = (date) => {
  if (!date) return '-';
  // Keep exact format, no changes
  return date;
};
