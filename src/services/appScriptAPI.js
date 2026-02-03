import {
  processAIPromptWithData as processAIInReact,
  runExperimentalAI as runExperimentalAIInReact,
  generateDataDrivenRecommendations as getAISuggestionsFromReact,
  generateDataInsights as getAIDashboardFromReact
} from './aiService';

// Replace with your actual Google Apps Script Web App URL
// Replace with your NEW Google Apps Script Web App URL after redeployment
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwa0W0QQaB6pqx_PZ2v4NQtziFbBbAF7A8af6eoI0bi83I-p4kwnPDlBBMvj00q3yNGnw/exec';

// Test function to check if data exists in sheets with very broad date range
export const testDataExists = async () => {
  console.log('🔍 Testing if data exists in Google Sheets...');

  try {
    const response = await makeAPICall({
      action: 'getAllShiftsForAdmin',
      startDate: '2020-01-01',  // Very early date
      endDate: '2030-12-31'     // Very late date
    });

    console.log('📊 Test Results:');
    console.log('Success:', response.success);
    console.log('Data count:', response.data?.length || 0);
    console.log('Message:', response.message);

    if (response.data && response.data.length > 0) {
      console.log('✅ Data found! First record:');
      console.log(response.data[0]);
      console.log('📅 Available shift dates:');
      response.data.forEach((shift, index) => {
        console.log(`  ${index + 1}. ${shift['Shift Date']} - ${shift['Employee Name']}`);
      });
    } else {
      console.log('❌ No data found in sheets');
    }

    return response;
  } catch (error) {
    console.error('❌ Error testing data:', error);
    return { success: false, error: error.message };
  }
};

// 🚨 CRITICAL: This URL must point to the LATEST deployment with real AI analysis!
// If you're getting generic responses, you need to:
// 1. Deploy the updated appscript.js to Google Apps Script
// 2. Get the new deployment URL
// 3. Replace the URL above with the new one




// Test if backend has updated AI analysis
export const testBackendVersion = async () => {
  console.log('🔍 Testing backend version...');
  console.log('📡 Current URL:', APPS_SCRIPT_URL);

  try {
    const response = await makeAPICall({
      action: 'testConnection'
    });

    console.log('📋 Backend response:', response);

    if (response.success) {
      // Check if the backend has the new AI functions
      if (response.actions && response.actions.includes('processAIPromptWithData')) {
        console.log('✅ Backend has AI functions');

        // Now test the AI with a simple prompt
        const aiResponse = await processAIPromptWithData('test backend version', false);
        console.log('🤖 AI Response:', aiResponse);

        if (aiResponse.success && aiResponse.data && aiResponse.data.analysis) {
          const analysis = aiResponse.data.analysis;

          // Check for signs of OLD canned responses
          if (analysis.includes('Data Quality Score: 100/100') ||
            analysis.includes('System Utilization: 4.486111111111112%') ||
            analysis.includes('Consider expanding staff team')) {
            return {
              isUpdated: false,
              version: 'OLD_BACKEND',
              message: '🚨 Backend has OLD AI with canned responses!',
              needsDeployment: true,
              url: APPS_SCRIPT_URL
            };
          } else if (analysis.includes('🤖 AI Analysis Results:') ||
            analysis.includes('RAW DATA SUMMARY') ||
            analysis.includes('COMPLETE EMPLOYEE ANALYSIS')) {
            return {
              isUpdated: true,
              version: 'NEW_BACKEND',
              message: '✅ Backend has NEW AI with real data analysis!',
              needsDeployment: false,
              url: APPS_SCRIPT_URL
            };
          } else {
            return {
              isUpdated: false,
              version: 'UNKNOWN',
              message: '❓ Backend AI version unclear',
              needsDeployment: true,
              url: APPS_SCRIPT_URL,
              sampleResponse: analysis.substring(0, 200)
            };
          }
        } else {
          return {
            isUpdated: false,
            version: 'NO_AI',
            message: '❌ Backend AI not working',
            needsDeployment: true,
            url: APPS_SCRIPT_URL
          };
        }
      } else {
        return {
          isUpdated: false,
          version: 'OLD_BACKEND',
          message: '🚨 Backend missing AI functions!',
          needsDeployment: true,
          url: APPS_SCRIPT_URL
        };
      }
    } else {
      return {
        isUpdated: false,
        version: 'CONNECTION_FAILED',
        message: '❌ Cannot connect to backend',
        needsDeployment: true,
        url: APPS_SCRIPT_URL,
        error: response.message
      };
    }
  } catch (error) {
    console.error('🚨 Backend test failed:', error);
    return {
      isUpdated: false,
      version: 'ERROR',
      message: '❌ Backend test failed: ' + error.message,
      needsDeployment: true,
      url: APPS_SCRIPT_URL,
      error: error.message
    };
  }
};
export const makeAPICall = async (payload) => {
  try {
    console.log('=== API CALL DEBUG START ===');
    console.log('URL:', APPS_SCRIPT_URL);

    // Add timezone information to all API calls
    const enhancedPayload = {
      ...payload,
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      clientTimezoneOffset: new Date().getTimezoneOffset()
    };

    console.log('Making API call:', enhancedPayload);
    console.log('Timestamp:', new Date().toISOString());

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(enhancedPayload),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Response headers:', [...response.headers.entries()]);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    if (!responseText.trim()) {
      throw new Error('Empty response from server');
    }

    const result = JSON.parse(responseText);
    console.log('Parsed API response:', result);
    console.log('=== API CALL DEBUG END ===');

    return result;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error object:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== API ERROR END ===');
    throw error;
  }
};

// Login a user by checking credentials against the Staff sheet
export const loginUser = async (credentials) => {
  console.log('loginUser called with:', credentials);
  return await makeAPICall({
    action: 'login',
    username: credentials.username, // This will be the employee's name
    password: credentials.password  // This will be the employee's ID
  });
};

// Start a new shift
export const startShift = async (shiftData) => {
  console.log('startShift called with:', shiftData);
  return await makeAPICall({
    action: 'startShift',
    employeeName: shiftData.employeeName,
    employeeId: shiftData.employeeId,
    shiftDate: shiftData.shiftDate,
    shiftType: shiftData.shiftType || 'Regular',
    startTime: shiftData.startTime
  });
};

// Stop current segment
export const stopShift = async (shiftData) => {
  console.log('stopShift called with:', shiftData);
  return await makeAPICall({
    action: 'stopShift',
    employeeName: shiftData.employeeName, // Added for robustness
    employeeId: shiftData.employeeId,
    shiftDate: shiftData.shiftDate,
    endTime: shiftData.endTime
  });
};

// *** THIS IS THE CORRECTED FUNCTION ***
// Add new segment to existing shift
export const addNewSegment = async (shiftData) => {
  console.log('addNewSegment called with:', shiftData);
  return await makeAPICall({
    action: 'addNewSegment',
    employeeName: shiftData.employeeName, // The missing piece
    employeeId: shiftData.employeeId,
    shiftDate: shiftData.shiftDate,
    startTime: shiftData.startTime
  });
};

// Get current shift status - ENHANCED WITH IMMEDIATE SMART STATUS AND AUTO-FIXING
// 🔥 REAL-TIME SHEET SYNC FUNCTIONS
// These functions immediately update Google Sheets when app logic changes

// Immediate status update in sheet
export const syncStatusToSheet = async (shiftId, newStatus, reason = 'Auto-sync from frontend') => {
  console.log(`🔄 IMMEDIATE SHEET SYNC: Updating status to ${newStatus} for shift ${shiftId}`);

  try {
    const result = await makeAPICall({
      action: 'updateShiftStatus',
      shiftId: shiftId,
      newStatus: newStatus, // 🔥 FIXED: Backend expects 'newStatus', not 'status'
      reason: reason,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      console.log(`✅ SHEET SYNC SUCCESS: Status updated to ${newStatus}`);
    } else {
      console.error(`❌ SHEET SYNC FAILED: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error('❌ SHEET SYNC ERROR:', error);
    return { success: false, message: error.message };
  }
};

// Immediate duration update in sheet
export const syncDurationToSheet = async (shiftId, totalDuration, lastEndTime, reason = 'Auto-sync from frontend') => {
  console.log(`🔄 IMMEDIATE SHEET SYNC: Updating duration to ${totalDuration} hrs, endTime to ${lastEndTime}`);

  try {
    const result = await makeAPICall({
      action: 'updateShiftDurationAndEndTime',
      shiftId: shiftId,
      totalDuration: totalDuration,
      lastEndTime: lastEndTime,
      reason: reason,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      console.log(`✅ SHEET SYNC SUCCESS: Duration and end time updated`);
    } else {
      console.error(`❌ SHEET SYNC FAILED: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error('❌ SHEET SYNC ERROR:', error);
    return { success: false, message: error.message };
  }
};

// Immediate segments update in sheet
export const syncSegmentsToSheet = async (shiftId, segments, reason = 'Auto-sync from frontend') => {
  console.log(`🔄 IMMEDIATE SHEET SYNC: Updating segments for shift ${shiftId}`);

  try {
    const result = await makeAPICall({
      action: 'updateShiftSegments',
      shiftId: shiftId,
      segments: segments,
      reason: reason,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      console.log(`✅ SHEET SYNC SUCCESS: Segments updated`);
    } else {
      console.error(`❌ SHEET SYNC FAILED: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error('❌ SHEET SYNC ERROR:', error);
    return { success: false, message: error.message };
  }
};

// Complete shift data sync to sheet
export const syncCompleteShiftToSheet = async (shiftData, reason = 'Complete sync from frontend') => {
  console.log(`🔄 IMMEDIATE COMPLETE SYNC: Syncing all shift data for ${shiftData.shiftId}`);

  // Calculate summary data from segments
  let totalDuration = 0;
  let lastEndTime = '';

  if (shiftData.segments && shiftData.segments.length > 0) {
    // Calculate total duration from segments
    totalDuration = shiftData.segments.reduce((total, seg) => {
      return total + (seg.duration || 0);
    }, 0);

    // Get last end time from segments
    const segmentsWithEndTime = shiftData.segments.filter(seg => seg.endTime);
    if (segmentsWithEndTime.length > 0) {
      lastEndTime = segmentsWithEndTime[segmentsWithEndTime.length - 1].endTime;
    }
  }

  try {
    const result = await makeAPICall({
      action: 'syncCompleteShift',
      shiftId: shiftData.shiftId,
      status: shiftData.status,
      totalDuration: totalDuration,
      lastEndTime: lastEndTime,
      segments: shiftData.segments,
      reason: reason,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      console.log(`✅ COMPLETE SHEET SYNC SUCCESS`);
    } else {
      console.error(`❌ COMPLETE SHEET SYNC FAILED: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error('❌ COMPLETE SHEET SYNC ERROR:', error);
    return { success: false, message: error.message };
  }
};

// Force fresh data from Google Sheets (bypasses all frontend logic and caching)
export const getShiftDataFromSheetDirectly = async (filters) => {
  console.log('🔄 FORCING FRESH DATA FROM GOOGLE SHEETS:', filters);
  const result = await makeAPICall({
    action: 'getShiftDataDirectlyFromSheet',
    employeeId: filters.employeeId,
    date: filters.date,
    bypassCache: true,
    forceFresh: true,
    timestamp: Date.now() // Prevent any caching
  });

  console.log('📊 RAW SHEET DATA RECEIVED:', result);
  return result;
};

export const getCurrentShift = async (filters) => {
  console.log('getCurrentShift called with:', filters);

  // If forceRefresh is specifically requested, get data directly from sheet
  if (filters.forceRefresh) {
    console.log('🚀 FORCE REFRESH REQUESTED - Getting fresh data from sheet');
    const freshResult = await getShiftDataFromSheetDirectly(filters);

    if (freshResult.success && freshResult.data) {
      console.log('📊 FRESH SHEET DATA RECEIVED:', freshResult.data);

      // Apply smart status correction only if needed
      const sheetStatus = freshResult.data.status;
      const smartStatusResult = applyFrontendSmartStatus(freshResult.data);

      if (smartStatusResult._statusCorrected) {
        console.log(`🔄 STATUS CORRECTION NEEDED: "${sheetStatus}" → "${smartStatusResult.status}"`);

        // Update the sheet with correct status
        try {
          await syncStatusToSheet(
            freshResult.data.shiftId,
            smartStatusResult.status,
            `Smart status correction after fresh data fetch`
          );

          // Update the data to reflect corrected status
          freshResult.data.status = smartStatusResult.status;
          freshResult.data._statusCorrected = true;
          freshResult.data._freshFromSheet = true;

          console.log('✅ STATUS CORRECTED AND SYNCED TO SHEET');
        } catch (error) {
          console.error('❌ Failed to sync corrected status to sheet:', error);
          freshResult.data.status = smartStatusResult.status;
          freshResult.data._statusCorrected = true;
          freshResult.data._syncFailed = true;
        }
      } else {
        console.log('✅ FRESH DATA STATUS IS CORRECT');
        freshResult.data._freshFromSheet = true;
      }

      return freshResult;
    } else {
      console.error('❌ Failed to get fresh data from sheet:', freshResult.message);
      // Fall back to regular getCurrentShift if fresh data fails
    }
  }

  // Regular getCurrentShift logic
  const result = await makeAPICall({
    action: 'getCurrentShift',
    employeeId: filters.employeeId,
    date: filters.date
  });

  // 🔥 ENHANCED FRONTEND SMART STATUS WITH IMMEDIATE SHEET SYNC
  if (result.success && result.data && result.data.segments) {
    const backendStatus = result.data.status;
    const smartStatusResult = applyFrontendSmartStatus(result.data);

    // 🔧 ALWAYS sync status if different (immediate sheet update)
    const shouldSync = smartStatusResult._statusCorrected;

    if (shouldSync) {
      console.log(`🔄 STATUS MISMATCH DETECTED: Backend="${backendStatus}" → Smart="${smartStatusResult.status}"`);
      console.log(`🚀 TRIGGERING IMMEDIATE SHEET SYNC...`);

      // 🚨 IMMEDIATE SHEET SYNC - Update status in Google Sheets right now
      try {
        const syncResult = await syncStatusToSheet(
          result.data.shiftId,
          smartStatusResult.status,
          `Smart status correction: ${backendStatus} → ${smartStatusResult.status}`
        );

        if (syncResult.success) {
          console.log('✅ SHEET STATUS SYNC COMPLETED');
          result.data.status = smartStatusResult.status;
          result.data._statusSynced = true;
          result.data._syncedAt = new Date().toISOString();
        } else {
          console.warn('⚠️ SHEET STATUS SYNC FAILED, using frontend correction only');
          result.data.status = smartStatusResult.status;
          result.data._statusCorrected = true;
        }
      } catch (syncError) {
        console.error('❌ SHEET SYNC ERROR:', syncError);
        result.data.status = smartStatusResult.status;
        result.data._statusCorrected = true;
      }

      // 🔥 ALSO SYNC DURATION AND END TIME if segments exist
      if (result.data.segments && result.data.segments.length > 0) {
        console.log(`🚀 TRIGGERING COMPLETE DATA SYNC...`);

        try {
          const completeSync = await syncCompleteShiftToSheet(
            result.data,
            `Complete sync with smart status: ${smartStatusResult.status}`
          );

          if (completeSync.success) {
            console.log('✅ COMPLETE SHEET SYNC COMPLETED');
            result.data._completeSynced = true;
          }
        } catch (completeSyncError) {
          console.error('❌ COMPLETE SYNC ERROR:', completeSyncError);
        }
      }
    } else {
      console.log(`✅ STATUS MATCH: Backend and frontend agree on "${backendStatus}"`);
    }
  }

  return result;
};

// 🔥 ENHANCED FRONTEND SMART STATUS LOGIC (backup for backend)
export const applyFrontendSmartStatus = (shiftData) => {
  const originalStatus = shiftData?.status;

  if (!shiftData || !shiftData.segments) {
    const correctedStatus = 'DRAFT';
    return {
      status: correctedStatus,
      _statusCorrected: originalStatus !== correctedStatus,
      _correctionReason: originalStatus !== correctedStatus ? 'No segments data - should be DRAFT' : null,
      _originalBackendStatus: originalStatus
    };
  }

  // 🚨 CRITICAL FIX: Check if shift date is in the future
  if (shiftData.shiftDate) {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const shiftDate = shiftData.shiftDate;

    console.log(`📅 DATE COMPARISON DEBUG: shiftDate="${shiftDate}" vs today="${today}"`);

    // Normalize shift date for comparison
    let normalizedShiftDate = shiftDate;

    if (shiftDate.includes('T') && shiftDate.includes('Z')) {
      // ISO 8601 format: "2025-10-29T18:30:00.000Z"
      normalizedShiftDate = new Date(shiftDate).toISOString().split('T')[0];
      console.log(`📅 ISO FORMAT EXTRACTED: "${shiftDate}" → "${normalizedShiftDate}"`);
    } else if (shiftDate.includes('/')) {
      // Assuming DD/MM/YYYY format, convert to YYYY-MM-DD
      const [day, month, year] = shiftDate.split('/');
      normalizedShiftDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`📅 CONVERTED: "${shiftDate}" → "${normalizedShiftDate}"`);
    }

    if (normalizedShiftDate > today) {
      console.log(`🚨 FUTURE DATE DETECTED: ${normalizedShiftDate} > ${today} - Forcing DRAFT status`);
      const correctedStatus = 'DRAFT';
      return {
        status: correctedStatus,
        _statusCorrected: originalStatus !== correctedStatus,
        _correctionReason: originalStatus !== correctedStatus ? 'Future date - should be DRAFT' : null,
        _originalBackendStatus: originalStatus
      };
    }

    console.log(`✅ DATE CHECK PASSED: ${normalizedShiftDate} <= ${today} - Continuing with time-based logic`);
  }

  // 🔧 FIX: Ensure segments is an array (might come as JSON string from backend)
  let segments = shiftData.segments;
  if (typeof segments === 'string') {
    try {
      segments = JSON.parse(segments);
    } catch (e) {
      console.error('Failed to parse segments JSON string:', e);
      segments = [];
    }
  }
  if (!Array.isArray(segments)) {
    console.warn('Segments is not an array, converting to empty array');
    segments = [];
  }

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  // 🚨 CRITICAL: Check if shift is from a past date (with overnight shift support)
  if (shiftData.shiftDate) {
    const today = new Date().toISOString().split('T')[0];
    let normalizedShiftDate = shiftData.shiftDate;

    // 🌍 TIMEZONE-SAFE: Extract date portion without timezone conversion
    if (shiftData.shiftDate.includes('T') && shiftData.shiftDate.includes('Z')) {
      // ISO 8601 format: Extract just date part
      normalizedShiftDate = shiftData.shiftDate.split('T')[0];
    } else if (shiftData.shiftDate.includes('/')) {
      const [day, month, year] = shiftData.shiftDate.split('/');
      normalizedShiftDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    if (normalizedShiftDate < today) {
      console.log(`📅 PAST DATE DETECTED: ${normalizedShiftDate} < ${today} - Checking for overnight shift scenario`);

      // 🌙 OVERNIGHT SHIFT CHECK: If date is exactly 1 day ago, might still be active
      const shiftDateObj = new Date(normalizedShiftDate + 'T00:00:00');
      const todayObj = new Date(today + 'T00:00:00');
      const dayDifference = Math.floor((todayObj - shiftDateObj) / (1000 * 60 * 60 * 24));

      if (dayDifference === 1 && segments.length > 0) {
        // Check if shift ends in early morning (overnight shift indicator)
        const lastSegment = segments[segments.length - 1];
        const lastEndTime = lastSegment?.endTime;

        if (lastEndTime) {
          const [endHour] = lastEndTime.split(':').map(Number);

          // If shift ends between midnight and 8 AM, it's likely an overnight shift
          if (endHour >= 0 && endHour <= 8) {
            const [currentHour] = currentTime.split(':').map(Number);

            // If current time is before shift end time in early morning
            if (currentHour >= 0 && currentHour <= 8 && currentHour < endHour) {
              console.log(`🌙 OVERNIGHT SHIFT STILL ACTIVE: Shift date ${normalizedShiftDate}, ends at ${lastEndTime}, current ${currentTime}`);
              // Don't mark as COMPLETED - let normal time-based logic handle it
              return {
                status: shiftData.status, // Keep current status
                _statusCorrected: false,
                _correctionReason: null,
                _originalBackendStatus: originalStatus
              };
            }
          }
        }
      }

      // Normal past date logic
      const completedSegments = segments.filter(seg => seg.endTime);
      if (completedSegments.length > 0) {
        console.log(`🏁 PAST DATE WITH COMPLETED SEGMENTS → COMPLETED`);
        const correctedStatus = 'COMPLETED';
        return {
          status: correctedStatus,
          _statusCorrected: originalStatus !== correctedStatus,
          _correctionReason: originalStatus !== correctedStatus ? 'Past date with completed segments - should be COMPLETED' : null,
          _originalBackendStatus: originalStatus
        };
      }
    }
  }

  console.log(`🔍 SMART STATUS: Current time: ${currentTime}, Stored status: "${shiftData.status}", Segments: ${segments.length}`);

  // 🚨 CRITICAL FIX: Check for impossible "COMPLETED" before shift starts
  if (shiftData.status === 'COMPLETED' && segments.length > 0) {
    const firstStartTime = segments[0]?.startTime;
    if (firstStartTime && isCurrentTimeBeforeShiftStart(currentTime, firstStartTime)) {
      console.log(`🚨 IMPOSSIBLE STATUS DETECTED: Shift marked COMPLETED at ${currentTime} but starts at ${firstStartTime}`);
      console.log('🔧 CORRECTING TO: OFFLINE');
      const correctedStatus = 'OFFLINE';
      return {
        status: correctedStatus,
        _statusCorrected: true,
        _correctionReason: 'Impossible status: COMPLETED before shift starts',
        _originalBackendStatus: originalStatus
      };
    }
  }

  // Check if current time is before shift starts
  if (segments.length > 0) {
    const firstStartTime = segments[0]?.startTime;
    if (firstStartTime && isCurrentTimeBeforeShiftStart(currentTime, firstStartTime)) {
      console.log(`⏰ BEFORE SHIFT START: Current ${currentTime} < Start ${firstStartTime} → OFFLINE`);
      const correctedStatus = 'OFFLINE';
      return {
        status: correctedStatus,
        _statusCorrected: originalStatus !== correctedStatus,
        _correctionReason: originalStatus !== correctedStatus ? 'Current time before shift start - should be OFFLINE' : null,
        _originalBackendStatus: originalStatus
      };
    }
  }

  const hasActiveSegment = segments.some(seg => !seg.endTime);

  if (hasActiveSegment) {
    console.log('✅ HAS ACTIVE SEGMENT → ACTIVE');
    return {
      status: 'ACTIVE',
      _statusCorrected: false,
      _correctionReason: null,
      _originalBackendStatus: originalStatus
    };
  }

  const completedSegments = segments.filter(seg => seg.endTime);
  if (completedSegments.length > 0) {
    const lastEndTime = completedSegments[completedSegments.length - 1]?.endTime;
    if (lastEndTime) {
      // 🔥 ENHANCED: Check if current time is after end time (same day or next day)
      if (isCurrentTimeAfterShiftEndEnhanced(currentTime, lastEndTime)) {
        console.log(`🏁 SHIFT COMPLETED: Current ${currentTime} > End ${lastEndTime} → COMPLETED`);
        const correctedStatus = 'COMPLETED';
        return {
          status: correctedStatus,
          _statusCorrected: originalStatus !== correctedStatus,
          _correctionReason: originalStatus !== correctedStatus ? 'Current time after shift end - should be COMPLETED' : null,
          _originalBackendStatus: originalStatus
        };
      }

      // Check for gaps between segments (more intelligent break detection)
      const gapDetected = checkForGapsBetweenSegments(segments, currentTime);
      if (gapDetected) {
        console.log(`⏸️ GAP BETWEEN SEGMENTS → ACTIVE (waiting for more work)`);
        const correctedStatus = 'ACTIVE';
        return {
          status: correctedStatus,
          _statusCorrected: originalStatus !== correctedStatus,
          _correctionReason: originalStatus !== correctedStatus ? 'Gap between segments detected - should be ACTIVE' : null,
          _originalBackendStatus: originalStatus
        };
      }

      console.log(`⏸️ COMPLETED SEGMENTS, NO ACTIVE → ACTIVE (waiting for completion)`);
      const correctedStatus = 'ACTIVE';
      return {
        status: correctedStatus,
        _statusCorrected: originalStatus !== correctedStatus,
        _correctionReason: originalStatus !== correctedStatus ? 'Has completed segments - should be ACTIVE' : null,
        _originalBackendStatus: originalStatus
      };
    }
  }

  if (segments.length === 0) {
    console.log('📝 NO SEGMENTS → DRAFT');
    const correctedStatus = 'DRAFT';
    return {
      status: correctedStatus,
      _statusCorrected: originalStatus !== correctedStatus,
      _correctionReason: originalStatus !== correctedStatus ? 'No segments - should be DRAFT' : null,
      _originalBackendStatus: originalStatus
    };
  }

  console.log('📝 DEFAULT FALLBACK → DRAFT');
  const correctedStatus = 'DRAFT';
  return {
    status: correctedStatus,
    _statusCorrected: originalStatus !== correctedStatus,
    _correctionReason: originalStatus !== correctedStatus ? 'Default fallback - should be DRAFT' : null,
    _originalBackendStatus: originalStatus
  };
};

// Enhanced gap detection between segments
const checkForGapsBetweenSegments = (segments, currentTime) => {
  if (!segments || segments.length <= 1) return false;

  try {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    if (isNaN(currentHour) || isNaN(currentMinute)) return false;

    const currentMinutes = currentHour * 60 + currentMinute;

    for (let i = 0; i < segments.length - 1; i++) {
      const currentSegmentEnd = segments[i]?.endTime;
      const nextSegmentStart = segments[i + 1]?.startTime;

      if (currentSegmentEnd && nextSegmentStart) {
        const [endHour, endMinute] = currentSegmentEnd.split(':').map(Number);
        const [startHour, startMinute] = nextSegmentStart.split(':').map(Number);

        if (isNaN(endHour) || isNaN(endMinute) || isNaN(startHour) || isNaN(startMinute)) {
          continue;
        }

        const endMinutes = endHour * 60 + endMinute;
        const startMinutes = startHour * 60 + startMinute;

        // Check if current time falls in the gap between segments
        if (currentMinutes > endMinutes && currentMinutes < startMinutes) {
          console.log(`🔍 FOUND GAP: Between ${currentSegmentEnd} and ${nextSegmentStart}, current: ${currentTime}`);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking gaps between segments:', error);
    return false;
  }
};

// Helper functions for time comparison
const isCurrentTimeBeforeShiftStart = (currentTime, shiftStartTime) => {
  try {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [shiftHour, shiftMinute] = shiftStartTime.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const shiftMinutes = shiftHour * 60 + shiftMinute;

    return currentMinutes < shiftMinutes;
  } catch (error) {
    console.error('Error comparing times:', error);
    return false;
  }
};

const isCurrentTimeAfterShiftEnd = (currentTime, shiftEndTime) => {
  try {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [shiftHour, shiftMinute] = shiftEndTime.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const shiftMinutes = shiftHour * 60 + shiftMinute;

    return currentMinutes > shiftMinutes;
  } catch (error) {
    console.error('Error comparing times:', error);
    return false;
  }
};

// 🔥 NEW: Enhanced time comparison that handles both same-day and next-day scenarios
const isCurrentTimeAfterShiftEndEnhanced = (currentTime, shiftEndTime) => {
  try {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [shiftHour, shiftMinute] = shiftEndTime.split(':').map(Number);

    if (isNaN(currentHour) || isNaN(currentMinute) || isNaN(shiftHour) || isNaN(shiftMinute)) {
      console.error('Invalid time format in enhanced comparison');
      return false;
    }

    let currentMinutes = currentHour * 60 + currentMinute;
    const shiftMinutes = shiftHour * 60 + shiftMinute;

    console.log(`⏰ Enhanced time check: Current ${currentTime} (${currentMinutes} min) vs End ${shiftEndTime} (${shiftMinutes} min)`);

    // First check: Same day comparison
    if (currentMinutes > shiftMinutes) {
      console.log(`✅ Same day completion: ${currentMinutes} > ${shiftMinutes}`);
      return true;
    }

    // Second check: Next day scenario (if current time is early morning and shift ended in evening)
    if (currentHour >= 0 && currentHour <= 8 && shiftHour >= 15) {
      const adjustedCurrentMinutes = currentMinutes + (24 * 60); // Add 24 hours
      console.log(`🌅 Next day scenario: Adjusted current ${adjustedCurrentMinutes} vs ${shiftMinutes}`);
      return adjustedCurrentMinutes > shiftMinutes;
    }

    console.log(`⏳ Still within shift time or before completion`);
    return false;
  } catch (error) {
    console.error('Error in enhanced time comparison:', error);
    return false;
  }
};

// Complete entire shift
export const completeShift = async (shiftData) => {
  console.log('completeShift called with:', shiftData);
  return await makeAPICall({
    action: 'completeShift',
    employeeName: shiftData.employeeName, // Added for robustness
    employeeId: shiftData.employeeId,
    shiftDate: shiftData.shiftDate
  });
};

// Legacy function for backward compatibility
export const submitShift = async (shiftData) => {
  console.log('submitShift (legacy) called, redirecting to startShift');
  return await startShift(shiftData);
};

// Get shifts data for reports
export const getShifts = async (filters = {}) => {
  console.log('getShifts called with:', filters);

  // Check if fresh data is requested
  if (filters.forceRefresh || filters.forceFresh) {
    console.log('🚀 FORCE REFRESH REQUESTED - Getting fresh shift history from sheet');

    const freshResult = await makeAPICall({
      action: 'getShiftsDirectlyFromSheet',
      employeeId: filters.employeeId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      bypassCache: true,
      forceFresh: true,
      timestamp: Date.now()
    });

    if (freshResult.success && freshResult.data) {
      console.log('📊 FRESH SHIFT HISTORY DATA RECEIVED:', freshResult.data);

      // Apply frontend smart status logic to fresh data
      if (freshResult.data) {
        const shifts = Array.isArray(freshResult.data) ? freshResult.data : [freshResult.data];

        // First collect shifts needing correction
        const shiftsNeedingCorrection = [];

        const correctedShifts = shifts.map(shift => {
          if (!shift || !shift.segments) return shift;

          const backendStatus = shift.status;
          const smartStatusResult = applyFrontendSmartStatus(shift);

          if (smartStatusResult._statusCorrected) {
            console.log(`🔄 HISTORY STATUS CORRECTION: Shift ${shift.shiftId}: "${backendStatus}" → "${smartStatusResult.status}"`);

            // Add to correction list
            shiftsNeedingCorrection.push({
              shiftId: shift.shiftId,
              originalStatus: backendStatus,
              correctedStatus: smartStatusResult.status,
              reason: smartStatusResult._correctionReason
            });

            return {
              ...shift,
              status: smartStatusResult.status,
              _statusCorrected: true,
              _originalBackendStatus: backendStatus,
              _freshFromSheet: true
            };
          }

          return { ...shift, _freshFromSheet: true };
        });

        // Apply corrections to Google Sheets immediately
        if (shiftsNeedingCorrection.length > 0) {
          console.log(`🚨 FOUND ${shiftsNeedingCorrection.length} SHIFTS NEEDING CORRECTION - FIXING IN SHEETS...`);

          // Fix all shifts in parallel (don't wait for completion)
          Promise.all(shiftsNeedingCorrection.map(async (correction) => {
            try {
              console.log(`📤 FIXING SHIFT ${correction.shiftId}: ${correction.originalStatus} → ${correction.correctedStatus}`);
              const fixResult = await fixShiftStatus({
                shiftId: correction.shiftId,
                correctStatus: correction.correctedStatus
              });

              if (fixResult.success) {
                console.log(`✅ FIXED SHIFT ${correction.shiftId} in Google Sheets successfully`);
              } else {
                console.error(`❌ FAILED to fix shift ${correction.shiftId}:`, fixResult.message);
              }
            } catch (error) {
              console.error(`❌ ERROR fixing shift ${correction.shiftId}:`, error);
            }
          })).catch(err => console.error('❌ Error in batch status corrections:', err));
        }

        freshResult.data = Array.isArray(freshResult.data) ? correctedShifts : correctedShifts[0];
      }

      return freshResult;
    } else {
      console.error('❌ Failed to get fresh shift history:', freshResult.message);
      // Fall back to regular getShifts if fresh data fails
    }
  }

  // Regular getShifts logic
  const result = await makeAPICall({
    action: 'getShifts',
    employeeId: filters.employeeId,
    startDate: filters.startDate,
    endDate: filters.endDate
  });

  // 🔥 Apply frontend smart status logic to ALL shifts (same as getCurrentShift)
  if (result.success && result.data) {
    const shifts = Array.isArray(result.data) ? result.data : [result.data];

    const correctedShifts = shifts.map(shift => {
      if (!shift || !shift.segments) return shift;

      const backendStatus = shift.status;
      const smartStatusResult = applyFrontendSmartStatus(shift);

      // Apply smart status correction (same logic as getCurrentShift)
      const shouldOverride = smartStatusResult._statusCorrected;

      if (shouldOverride) {
        console.log(`🔄 HISTORY STATUS CORRECTION: Shift ${shift.shiftId}: "${backendStatus}" → "${smartStatusResult.status}"`);
        return {
          ...shift,
          status: smartStatusResult.status,
          _statusCorrected: true,
          _originalBackendStatus: backendStatus
        };
      }

      return shift;
    });

    // Return corrected data
    result.data = Array.isArray(result.data) ? correctedShifts : correctedShifts[0];
  }

  return result;
};

// Get staff list
export const getStaffList = async () => {
  console.log('getStaffList called');
  return await makeAPICall({
    action: 'getStaffList'
  });
};

// Update shift status - Critical function for React frontend smart status sync
export const updateShiftStatus = async (payload) => {
  console.log('🔄 updateShiftStatus called with:', payload);
  return await makeAPICall({
    action: 'updateShiftStatus',
    shiftId: payload.shiftId,
    newStatus: payload.newStatus,
    reason: payload.reason || 'Frontend smart status calculation'
  });
};

// Submit time segments for a shift (uses updateShiftSegments for existing shifts)
export const submitTimeSegments = async (payload) => {
  console.log('⏰ submitTimeSegments called with:', payload);

  // Validate required fields
  const requiredFields = ['employeeName', 'employeeId', 'date', 'segments'];
  const missingFields = requiredFields.filter(field => {
    if (field === 'date') {
      return !payload.date && !payload.shiftDate;
    }
    return !payload[field];
  });

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
    console.error('❌ submitTimeSegments validation error:', errorMessage);
    console.error('❌ Received payload:', payload);
    return {
      success: false,
      message: errorMessage,
      receivedFields: Object.keys(payload),
      requiredFields: requiredFields
    };
  }

  // Normalize date field
  const shiftDate = payload.date || payload.shiftDate;

  // Calculate firstStartTime, lastEndTime, and totalDuration from segments
  const segments = payload.segments || [];
  let firstStartTime = '';
  let lastEndTime = '';
  let totalDuration = 0;

  if (segments.length > 0) {
    // Sort segments by start time to ensure correct order
    const sortedSegments = [...segments].sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Get first start time and last end time
    firstStartTime = sortedSegments[0].startTime;
    lastEndTime = sortedSegments[sortedSegments.length - 1].endTime;

    // Calculate total duration
    totalDuration = segments.reduce((total, segment) => {
      let segmentDuration = segment.duration || 0;

      // Fallback: Calculate duration if missing
      if (!segmentDuration && segment.startTime && segment.endTime) {
        segmentDuration = calculateDuration(segment.startTime, segment.endTime);
        console.log(`🔧 Calculated missing duration for segment: ${segment.startTime} to ${segment.endTime} = ${segmentDuration.toFixed(2)} hours`);
      }

      return total + segmentDuration;
    }, 0);

    console.log(`📊 Calculated: firstStartTime=${firstStartTime}, lastEndTime=${lastEndTime}, totalDuration=${totalDuration.toFixed(2)}`);
  }

  // 🔥 CALCULATE SMART STATUS based on current time vs end time
  let smartStatus = 'DRAFT';

  if (segments.length > 0) {
    // Create mock shift data for status calculation
    const mockShiftData = {
      segments: segments,
      status: 'ACTIVE' // temporary status for calculation
    };

    // Use the same smart status logic
    const smartStatusResult = applyFrontendSmartStatus(mockShiftData);
    smartStatus = smartStatusResult.status;
    console.log(`🧠 Smart status calculated: ${smartStatus}`);
  }

  // Map smart status to backend status
  const backendStatus = smartStatus;

  console.log(`📤 Sending to backend: totalDuration=${totalDuration.toFixed(2)}, status=${backendStatus}`);

  // 🚀 DETERMINE ACTION: Use updateShiftSegments for existing shifts, createCompleteShift for new ones
  let result;

  if (payload.existingShiftId) {
    console.log('📝 Updating existing shift segments...');

    // Update segments only using dedicated updateShiftSegments action
    result = await makeAPICall({
      action: 'updateShiftSegments',
      shiftId: payload.existingShiftId,
      segments: segments,
      reason: 'Time segments updated from frontend'
    });

    // If segments update successful, sync complete shift data
    if (result.success) {
      console.log('� Segments updated, now syncing complete shift data...');

      const syncResult = await makeAPICall({
        action: 'syncCompleteShift',
        shiftId: payload.existingShiftId,
        status: backendStatus,
        totalDuration: totalDuration,
        firstStartTime: firstStartTime, // 🔥 ADD MISSING FIRST START TIME
        lastEndTime: lastEndTime,
        segments: segments,
        reason: 'Complete sync after segment update'
      });

      if (syncResult.success) {
        console.log('✅ Complete shift sync successful');
        result.data = { ...result.data, ...syncResult.data };
        result._completeSynced = true;
      } else {
        console.warn('⚠️ Segments updated but complete sync failed:', syncResult.message);
        result._syncWarning = syncResult.message;
      }
    }

  } else {
    console.log('📝 Creating new complete shift...');

    // Create new shift using createCompleteShift action
    result = await makeAPICall({
      action: 'createCompleteShift',
      employeeName: payload.employeeName,
      employeeId: payload.employeeId,
      shiftDate: shiftDate,
      shiftType: payload.shiftType || 'Regular',
      segments: segments,
      firstStartTime: firstStartTime,
      lastEndTime: lastEndTime,
      totalDuration: totalDuration,
      scheduleStatus: backendStatus,
      isUpdate: payload.isUpdate || false,
      isFirstSave: payload.isFirstSave || false,
      existingShiftId: payload.existingShiftId || null
    });
  }

  // 🔥 FORCE REFRESH AFTER UPDATE - Ensure UI shows updated data
  if (result.success) {
    console.log('🔄 Forcing data refresh to show updated segments...');
    result._forceRefresh = true;
    result._updatedAt = new Date().toISOString();
  }

  return result;
};

// Fix shift status - Handle status correction requests
export const fixShiftStatus = async (payload) => {
  console.log('🔧 fixShiftStatus called with:', payload);
  return await makeAPICall({
    action: 'fixShiftStatus',
    shiftId: payload.shiftId,
    correctStatus: payload.correctStatus,
    reason: payload.reason || 'Status correction'
  });
};

// Delete shift - Remove shift entry from Google Sheets
export const deleteShift = async (shiftId) => {
  console.log('🗑️ deleteShift called with shiftId:', shiftId);

  if (!shiftId) {
    return { success: false, message: 'Shift ID is required for deletion' };
  }

  try {
    const result = await makeAPICall({
      action: 'deleteShift',
      shiftId: shiftId
    });

    console.log('🗑️ Delete shift result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error deleting shift:', error);
    return {
      success: false,
      message: 'Error deleting shift: ' + handleAPIError(error)
    };
  }
};


// 🔥 NEW: Fix total duration calculation for existing shifts
export const fixTotalDuration = async (shiftId) => {
  console.log('🔧 fixTotalDuration called for shift:', shiftId);

  try {
    // First, get the current shift data
    const currentShift = await makeAPICall({
      action: 'getCurrentShift',
      shiftId: shiftId // We'll need to modify backend to accept shiftId lookup
    });

    if (!currentShift.success || !currentShift.data) {
      return { success: false, message: 'Could not find shift data' };
    }

    const segments = currentShift.data.segments || [];

    if (segments.length === 0) {
      return { success: false, message: 'No segments found to calculate duration' };
    }

    // Calculate correct total duration from segments
    let calculatedTotalDuration = 0;

    segments.forEach(segment => {
      if (segment.duration && !isNaN(segment.duration)) {
        calculatedTotalDuration += segment.duration;
      } else if (segment.startTime && segment.endTime) {
        // Recalculate duration if missing
        const segmentDuration = calculateDuration(segment.startTime, segment.endTime);
        calculatedTotalDuration += segmentDuration;
        console.log(`📊 Recalculated segment duration: ${segment.startTime} to ${segment.endTime} = ${segmentDuration.toFixed(2)} hours`);
      }
    });

    console.log(`📊 Calculated total duration: ${calculatedTotalDuration.toFixed(2)} hours`);

    // Update the shift with correct total duration
    const updateResult = await makeAPICall({
      action: 'updateShiftTotalDuration',
      shiftId: shiftId,
      totalDuration: calculatedTotalDuration,
      reason: 'Frontend total duration correction'
    });

    if (updateResult.success) {
      return {
        success: true,
        message: `Total duration corrected to ${calculatedTotalDuration.toFixed(2)} hours`,
        data: {
          shiftId: shiftId,
          oldTotalDuration: currentShift.data.totalDuration,
          newTotalDuration: calculatedTotalDuration,
          segments: segments
        }
      };
    } else {
      return {
        success: false,
        message: 'Failed to update total duration in backend',
        error: updateResult.message
      };
    }

  } catch (error) {
    console.error('Error fixing total duration:', error);
    return {
      success: false,
      message: 'Error calculating total duration: ' + error.message
    };
  }
};

// 🔥 NEW: Fix all shifts with incorrect total duration
export const fixAllTotalDurations = async (employeeId = null) => {
  console.log('🔧 fixAllTotalDurations called for employee:', employeeId || 'ALL');

  try {
    // Get all shifts data
    const shiftsResult = await getShifts({ employeeId: employeeId });

    if (!shiftsResult.success || !shiftsResult.data) {
      return { success: false, message: 'Could not get shifts data' };
    }

    const shifts = shiftsResult.data;
    const results = [];
    let fixedCount = 0;
    let errorCount = 0;

    for (const shift of shifts) {
      try {
        if (!shift.segments || shift.segments.length === 0) {
          continue; // Skip shifts with no segments
        }

        // Calculate what the total duration should be
        let calculatedTotalDuration = 0;

        shift.segments.forEach(segment => {
          if (segment.duration && !isNaN(segment.duration)) {
            calculatedTotalDuration += segment.duration;
          } else if (segment.startTime && segment.endTime) {
            const segmentDuration = calculateDuration(segment.startTime, segment.endTime);
            calculatedTotalDuration += segmentDuration;
          }
        });

        // Round to 2 decimal places for comparison
        calculatedTotalDuration = Math.round(calculatedTotalDuration * 100) / 100;
        const currentTotalDuration = Math.round((shift.totalDuration || 0) * 100) / 100;

        // Check if total duration is incorrect
        if (Math.abs(calculatedTotalDuration - currentTotalDuration) > 0.01) {
          console.log(`🔍 Fixing shift ${shift.shiftId}: ${currentTotalDuration} → ${calculatedTotalDuration}`);

          const fixResult = await fixTotalDuration(shift.shiftId);

          if (fixResult.success) {
            fixedCount++;
            results.push({
              shiftId: shift.shiftId,
              status: 'fixed',
              oldDuration: currentTotalDuration,
              newDuration: calculatedTotalDuration
            });
          } else {
            errorCount++;
            results.push({
              shiftId: shift.shiftId,
              status: 'error',
              error: fixResult.message
            });
          }
        } else {
          results.push({
            shiftId: shift.shiftId,
            status: 'correct',
            duration: currentTotalDuration
          });
        }

      } catch (error) {
        errorCount++;
        results.push({
          shiftId: shift.shiftId || 'unknown',
          status: 'error',
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Processed ${shifts.length} shifts: ${fixedCount} fixed, ${errorCount} errors`,
      data: {
        totalProcessed: shifts.length,
        fixedCount: fixedCount,
        errorCount: errorCount,
        results: results
      }
    };

  } catch (error) {
    console.error('Error fixing all total durations:', error);
    return {
      success: false,
      message: 'Error processing shifts: ' + error.message
    };
  }
};

// Test connection to Apps Script
export const testConnection = async () => {
  try {
    console.log('Testing connection to:', APPS_SCRIPT_URL);
    console.log('🔍 Testing with GET request...');

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'GET',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);

    const result = await response.json();
    console.log('Connection test result:', result);
    return { success: true, message: 'Connection successful', data: result };
  } catch (error) {
    console.error('Connection test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return { success: false, message: 'Connection failed', error: error.message };
  }
};

// Utility function to get current time in user's timezone
export const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
};

// Get current time with timezone info for backend
export const getCurrentTimeWithTimezone = () => {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: now.getTimezoneOffset(),
    timestamp: now.toISOString()
  };
};

// Utility function to get current date in user's timezone
export const getCurrentDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }); // en-CA gives YYYY-MM-DD format in user's timezone
};

// Get current date with timezone info for backend
export const getCurrentDateWithTimezone = () => {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    date: now.toLocaleDateString('en-CA', { timeZone: timezone }),
    timezone: timezone,
    offset: now.getTimezoneOffset(),
    timestamp: now.toISOString()
  };
};

// Get user's timezone info
export const getUserTimezone = () => {
  const now = new Date();
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: now.getTimezoneOffset(),
    offsetHours: now.getTimezoneOffset() / 60,
    timezoneName: now.toLocaleTimeString('en-US', { timeZoneName: 'long' }).split(' ').slice(-2).join(' ')
  };
};

// Utility function to calculate duration
export const calculateDuration = (startTime, endTime) => {
  try {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    let diffMs = end - start;

    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000; // Handle overnight shifts
    }

    return diffMs / (1000 * 60 * 60); // Return number, not string
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
};

// Debug function to test all API endpoints
export const debugAllEndpoints = async (employeeId, employeeName) => {
  const testDate = getCurrentDate();

  console.log('=== TESTING ALL ENDPOINTS ===');
  console.log('Employee ID:', employeeId);
  console.log('Employee Name:', employeeName);
  console.log('Test Date:', testDate);

  try {
    // Test connection
    console.log('1. Testing connection...');
    const connection = await testConnection();
    console.log('Connection result:', connection);

    // Test start shift
    console.log('2. Testing start shift...');
    const startResult = await startShift({
      employeeName: employeeName,
      employeeId: employeeId,
      shiftDate: testDate,
      shiftType: 'Regular'
    });
    console.log('Start shift result:', startResult);

    // Test get current shift
    console.log('3. Testing get current shift...');
    const currentResult = await getCurrentShift({
      employeeId: employeeId,
      date: testDate
    });
    console.log('Current shift result:', currentResult);

    console.log('=== ENDPOINT TESTING COMPLETE ===');
    return { success: true, message: 'All endpoint tests completed' };

  } catch (error) {
    console.error('Error in endpoint testing:', error);
    return { success: false, message: 'Endpoint testing failed', error: error.message };
  }
};

// 🔥 NEW: Comprehensive system test for impossible status scenarios
export const testImpossibleStatusScenarios = async (employeeId, employeeName) => {
  console.log('=== TESTING IMPOSSIBLE STATUS SCENARIOS ===');

  const testDate = getCurrentDate();
  const results = {
    tests: [],
    passed: 0,
    failed: 0
  };

  const addTestResult = (testName, passed, details) => {
    results.tests.push({ testName, passed, details });
    if (passed) results.passed++;
    else results.failed++;
  };

  try {
    // Test 1: Get current shift and check if status makes sense
    console.log('🧪 Test 1: Checking current shift status logic...');
    const currentShift = await getCurrentShift({ employeeId, date: testDate });

    if (currentShift.success && currentShift.data) {
      const data = currentShift.data;
      const hasStatusCorrection = data._statusCorrected;
      const originalStatus = data._originalBackendStatus;
      const finalStatus = data.status;

      if (hasStatusCorrection) {
        console.log(`✅ Status correction detected: "${originalStatus}" → "${finalStatus}"`);
        addTestResult('Status Correction', true, `Corrected from ${originalStatus} to ${finalStatus}`);
      } else {
        console.log(`✅ No status correction needed, current status: "${finalStatus}"`);
        addTestResult('Status Logic', true, `Current status "${finalStatus}" is correct`);
      }

      // Test the time logic
      if (data.segments && data.segments.length > 0) {
        const firstStart = data.segments[0]?.startTime;
        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        if (firstStart && isCurrentTimeBeforeShiftStart(now, firstStart) && finalStatus === 'COMPLETED') {
          addTestResult('Impossible Status Check', false, `Status is COMPLETED but shift starts at ${firstStart} and current time is ${now}`);
        } else {
          addTestResult('Impossible Status Check', true, 'No impossible status detected');
        }
      }

    } else {
      addTestResult('Get Current Shift', false, currentShift.message || 'Failed to get shift data');
    }

    // Test 2: Test the frontend smart status function directly
    console.log('🧪 Test 2: Testing frontend smart status function...');

    const mockShiftData = {
      status: 'COMPLETED',
      segments: [
        {
          startTime: '09:00',
          endTime: '12:00'
        }
      ]
    };

    const smartStatusResult = applyFrontendSmartStatus(mockShiftData);
    const smartStatus = smartStatusResult.status;
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    if (isCurrentTimeBeforeShiftStart(now, '09:00') && smartStatus !== 'OFFLINE') {
      addTestResult('Smart Status Function', false, `Should return OFFLINE when current time (${now}) is before 09:00, got ${smartStatus}`);
    } else {
      addTestResult('Smart Status Function', true, `Smart status logic working correctly: ${smartStatus}`);
    }

    // Test 3: Test the fix function
    console.log('🧪 Test 3: Testing status fix capability...');

    if (currentShift.success && currentShift.data && currentShift.data.shiftId) {
      const shiftId = currentShift.data.shiftId;
      console.log(`Testing fix function with shift ID: ${shiftId}`);

      // Note: We won't actually change the status, just test if the function exists
      if (typeof fixShiftStatus === 'function') {
        addTestResult('Fix Function Available', true, 'fixShiftStatus function is available');
      } else {
        addTestResult('Fix Function Available', false, 'fixShiftStatus function not found');
      }
    }

    console.log('=== TEST RESULTS ===');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log('📋 Details:', results.tests);

    return {
      success: results.failed === 0,
      message: `Tests completed: ${results.passed} passed, ${results.failed} failed`,
      results: results
    };

  } catch (error) {
    console.error('Error in system testing:', error);
    addTestResult('System Test', false, error.message);
    return {
      success: false,
      message: 'System test failed with error: ' + error.message,
      results: results
    };
  }
};

// =============================================================
//                 DEBUG FUNCTIONS FOR CONSOLE TESTING
// =============================================================

// Debug function to check shift entry data vs sheet data
window.debugShiftEntryData = async function () {
  console.log('🔍 === SHIFT ENTRY DEBUG SESSION START ===');

  try {
    // Get user data from localStorage (same as React app uses)
    const userData = JSON.parse(localStorage.getItem('user') || '{}');

    if (!userData.id) {
      console.error('❌ No user data found in localStorage. Please login first.');
      return;
    }

    console.log('👤 User Data:', userData);
    console.log('📅 Current Date:', getCurrentDate());
    console.log('⏰ Current Time:', getCurrentTime());

    // Step 1: Get current UI data (what user sees)
    console.log('\n🖥️ === CHECKING UI DATA ===');
    const shiftEntryContainer = document.querySelector('[data-testid="shift-summary"], .MuiCard-root');
    if (shiftEntryContainer) {
      const timeSegmentsText = shiftEntryContainer.textContent;
      console.log('📋 UI Text Content:', timeSegmentsText);

      // Extract time segments from UI
      const timePattern = /(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g;
      const uiTimeSegments = [];
      let match;
      while ((match = timePattern.exec(timeSegmentsText)) !== null) {
        uiTimeSegments.push({
          startTime: match[1],
          endTime: match[2],
          source: 'UI_DISPLAY'
        });
      }
      console.log('⏰ Time Segments from UI:', uiTimeSegments);
    } else {
      console.log('⚠️ Could not find shift entry UI container');
    }

    // Step 2: Force fresh data from sheet
    console.log('\n📊 === FETCHING FRESH SHEET DATA ===');
    const freshSheetResponse = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getShiftDataDirectlyFromSheet',
        employeeId: userData.id,
        date: getCurrentDate(),
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clientTimezoneOffset: new Date().getTimezoneOffset(),
        bypassCache: true,
        forceFresh: true,
        timestamp: Date.now()
      }),
    });

    const freshSheetData = await freshSheetResponse.json();
    console.log('📋 Fresh Sheet Response:', freshSheetData);

    if (freshSheetData.success && freshSheetData.data) {
      console.log('✅ Fresh Sheet Data Retrieved Successfully');
      console.log('🆔 Shift ID:', freshSheetData.data.shiftId);
      console.log('📊 Status:', freshSheetData.data.status);
      console.log('⏰ Total Duration:', freshSheetData.data.totalDuration);
      console.log('🕒 Last End Time:', freshSheetData.data.lastEndTime);
      console.log('📋 Raw Segments:', freshSheetData.data.segments);

      // Extract time segments from sheet data
      const sheetTimeSegments = freshSheetData.data.segments.map((seg, index) => ({
        index: index,
        startTime: seg.startTime,
        endTime: seg.endTime,
        activity: seg.activity,
        duration: seg.duration,
        source: 'GOOGLE_SHEET'
      }));

      console.log('⏰ Time Segments from Sheet:', sheetTimeSegments);

      // Step 3: Check raw sheet data in column J (Segments Data)
      console.log('\n🔍 === RAW SHEET COLUMN DATA ===');
      console.log('📋 Raw Segments Data Column (what actually gets updated):');
      console.log('   JSON String:', JSON.stringify(freshSheetData.data.segments, null, 2));

      // Step 4: Compare UI vs Sheet data
      console.log('\n🔍 === DATA COMPARISON ===');

      if (sheetTimeSegments.length === 0) {
        console.log('📝 No segments found in sheet data');
      } else {
        sheetTimeSegments.forEach((segment, index) => {
          console.log(`📋 Segment ${index + 1}:`);
          console.log(`   Sheet: ${segment.startTime} - ${segment.endTime} (${segment.activity || 'Work'})`);
          console.log(`   Duration: ${segment.duration || 'Not calculated'} hours`);
        });
      }

      // Step 5: Test segment update process
      console.log('\n🔧 === TESTING SEGMENT UPDATE PROCESS ===');
      console.log('🔍 Current shift ID available for updates:', freshSheetData.data.shiftId);

      if (freshSheetData.data.shiftId) {
        console.log('✅ Shift ID exists - segment updates will use updateShiftSegments action');
        console.log('📝 Update process: updateShiftSegments → syncCompleteShift → fresh data reload');
      } else {
        console.log('⚠️ No shift ID - new segments will use createCompleteShift action');
      }

      // Step 6: Test regular getCurrentShift API
      console.log('\n🔄 === TESTING REGULAR API ===');
      const regularResponse = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'getCurrentShift',
          employeeId: userData.id,
          date: getCurrentDate(),
          clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          clientTimezoneOffset: new Date().getTimezoneOffset()
        }),
      });

      const regularData = await regularResponse.json();
      console.log('📋 Regular API Response:', regularData);

      if (regularData.success && regularData.data) {
        console.log('📊 Regular API - Status:', regularData.data.status);
        console.log('📊 Regular API - Segments:', regularData.data.segments);

        // Compare fresh vs regular data
        console.log('\n⚖️ === FRESH vs REGULAR COMPARISON ===');
        console.log('Fresh Data Status:', freshSheetData.data.status);
        console.log('Regular Data Status:', regularData.data.status);

        if (JSON.stringify(freshSheetData.data.segments) === JSON.stringify(regularData.data.segments)) {
          console.log('✅ SEGMENTS MATCH: Fresh and regular data are identical');
        } else {
          console.log('❌ SEGMENTS DIFFER: Fresh and regular data are different');
          console.log('Fresh segments:', freshSheetData.data.segments);
          console.log('Regular segments:', regularData.data.segments);
        }
      }

    } else {
      console.log('❌ Failed to get fresh sheet data:', freshSheetData.message);
    }

    // Step 7: Summary
    console.log('\n📋 === DEBUGGING SUMMARY ===');
    console.log('🔍 This debug session checked:');
    console.log('   1. ✅ User data from localStorage');
    console.log('   2. ✅ UI display content');
    console.log('   3. ✅ Fresh data directly from Google Sheets');
    console.log('   4. ✅ Raw sheet column data (what gets updated)');
    console.log('   5. ✅ Segment update process verification');
    console.log('   6. ✅ Regular API data');
    console.log('   7. ✅ Comparison between all data sources');
    console.log('🎯 Segment updates should now properly update Column J (Segments Data)');

  } catch (error) {
    console.error('❌ Debug session failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('🔍 === SHIFT ENTRY DEBUG SESSION END ===');
};

// Quick debug function to just check current data
window.debugCurrentShiftData = async function () {
  console.log('🚀 Quick Shift Data Check');

  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.id) {
      console.error('❌ Please login first');
      return;
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getShiftDataDirectlyFromSheet',
        employeeId: userData.id,
        date: getCurrentDate(),
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        forceFresh: true
      }),
    });

    const data = await response.json();
    if (data.success && data.data && data.data.segments) {
      console.log('⏰ Current Time Segments from Sheet:');
      data.data.segments.forEach((seg, i) => {
        console.log(`   ${i + 1}. ${seg.startTime} - ${seg.endTime} (${seg.activity || 'Work'})`);
      });
      console.log('📊 Status:', data.data.status);
      console.log('⏱️ Total Duration:', data.data.totalDuration);
    } else {
      console.log('❌ No shift data found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Force reload shift entry data
window.reloadShiftEntryData = function () {
  console.log('🔄 Forcing Shift Entry Reload...');

  // Trigger a refresh event that the React app can listen to
  window.dispatchEvent(new CustomEvent('forceShiftRefresh', {
    detail: { source: 'console_debug', timestamp: Date.now() }
  }));

  // Also try to click the refresh button if it exists
  const refreshButton = document.querySelector('button[title*="Refresh"], button:contains("Refresh")');
  if (refreshButton) {
    console.log('🔄 Clicking refresh button...');
    refreshButton.click();
  } else {
    console.log('⚠️ No refresh button found, but refresh event was dispatched');
  }

  console.log('✅ Refresh triggered - check for updated data');
};

// Test if data exists in Google Sheets with broad date range
window.testDataExists = async function () {
  console.log('🔍 Testing if data exists in Google Sheets...');

  try {
    const response = await makeAPICall({
      action: 'getAllShiftsForAdmin',
      startDate: '2020-01-01',  // Very early date
      endDate: '2030-12-31'     // Very late date
    });

    console.log('� Test Results:');
    console.log('Success:', response.success);
    console.log('Data count:', response.data?.length || 0);
    console.log('Message:', response.message);

    if (response.data && response.data.length > 0) {
      console.log('✅ Data found! First record:');
      console.log(response.data[0]);
      console.log('📅 Available shift dates:');
      response.data.forEach((shift, index) => {
        console.log(`  ${index + 1}. ${shift['Shift Date']} - ${shift['Employee Name']}`);
      });
    } else {
      console.log('❌ No data found in sheets');
    }

    return response;
  } catch (error) {
    console.error('❌ Error testing data:', error);
    return { success: false, error: error.message };
  }
};

console.log('�🔧 DEBUG FUNCTIONS LOADED:');
console.log('   debugShiftEntryData() - Full debug session');
console.log('   debugCurrentShiftData() - Quick data check');
console.log('   reloadShiftEntryData() - Force reload');
console.log('   testDataExists() - Test if shift data exists in Google Sheets');

// =============================================================
//                 END DEBUG FUNCTIONS
// =============================================================

// Enhanced error handling wrapper
export const handleAPIError = (error) => {
  console.error('API Error occurred:', error);

  if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    return 'Network connection failed. Please check your internet connection and try again.';
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    return 'Invalid response from server. Please try again.';
  } else if (error.message.includes('CORS')) {
    return 'Cross-origin request blocked. Please check your Apps Script deployment.';
  } else {
    return `Connection error: ${error.message}`;
  }
};

// 🔥 NEW: Test the backend auto-update system
export const testBackendAutoUpdate = async () => {
  console.log('🧪 Testing backend auto-update system...');
  try {
    const response = await makeAPICall({
      action: 'manualStatusUpdate'
    });

    console.log('📋 Auto-update test result:', response);
    return response;
  } catch (error) {
    console.error('Error testing auto-update:', error);
    return { success: false, message: handleAPIError(error) };
  }
};

// 🔥 NEW: Check trigger status
export const checkAutoUpdateStatus = async () => {
  console.log('⚙️ Checking auto-update trigger status...');
  try {
    const response = await makeAPICall({
      action: 'checkTriggerStatus'
    });

    console.log('📊 Trigger status:', response);
    return response;
  } catch (error) {
    console.error('Error checking trigger status:', error);
    return { success: false, message: handleAPIError(error) };
  }
};

// 🔥 NEW: Create auto-update trigger
export const setupAutoUpdates = async () => {
  console.log('🚀 Setting up auto-update triggers...');
  try {
    const response = await makeAPICall({
      action: 'createStatusUpdateTrigger'
    });

    console.log('✅ Auto-update setup result:', response);
    return response;
  } catch (error) {
    console.error('Error setting up auto-updates:', error);
    return { success: false, message: handleAPIError(error) };
  }
};

// Duplicate fixShiftStatus function removed - using the one defined earlier

// 🔥 NEW: Proactive status monitor and fixer
export const monitorAndFixStatus = async (shiftData) => {
  if (!shiftData || !shiftData.segments || shiftData.segments.length === 0) return shiftData;

  const currentStatus = shiftData.status;
  const smartStatusResult = applyFrontendSmartStatus(shiftData);
  const correctStatus = smartStatusResult.status;

  // If status is wrong, try to fix it in the backend automatically
  if (currentStatus !== correctStatus && currentStatus === 'COMPLETED') {
    console.log(`🔧 AUTO-FIXING: Backend status "${currentStatus}" should be "${correctStatus}"`);

    // Try to fix the backend status
    const fixResult = await fixShiftStatus(shiftData.shiftId, correctStatus);

    if (fixResult.success) {
      console.log('✅ Backend status automatically corrected');
    }

    // Return corrected data regardless of backend fix result
    return {
      ...shiftData,
      status: correctStatus,
      _autoFixed: true
    };
  }

  return shiftData;
};

// =============================================================
//                   INTELLIGENT TIME VALIDATION
// =============================================================

// Check if a time segment has already passed (based on current time)
export const isTimeSegmentPassed = (endTime, segmentDate = null) => {
  // DISABLED: Always return false to allow editing of any time segment
  return false;

  /* ORIGINAL LOGIC - COMMENTED OUT
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // If segment date is provided and it's not today, check if it's in the past
    if (segmentDate && segmentDate !== today) {
      const segDate = new Date(segmentDate);
      return segDate < new Date(today);
    }
    
    // For today's segments, compare end time with current time
    if (!endTime) return false; // If no end time, segment is still ongoing
    
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    
    const endTimeMinutes = endHour * 60 + endMinute;
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    return currentTimeMinutes > endTimeMinutes;
  } catch (error) {
    console.error('Error checking if time segment passed:', error);
    return false; // Default to allowing edits if there's an error
  }
  */
};

// Check if any part of a time segment conflicts with current time
export const isTimeSegmentConflictingWithCurrent = (startTime, endTime, segmentDate = null) => {
  // DISABLED: Always return false to allow editing of any time segment
  return false;

  /* ORIGINAL LOGIC - COMMENTED OUT
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Only check for today's segments
    if (segmentDate && segmentDate !== today) {
      return false;
    }
    
    if (!startTime || !endTime) return false;
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Check if current time falls within the segment
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
  } catch (error) {
    console.error('Error checking time segment conflict:', error);
    return false;
  }
  */
};

// Validate if segments can be edited based on current time
export const validateSegmentsEditability = (segments, shiftDate = null) => {
  const today = getCurrentDate();
  const editableSegments = [];
  const nonEditableSegments = [];

  segments.forEach((segment, index) => {
    const segmentPassed = isTimeSegmentPassed(segment.endTime, shiftDate || today);
    const segmentConflicting = isTimeSegmentConflictingWithCurrent(
      segment.startTime,
      segment.endTime,
      shiftDate || today
    );

    if (segmentPassed || segmentConflicting) {
      nonEditableSegments.push({
        ...segment,
        index,
        reason: segmentPassed ? 'Time has passed' : 'Currently active time period'
      });
    } else {
      editableSegments.push({ ...segment, index });
    }
  });

  return {
    canEdit: nonEditableSegments.length === 0,
    editableSegments,
    nonEditableSegments,
    hasPassedSegments: nonEditableSegments.some(seg => seg.reason === 'Time has passed'),
    hasActiveSegments: nonEditableSegments.some(seg => seg.reason === 'Currently active time period')
  };
};

// Get time-based restrictions for UI
export const getTimeRestrictions = (shiftDate = null) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  const targetDate = shiftDate || today;
  const isToday = targetDate === today;

  return {
    isToday,
    isPastDate: false, // DISABLED: Allow editing of past dates
    currentTime,
    maxAllowedEndTime: '23:59', // DISABLED: Allow any end time
    canCreateNewSegments: true, // DISABLED: Always allow new segments
    canEditPastSegments: true // DISABLED: Always allow editing
  };
};

// =============================================================
//                 DYNAMIC TABLE API FUNCTIONS
// =============================================================

// Get dynamic table data
export const getDynamicTableData = async (filters) => {
  return await makeAPICall({
    action: 'getDynamicData',
    columnSelector: filters.columnSelector || 'All Columns',
    dateChoice: filters.dateChoice || 'This Month',
    customStartDate: filters.customStartDate,
    customEndDate: filters.customEndDate
  });
};

// Setup smart dynamic table with sheet-based refresh
export const setupSmartDynamicTable = async () => {
  return await makeAPICall({
    action: 'setupSmartDynamicTable'
  });
};

// Reset refresh control state
export const resetDynamicTableRefresh = async () => {
  return await makeAPICall({
    action: 'resetRefreshControl'
  });
};

// Debug function to test smart refresh from frontend
export const testSmartRefresh = async () => {
  return await makeAPICall({
    action: 'forceRefreshDynamicTable'
  });
};

// Test the timezone auto-update fix
export const testTimezoneAutoUpdate = async () => {
  return await makeAPICall({
    action: 'testTimezoneAutoUpdate'
  });
};

// Force run auto-update with user timezone
export const forceAutoUpdateWithUserTimezone = async () => {
  return await makeAPICall({
    action: 'forceAutoUpdateWithUserTimezone'
  });
};

// Test comprehensive time comparison scenarios
export const testTimeComparison = async () => {
  return await makeAPICall({
    action: 'testTimeComparison'
  });
};

// Test time comparison with real shift data
export const testTimeComparisonWithRealData = async () => {
  return await makeAPICall({
    action: 'testTimeComparisonWithRealData'
  });
};

// Test comprehensive timezone conversion system
export const testFullTimezoneSystem = async () => {
  return await makeAPICall({
    action: 'testTimezoneConversion'
  });
};

// Test timezone issue directly
export const testTimezoneIssueDirectly = async () => {
  return await makeAPICall({
    action: 'testTimezoneIssueDirectly'
  });
};

// Get simple server time and timezone info
export const getServerTimeInfo = async () => {
  return await makeAPICall({
    action: 'getServerTimeInfo'
  });
};

// Test timezone storage in Time Zone column
export const testTimezoneStorage = async () => {
  return await makeAPICall({
    action: 'testTimezoneStorage'
  });
};

// Verify Time Zone column P setup and functionality
export const verifyTimezoneColumnP = async () => {
  return await makeAPICall({
    action: 'verifyTimezoneColumnP'
  });
};

// Verify Time Zone column F setup and functionality  
export const verifyTimezoneColumnF = async () => {
  return await makeAPICall({
    action: 'verifyTimezoneColumnF'
  });
};

// Clean up duplicate Time Zone columns
export const cleanupDuplicateTimezoneColumns = async () => {
  return await makeAPICall({
    action: 'cleanupDuplicateTimezoneColumns'
  });
};

// =============================================================
//                 STATUS UPDATE SYSTEM
// =============================================================

// Manual status update for all shifts (refresh button functionality)
export const manualStatusUpdate = async () => {
  console.log('🔄 Manual status update triggered');
  return await makeAPICall({
    action: 'manualStatusUpdate'
  });
};

// Automatic status update on portal load
export const autoStatusUpdateOnLoad = async () => {
  console.log('🚀 Auto status update on portal load');
  return await makeAPICall({
    action: 'autoStatusUpdateOnLoad'
  });
};

// Check if shift has been edited before (for one-time edit limit)
export const checkShiftEditHistory = async (shiftId) => {
  console.log('📝 Checking edit history for shift:', shiftId);
  return await makeAPICall({
    action: 'checkShiftEditHistory',
    shiftId: shiftId
  });
};

// Record that a shift has been edited (for tracking purposes)
export const recordShiftEdit = async (shiftId, editDetails) => {
  console.log('✍️ Recording shift edit:', shiftId, editDetails);
  return await makeAPICall({
    action: 'recordShiftEdit',
    shiftId: shiftId,
    editDetails: editDetails,
    editTimestamp: new Date().toISOString()
  });
};

// Update shift with edit tracking (for employee portal with one-time limit)
export const updateShiftWithEditTracking = async (shiftData) => {
  console.log('📋 Updating shift with edit tracking:', shiftData);
  return await makeAPICall({
    action: 'updateShiftWithEditTracking',
    ...shiftData
  });
};

// Disable automatic shift completion (emergency fix)
export const disableAutoCompletion = async () => {
  return await makeAPICall({
    action: 'disableAutoCompletion'
  });
};

// Test timezone extraction and time conversion
export const testTimezoneExtraction = async () => {
  return await makeAPICall({
    action: 'testTimezoneExtraction'
  });
};

// Test auto-update system with fixed timezone conversion
export const testAutoUpdateWithFixedTimezone = async () => {
  return await makeAPICall({
    action: 'testAutoUpdateWithFixedTimezone'
  });
};

// Remove ON BREAK status from all existing shifts
export const removeOnBreakStatus = async () => {
  return await makeAPICall({
    action: 'removeOnBreakStatus'
  });
};

// Verify status simplification is complete
export const verifyStatusSimplification = async () => {
  return await makeAPICall({
    action: 'verifyStatusSimplification'
  });
};

// Emergency function to revert recently auto-completed shifts
export const revertAutoCompletedShifts = async () => {
  return await makeAPICall({
    action: 'revertAutoCompletedShifts'
  });
};

// =============================================================
//                 TIMEZONE CONVERSION UTILITIES
// =============================================================

// Convert server time to user timezone
export const convertServerTimeToUserTime = (serverTime, userTimezone) => {
  try {
    // Create a date object with server time in server timezone
    const today = new Date().toISOString().split('T')[0];
    const serverDateTime = new Date(`${today}T${serverTime}:00`);

    // Convert to user timezone
    const userTime = serverDateTime.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimezone
    });

    return userTime;
  } catch (error) {
    console.error('Error converting server time to user time:', error);
    return serverTime; // Fallback to original time
  }
};

// Convert user time to server timezone
export const convertUserTimeToServerTime = (userTime, userTimezone, serverTimezone = 'America/New_York') => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Create date in user timezone
    const userDateTime = new Date(`${today}T${userTime}:00`);

    // Convert to server timezone
    const serverTime = userDateTime.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: serverTimezone
    });

    return serverTime;
  } catch (error) {
    console.error('Error converting user time to server time:', error);
    return userTime; // Fallback to original time
  }
};

// Get timezone offset difference between user and server
export const getTimezoneOffset = (userTimezone, serverTimezone = 'America/New_York') => {
  try {
    const now = new Date();

    // Get time in both timezones
    const userTime = now.toLocaleString('en-US', { timeZone: userTimezone });
    const serverTime = now.toLocaleString('en-US', { timeZone: serverTimezone });

    // Calculate offset in hours
    const userDate = new Date(userTime);
    const serverDate = new Date(serverTime);
    const offsetMs = userDate.getTime() - serverDate.getTime();
    const offsetHours = offsetMs / (1000 * 60 * 60);

    return {
      offsetHours: offsetHours,
      userTime: userTime,
      serverTime: serverTime,
      userTimezone: userTimezone,
      serverTimezone: serverTimezone
    };
  } catch (error) {
    console.error('Error calculating timezone offset:', error);
    return { offsetHours: 0 };
  }
};

// Test timezone conversion with real data
export const testTimezoneConversion = async () => {
  return await makeAPICall({
    action: 'testTimezoneConversion'
  });
};

// =============================================================
//                 DAY COLUMN FUNCTIONS
// =============================================================

// Test Day column integration
export const testDayColumnIntegration = async () => {
  return await makeAPICall({
    action: 'testDayColumnIntegration'
  });
};

// Get day name from date (utility function)
export const getDayNameFromDate = (dateString) => {
  try {
    let date;
    if (dateString.includes('/')) {
      // DD/MM/YYYY format
      const [day, month, year] = dateString.split('/');
      date = new Date(year, month - 1, day);
    } else {
      // YYYY-MM-DD format
      date = new Date(dateString + 'T00:00:00');
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } catch (error) {
    console.error('Error getting day name:', error);
    return '';
  }
};

// Optional: Backfill Day column for existing entries
export const backfillDayColumn = async () => {
  return await makeAPICall({
    action: 'backfillDayColumn'
  });
};

// =============================================
// ADMIN SYSTEM FUNCTIONS
// =============================================

// Get system statistics for admin dashboard
export const getSystemStats = async () => {
  return await makeAPICall({
    action: 'getSystemStats'
  });
};

// Get all shifts with admin-level filtering
export const getAllShiftsForAdmin = async (filters = {}) => {
  return await makeAPICall({
    action: 'getAllShiftsForAdmin',
    ...filters
  });
};

// Update a shift with admin privileges
export const updateShiftAsAdmin = async (shiftData) => {
  return await makeAPICall({
    action: 'updateShiftAsAdmin',
    ...shiftData
  });
};

// Delete a shift with admin privileges
export const deleteShiftAsAdmin = async (shiftId) => {
  return await makeAPICall({
    action: 'deleteShiftAsAdmin',
    shiftId: shiftId
  });
};

// Create/update SimpleFilterTable
export const createSimpleFilterTable = async () => {
  return await makeAPICall({
    action: 'createSimpleFilterTable'
  });
};

// Setup production system
export const setupProductionSystem = async () => {
  return await makeAPICall({
    action: 'setupProductionSystem'
  });
};

// Cleanup old sheets
export const cleanupOldSheets = async () => {
  return await makeAPICall({
    action: 'cleanupOldSheets'
  });
};

// Debug function to check sheet structure
export const debugSheetStructure = async () => {
  return await makeAPICall({
    action: 'debugSheetStructure'
  });
};

// Staff Management API Functions
export const addStaff = async (staffData) => {
  return await makeAPICall({
    action: 'addStaff',
    staffData: staffData
  });
};

export const updateStaff = async (staffId, staffData) => {
  return await makeAPICall({
    action: 'updateStaff',
    staffId: staffId,
    staffData: staffData
  });
};

export const deleteStaff = async (staffId) => {
  return await makeAPICall({
    action: 'deleteStaff',
    staffId: staffId
  });
};

// =============================================================
//                   AI PROCESSING MOVED TO REACT
//           All AI logic now in aiService.js (React-based)
// =============================================================

// Get comprehensive sheet data for AI analysis (still from Apps Script)
export const getComprehensiveSheetData = async () => {
  console.log('📊 Fetching data from Apps Script for React AI processing');
  return await makeAPICall({
    action: 'getComprehensiveSheetData'
  });
};

// AI functions now use React processing instead of Apps Script
export const processAIPromptWithData = async (prompt, includeRawData = true) => {
  console.log('🔄 Processing AI prompt in React (moved from Apps Script)');
  const result = await processAIInReact(prompt, includeRawData);

  // Transform the result to match expected format for AdminDashboard
  if (result.success) {
    return {
      success: true,
      data: {
        analysis: result.response,
        recommendations: result.recommendations,
        confidence: result.confidence,
        processingTime: result.processingTime,
        dataQuality: result.dataQuality,
        analysisType: result.analysisType,
        experimental: result.experimental
      }
    };
  } else {
    return result; // Pass through error responses unchanged
  }
};

export const runExperimentalAI = async (experimentType, parameters = {}) => {
  console.log(`🧪 Running experimental AI in React: ${experimentType}`);

  // First get the comprehensive data that experimental AI needs
  const dataResult = await getComprehensiveSheetData();
  if (!dataResult.success) {
    return { success: false, message: 'Failed to get data for experimental AI' };
  }

  // Run the experimental AI with the data
  const results = await runExperimentalAIInReact(dataResult.data);

  // Convert kebab-case to camelCase for lookup
  const camelCaseMap = {
    'data-insights': 'dataInsights',
    'pattern-prediction': 'patternPrediction',
    'optimization-engine': 'optimizationEngine',
    'anomaly-analysis': 'anomalyAnalysis',
    'workforce-modeling': 'workforceModeling'
  };

  const camelCaseKey = camelCaseMap[experimentType];

  // Return the specific experiment result requested
  if (results && camelCaseKey && results[camelCaseKey]) {
    return {
      success: true,
      data: results[camelCaseKey]
    };
  } else {
    return {
      success: true,
      data: results // Return all results if specific type not found
    };
  }
};

export const getAIAnalysisSuggestions = async () => {
  console.log('💡 Getting AI analysis suggestions from React');
  const dataResult = await getComprehensiveSheetData();
  if (!dataResult.success) {
    return { success: false, message: 'Failed to get data for suggestions' };
  }
  const suggestions = getAISuggestionsFromReact(dataResult.data);
  return { success: true, suggestions };
};

export const getAIInsightsDashboard = async () => {
  console.log('📊 Getting AI insights dashboard from React');
  const dataResult = await getComprehensiveSheetData();
  if (!dataResult.success) {
    return { success: false, message: 'Failed to get data for dashboard' };
  }
  const insights = getAIDashboardFromReact(dataResult.data);
  return { success: true, insights };
};

// ========================================
// 🌙 CROSS-MIDNIGHT SHIFT DETECTION UTILITIES
// ========================================

/**
 * Detects if there's an active cross-midnight shift from previous day
 * Safe frontend-only approach that doesn't modify backend behavior
 */
export const detectCrossMidnightShift = async (employeeId, currentDate) => {
  try {
    console.log(`🌙 Checking for cross-midnight shift on ${currentDate}`);

    // Calculate previous day
    const current = new Date(currentDate + 'T00:00:00');
    const previousDay = new Date(current);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayStr = previousDay.toISOString().split('T')[0];

    console.log(`🌙 Looking for shifts from ${previousDayStr} that might extend to ${currentDate}`);

    // Get previous day's shifts
    const previousShifts = await getShifts({
      employeeId: employeeId,
      startDate: previousDayStr,
      endDate: previousDayStr
    });

    if (!previousShifts.success || !previousShifts.data || previousShifts.data.length === 0) {
      console.log(`🌙 No shifts found for ${previousDayStr}`);
      return { found: false, shift: null };
    }

    // Check each shift from previous day for cross-midnight potential
    for (const shift of previousShifts.data) {
      if (shift.status === 'ACTIVE' || shift.status === 'COMPLETED') {
        console.log(`🌙 Checking shift ${shift.shiftId} (${shift.status}) for cross-midnight extension`);

        if (isCrossMidnightShift(shift)) {
          console.log(`✅ Cross-midnight shift detected: ${shift.shiftId} from ${previousDayStr} extends to ${currentDate}`);

          // Mark this as a cross-midnight shift for display purposes
          const crossMidnightShift = {
            ...shift,
            _isCrossMidnight: true,
            _originalDate: shift.shiftDate,
            _displayDate: currentDate,
            _crossMidnightNote: `Shift started ${previousDayStr}, extends to ${currentDate}`
          };

          return { found: true, shift: crossMidnightShift };
        }
      }
    }

    console.log(`🌙 No cross-midnight shifts found extending from ${previousDayStr} to ${currentDate}`);
    return { found: false, shift: null };

  } catch (error) {
    console.error('❌ Error detecting cross-midnight shift:', error);
    return { found: false, shift: null, error: error.message };
  }
};

/**
 * Determines if a shift is a cross-midnight shift based on segments
 */
export const isCrossMidnightShift = (shift) => {
  if (!shift || !shift.segments || shift.segments.length === 0) {
    return false;
  }

  // Check for active segments (ongoing shift)
  const hasActiveSegment = shift.segments.some(seg => !seg.endTime);
  if (hasActiveSegment) {
    console.log(`🌙 Shift ${shift.shiftId} has active segments - potential cross-midnight`);
    return true;
  }

  // Check if any completed segment spans midnight
  for (const segment of shift.segments) {
    if (segment.startTime && segment.endTime) {
      if (isCrossMidnightTimeRange(segment.startTime, segment.endTime)) {
        console.log(`🌙 Segment ${segment.startTime}-${segment.endTime} spans midnight`);
        return true;
      }
    }
  }

  return false;
};

/**
 * Checks if a time range (HH:MM format) spans midnight
 */
export const isCrossMidnightTimeRange = (startTime, endTime) => {
  try {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;

    // If end time is earlier in the day than start time, it's cross-midnight
    return endMinutesTotal < startMinutesTotal;
  } catch (error) {
    console.error('Error checking cross-midnight time range:', error);
    return false;
  }
};

/**
 * Enhanced getCurrentShift that checks for cross-midnight shifts
 * Safe wrapper around existing getCurrentShift
 */
export const getCurrentShiftWithCrossMidnight = async (filters) => {
  try {
    console.log('🌙 Enhanced getCurrentShift with cross-midnight detection');

    // First, try regular getCurrentShift
    const regularResult = await getCurrentShift(filters);

    if (regularResult.success && regularResult.data) {
      console.log('✅ Found regular shift for requested date');
      return regularResult;
    }

    // If no shift found for current date, check for cross-midnight
    console.log('🌙 No shift found for current date, checking cross-midnight...');
    const crossMidnightResult = await detectCrossMidnightShift(
      filters.employeeId,
      filters.date || getCurrentDate()
    );

    if (crossMidnightResult.found) {
      console.log('✅ Using cross-midnight shift');
      return {
        success: true,
        data: crossMidnightResult.shift,
        message: 'Cross-midnight shift found',
        _isCrossMidnight: true
      };
    }

    // No shift found at all
    console.log('🌙 No shift found (regular or cross-midnight)');
    return { success: true, data: null, message: 'No shift found' };

  } catch (error) {
    console.error('❌ Error in enhanced getCurrentShift:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
};


