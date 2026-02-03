import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  handleAPIError,
  makeAPICall,
  syncStatusToSheet,
  submitTimeSegments,
  applyFrontendSmartStatus,
  fixShiftStatus,
  getShifts,
  updateShiftWithEditTracking,
  getDayNameFromDate,
  deleteShift
} from '../../services/appScriptAPI';
import TimeSegmentEntry from '../TimeSegmentEntry/TimeSegmentEntry';
import RollingTimePicker from '../RollingTimePicker/RollingTimePicker';

const ShiftEntry = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstStartTime: '',
    lastEndTime: '',
    shiftType: 'Regular'
  });
  const [saving, setSaving] = useState(false);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
  const [viewingSegments, setViewingSegments] = useState(null);

  // Quick Add Shifts state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddDateRange, setQuickAddDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [quickAddSegments, setQuickAddSegments] = useState([]);
  const [quickAddShiftType, setQuickAddShiftType] = useState('Regular');
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, isProcessing: false, errors: [] });

  // Enhanced Smart Status Calculation (synchronized with AdminDashboard)
  // Enhanced status determination using the same robust logic as ShiftHistory
  const determineSmartStatus = (shiftData) => {
    const smartStatusResult = applyFrontendSmartStatus(shiftData);
    console.log('🧮 ShiftEntry - Smart status result:', {
      status: smartStatusResult.status,
      corrected: smartStatusResult._statusCorrected,
      reason: smartStatusResult._correctionReason
    });
    return smartStatusResult.status;
  };

  // Enhanced status correction detection
  const detectStatusCorrection = (shiftData) => {
    const smartStatusResult = applyFrontendSmartStatus(shiftData);
    return {
      needsCorrection: smartStatusResult._statusCorrected,
      correctedStatus: smartStatusResult.status,
      reason: smartStatusResult._correctionReason,
      originalStatus: shiftData?.status
    };
  };

  // LEGACY FALLBACK: Keep original logic as backup (not used but preserved)
  // eslint-disable-next-line no-unused-vars
  const determineSmartStatusLegacy = (shiftData) => {
    // Refined status logic:
    // - Future date: DRAFT
    // - Today: use segment/time logic (ACTIVE/COMPLETED)
    // - Past: use segment/time logic (COMPLETED/ACTIVE if segments incomplete)
    // Always use shiftData.shiftDate for date comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let shiftDate;
    if (shiftData && shiftData.shiftDate) {
      shiftDate = new Date(shiftData.shiftDate);
      if (isNaN(shiftDate)) {
        shiftDate = new Date(Date.parse(shiftData.shiftDate));
      }
    } else {
      shiftDate = new Date();
    }
    shiftDate.setHours(0, 0, 0, 0);
    if (shiftDate > today) {
      return 'DRAFT';
    }
    // For today and past, use segment/time logic below

    console.log('🧮 Employee Dashboard - Calculating smart status:', shiftData);

    if (!shiftData || !shiftData.segments) {
      console.log('📝 No shift data or segments - DRAFT');
      return 'DRAFT';
    }

    const segments = shiftData.segments;
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log('⏰ Current time:', currentTime);
    console.log('📋 Segments:', segments);

    if (!Array.isArray(segments) || segments.length === 0) {
      console.log('📝 No segments array - DRAFT');
      return 'DRAFT';
    }

    const timeToMinutes = (timeString) => {
      if (!timeString) return 0;
      const [hours, minutes] = timeString.split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    };

    const currentTimeMinutes = timeToMinutes(currentTime);

    // Get the actual start and end times from segments
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    if (firstSegment && firstSegment.startTime) {
      const firstStartMinutes = timeToMinutes(firstSegment.startTime);
      console.log('🚀 First start time:', firstSegment.startTime, '=', firstStartMinutes, 'minutes');

      // Check if shift hasn't started yet
      if (currentTimeMinutes < firstStartMinutes) {
        console.log('⚫ Before start time - OFFLINE');
        return 'OFFLINE';
      }
    }

    // Check for active segments (segments without end time)
    const hasActiveSegment = segments.some(seg => !seg.endTime);
    console.log('🔄 Has active segment (no end time):', hasActiveSegment);

    if (hasActiveSegment) {
      console.log('🟢 Active segment detected - ACTIVE');
      return 'ACTIVE';
    }

    // Check if current time is before the last segment's end time
    if (lastSegment && lastSegment.endTime) {
      const lastEndMinutes = timeToMinutes(lastSegment.endTime);
      console.log('🏁 Last end time:', lastSegment.endTime, '=', lastEndMinutes, 'minutes');
      console.log('⏰ Comparison: current', currentTimeMinutes, 'vs end', lastEndMinutes);

      if (currentTimeMinutes < lastEndMinutes) {
        console.log('🟢 Current time before end time - should be ACTIVE');
        return 'ACTIVE';
      } else {
        console.log('🔵 Current time after end time - COMPLETED');
        return 'COMPLETED';
      }
    }

    // If all segments have end times but no clear end time, likely still active
    if (segments.length > 0 && segments.every(seg => seg.endTime)) {
      console.log('🟡 All segments have end times but unclear - ACTIVE for safety');
      return 'ACTIVE'; // Keep as active for manual completion
    }

    console.log('📝 Fallback to DRAFT');
    return 'DRAFT';
  };

  // Generate array of dates between start and end (inclusive)
  const generateDateArray = (startDate, endDate) => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Handle Quick Add Shifts submission
  const handleQuickAddSubmit = async () => {
    if (!quickAddSegments || quickAddSegments.length === 0) {
      alert('Please add at least one time segment.');
      return;
    }

    const startDate = new Date(quickAddDateRange.startDate);
    const endDate = new Date(quickAddDateRange.endDate);

    if (endDate < startDate) {
      alert('End date must be after or equal to start date.');
      return;
    }

    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff > 90) {
      alert('Date range cannot exceed 90 days. Please select a smaller range.');
      return;
    }

    const confirmMsg = `Create shifts for ${daysDiff} day(s) from ${quickAddDateRange.startDate} to ${quickAddDateRange.endDate}?\n\nExisting shifts will be skipped.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    const datesToCreate = generateDateArray(quickAddDateRange.startDate, quickAddDateRange.endDate);

    // Filter out dates that already have shifts
    const datesToProcess = datesToCreate.filter(date => !shiftsByDate[date]);

    if (datesToProcess.length === 0) {
      alert('All dates in the selected range already have shifts.');
      return;
    }

    const skippedCount = datesToCreate.length - datesToProcess.length;
    if (skippedCount > 0) {
      const skipMsg = `${skippedCount} date(s) already have shifts and will be skipped.\n\nProceed with creating ${datesToProcess.length} new shift(s)?`;
      if (!window.confirm(skipMsg)) {
        return;
      }
    }

    setBulkProgress({ current: 0, total: datesToProcess.length, isProcessing: true, errors: [] });
    setSaving(true);

    const errors = [];
    let successCount = 0;

    for (let i = 0; i < datesToProcess.length; i++) {
      const date = datesToProcess[i];
      setBulkProgress({ current: i + 1, total: datesToProcess.length, isProcessing: true, errors });

      try {
        const response = await submitTimeSegments({
          segments: quickAddSegments,
          employeeName: user.name,
          employeeId: user.id,
          date: date,
          shiftType: quickAddShiftType
        });

        if (response.success) {
          successCount++;
        } else {
          errors.push({ date, error: response.message });
        }
      } catch (error) {
        errors.push({ date, error: handleAPIError(error) });
      }

      // Small delay to avoid overwhelming the API
      if (i < datesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setBulkProgress({ current: datesToProcess.length, total: datesToProcess.length, isProcessing: false, errors });
    setSaving(false);

    // Show summary
    let summaryMsg = `✅ Successfully created ${successCount} shift(s)`;
    if (errors.length > 0) {
      summaryMsg += `\n\n❌ Failed to create ${errors.length} shift(s):`;
      errors.forEach(err => {
        summaryMsg += `\n- ${err.date}: ${err.error}`;
      });
    }
    alert(summaryMsg);

    // Close modal and refresh if any succeeded
    if (successCount > 0) {
      setShowQuickAdd(false);
      setQuickAddSegments([]);
      setBulkProgress({ current: 0, total: 0, isProcessing: false, errors: [] });
      setTimeout(() => {
        loadCurrentShiftStatus();
      }, 1000);
    }
  };

  // Handle Quick Add time segments submission from TimeSegmentEntry
  const handleQuickAddSegmentsUpdate = (segments) => {
    setQuickAddSegments(segments);
  };

  // Cancel Quick Add modal
  const handleCancelQuickAdd = () => {
    setShowQuickAdd(false);
    setQuickAddSegments([]);
    setQuickAddDateRange({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setQuickAddShiftType('Regular');
    setBulkProgress({ current: 0, total: 0, isProcessing: false, errors: [] });
  };

  // Generate date rows for current day + next 2 months
  const generateDateRows = useCallback(() => {
    const rows = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start from 1st of current month
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2); // Next 2 months

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      rows.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      });
    }
    return rows;
  }, []);

  // Load shifts with smart calculation → update sheet → fetch fresh data (EXACT SAME LOGIC)
  const loadCurrentShiftStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage('Loading shift data from Google Sheets...');

    try {
      // Fetch all shifts for the user
      let response = await getShifts({
        employeeId: user.id,
        forceRefresh: true
      });

      if (response.success && response.data) {
        const shiftsData = Array.isArray(response.data) ? response.data : [response.data];
        console.log(`📊 RECEIVED ${shiftsData.length} SHIFTS FROM SHEET`);

        // Apply EXACT SAME status correction logic to each shift
        let fixedCount = 0;
        for (const shift of shiftsData) {
          const sheetStatus = shift.status;
          const calculatedStatus = determineSmartStatus(shift);
          console.log(`STATUS CHECK: Shift ${shift.shiftId} - Sheet="${sheetStatus}" vs Calculated="${calculatedStatus}"`);

          // Use enhanced status correction detection (EXACT SAME LOGIC)
          const correction = detectStatusCorrection(shift);
          if (correction.needsCorrection) {
            console.log(`🔄 UPDATING SHEET: ${shift.shiftId} ${correction.originalStatus} → ${correction.correctedStatus}`);
            try {
              // Try the robust fixShiftStatus first (EXACT SAME LOGIC)
              const fixResult = await fixShiftStatus({
                shiftId: shift.shiftId,
                correctStatus: correction.correctedStatus
              });

              if (fixResult.success) {
                console.log(`✅ Sheet updated successfully for shift ${shift.shiftId}`);
                fixedCount++;
              } else {
                console.warn('⚠️ fixShiftStatus failed, using fallback');
                // Fallback to original method (EXACT SAME LOGIC)
                const syncResult = await syncStatusToSheet(
                  shift.shiftId,
                  correction.correctedStatus,
                  `Smart status update: ${correction.originalStatus} → ${correction.correctedStatus}`
                );
                if (syncResult.success) {
                  console.log('✅ Sheet updated successfully with fallback');
                  fixedCount++;
                }
              }
            } catch (error) {
              console.error('❌ Status update error:', error);
            }
          }
        }

        // Re-fetch if any corrections were made (EXACT SAME LOGIC)
        if (fixedCount > 0) {
          console.log(`🔄 Re-fetching after ${fixedCount} corrections...`);
          response = await getShifts({
            employeeId: user.id,
            forceRefresh: true
          });
          if (response.success && response.data) {
            const freshShiftsData = Array.isArray(response.data) ? response.data : [response.data];
            setShifts(freshShiftsData);
            setMessage(`✅ Loaded ${freshShiftsData.length} shifts (${fixedCount} status corrections applied)`);
          }
        } else {
          setShifts(shiftsData);
          setMessage(`✅ Loaded ${shiftsData.length} shifts`);
        }
      } else {
        setShifts([]);
        setMessage('Ready to add shift times');
      }
    } catch (error) {
      setMessage('Error: ' + handleAPIError(error));
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCurrentShiftStatus();
    }
  }, [user, loadCurrentShiftStatus]);

  // Trigger refresh when refreshTrigger changes (from parent StaffDashboard)
  useEffect(() => {
    if (refreshTrigger && user) {
      console.log('🔄 Refresh trigger activated - fetching fresh data');
      loadCurrentShiftStatus();
    }
  }, [refreshTrigger, user, loadCurrentShiftStatus]);

  // Refresh data when tab becomes visible/active
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && user) {
        console.log('🔄 Tab became visible - refreshing shift data and correcting future shifts');
        try {
          const allShiftsResp = await (await import('../../services/appScriptAPI')).getShifts({
            employeeId: user.id,
            forceRefresh: true
          });
          if (allShiftsResp.success && Array.isArray(allShiftsResp.data)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            for (const shift of allShiftsResp.data) {
              // Use shift.shiftDate for consistency
              const shiftDateStr = shift.shiftDate || shift.date;
              if (shiftDateStr) {
                let shiftDate = new Date(shiftDateStr);
                shiftDate.setHours(0, 0, 0, 0);
                // Use enhanced status correction detection
                const correction = detectStatusCorrection(shift);
                if (correction.needsCorrection) {
                  console.log(`🛠️ Smart correction on tab switch: ${shift.shiftId} (${shiftDateStr}) ${correction.originalStatus} → ${correction.correctedStatus}`);
                  try {
                    const fixResult = await fixShiftStatus({
                      shiftId: shift.shiftId,
                      correctStatus: correction.correctedStatus
                    });
                    if (!fixResult.success) {
                      // Fallback to original method
                      await syncStatusToSheet(shift.shiftId, correction.correctedStatus, 'Auto-corrected on tab switch');
                    }
                  } catch (error) {
                    console.error('❌ Tab switch correction error:', error);
                  }
                } else {
                  console.log(`✅ Shift ${shift.shiftId} (${shiftDateStr}) status correct, no correction needed.`);
                }
              }
            }
          }
        } catch (err) {
          console.error('Error correcting future shift statuses:', err);
        }
        // Refresh current shift data only once after corrections
        loadCurrentShiftStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, loadCurrentShiftStatus]);

  // Listen for console debug refresh events
  useEffect(() => {
    const handleConsoleRefresh = (event) => {
      if (user) {
        console.log('🔧 Console debug refresh triggered:', event.detail);
        setMessage('🔧 Console debug triggered - reloading data...');
        loadCurrentShiftStatus();
      }
    };

    window.addEventListener('forceShiftRefresh', handleConsoleRefresh);

    return () => {
      window.removeEventListener('forceShiftRefresh', handleConsoleRefresh);
    };
  }, [user, loadCurrentShiftStatus]);

  // Handle edit shift (open modal)
  const handleEditShift = (shift) => {
    console.log('📝 Edit shift clicked:', shift);
    setEditingShift(shift);

    const extractTime = (timeValue) => {
      if (!timeValue) return '';
      if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }
      if (timeValue instanceof Date || (typeof timeValue === 'string' && timeValue.includes('1899-12-30'))) {
        const date = new Date(timeValue);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      if (typeof timeValue === 'string' && timeValue.includes('T')) {
        const date = new Date(timeValue);
        return date.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Calcutta'
        });
      }
      return '';
    };

    let startTime = '';
    let endTime = '';

    if (shift.segments && shift.segments.length > 0) {
      const firstSegment = shift.segments[0];
      const lastSegment = shift.segments[shift.segments.length - 1];
      startTime = firstSegment.startTime || extractTime(shift.firstStartTime || shift.startTime);
      endTime = lastSegment.endTime || extractTime(shift.lastEndTime || shift.endTime);
    } else {
      startTime = extractTime(shift.firstStartTime || shift.startTime);
      endTime = extractTime(shift.lastEndTime || shift.endTime);
    }

    setEditFormData({
      firstStartTime: startTime,
      lastEndTime: endTime,
      shiftType: shift.shiftType || 'Regular'
    });
  };

  const handleCancelEdit = () => {
    setEditingShift(null);
    setEditFormData({
      firstStartTime: '',
      lastEndTime: '',
      shiftType: 'Regular'
    });
    setShowAdvancedEdit(false);
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    try {
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end = new Date(`1970-01-01T${endTime}:00`);
      let diffMs = end - start;
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
      const hours = diffMs / (1000 * 60 * 60);
      return Math.round(hours * 100) / 100;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 0;
    }
  };

  const handleSaveEdit = async () => {
    if (!editingShift || !editFormData.firstStartTime || !editFormData.lastEndTime) {
      alert('Please fill in both start and end times.');
      return;
    }

    const newDuration = calculateDuration(editFormData.firstStartTime, editFormData.lastEndTime);
    if (newDuration <= 0 || newDuration >= 24) {
      alert('Invalid time range. Shift must be within 24 hours.');
      return;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(editFormData.firstStartTime) || !timeRegex.test(editFormData.lastEndTime)) {
      alert('Please enter valid time format (HH:MM).');
      return;
    }

    setSaving(true);
    try {
      // Create updated segments data (EXACT SAME LOGIC)
      const updatedSegments = [{
        segmentId: 1,
        startTime: editFormData.firstStartTime,
        endTime: editFormData.lastEndTime,
        duration: newDuration
      }];

      // Calculate smart status (EXACT SAME LOGIC)
      const mockShiftData = {
        segments: updatedSegments,
        status: 'ACTIVE'
      };
      const calculatedStatus = determineSmartStatus(mockShiftData);

      console.log(`📊 ShiftEntry ${editingShift.isNew ? 'Add' : 'Edit'} - Smart status calculated: ${calculatedStatus}`);

      let response;

      if (editingShift.isNew) {
        // For NEW shifts, use submitTimeSegments (EXACT SAME LOGIC as ShiftEntry original)
        response = await submitTimeSegments({
          segments: updatedSegments,
          employeeName: user.name,
          employeeId: user.id,
          date: editingShift.shiftDate || editingShift.date,
          shiftType: editFormData.shiftType
        });
      } else {
        // For EXISTING shifts, use updateShiftWithEditTracking
        response = await updateShiftWithEditTracking({
          shiftId: editingShift.shiftId || editingShift.id,
          employeeName: user.name,
          employeeId: user.id,
          shiftDate: editingShift.shiftDate || editingShift.date,
          shiftType: editFormData.shiftType,
          segments: updatedSegments,
          firstStartTime: editFormData.firstStartTime,
          lastEndTime: editFormData.lastEndTime,
          totalDuration: newDuration,
          scheduleStatus: calculatedStatus,
          isUpdate: true,
          isEmployeeEdit: true,
          editedBy: user.name,
          editedById: user.id
        });
      }

      if (response.success) {
        alert(editingShift.isNew ? '✅ Shift added successfully!' : '✅ Shift updated successfully!');
        handleCancelEdit();
        setTimeout(() => {
          loadCurrentShiftStatus();
        }, 1000);
      } else {
        alert(`Error ${editingShift.isNew ? 'adding' : 'updating'} shift: ` + response.message);
      }
    } catch (error) {
      console.error(`Failed to ${editingShift.isNew ? 'add' : 'update'} shift:`, error);
      alert(`Error ${editingShift.isNew ? 'adding' : 'updating'} shift: ` + handleAPIError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitTimeSegments = async (segments, scheduleInfo = {}) => {
    if (!editingShift) return;

    setSaving(true);
    setMessage('');

    if (!user || !user.name || !user.id) {
      setMessage('Error: User information not available.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        segments,
        // Use user data as primary source, fallback to shift data
        employeeName: user.name || editingShift.employeeName || editingShift.name,
        employeeId: user.id || editingShift.employeeId || editingShift.id,
        date: editingShift.shiftDate || editingShift.date,
        shiftType: editingShift.shiftType || 'Regular',
        ...scheduleInfo
      };

      console.log('🔍 Segment submission - User data:', { userName: user.name, userId: user.id });
      console.log('🔍 Segment submission - Shift data:', {
        shiftName: editingShift.employeeName,
        shiftId: editingShift.employeeId
      });

      // 🔥 CRITICAL: Pass existing shift ID if available for proper segment updates (EXACT SAME LOGIC)
      if (editingShift && (editingShift.shiftId || editingShift.id) && !editingShift.isNew) {
        payload.existingShiftId = editingShift.shiftId || editingShift.id;
        payload.isUpdate = true;
        console.log(`🔧 Using existing shift ID: ${editingShift.shiftId || editingShift.id} for segment update`);
      } else {
        console.log('🆕 Creating new shift (no existing shift ID)');
      }

      console.log('📤 ShiftEntry submitting segments with payload:', payload);

      const response = await submitTimeSegments(payload);

      if (response.success) {
        setMessage('✅ Time segments updated successfully in Google Sheets!');
        alert('✅ Time segments updated successfully!');
        handleCancelEdit();

        // 🔄 Force fresh data reload to show updated segments (EXACT SAME LOGIC)
        console.log('🔄 Forcing fresh data reload after segment update...');
        setTimeout(() => {
          loadCurrentShiftStatus();
        }, 1000);
      } else {
        setMessage('❌ Error: ' + response.message);
        alert('Error updating time segments: ' + response.message);
      }
    } catch (error) {
      setMessage('❌ Error: ' + handleAPIError(error));
      console.error('Failed to update time segments:', error);
      alert('Error updating time segments: ' + handleAPIError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteShift = async (shift) => {
    if (!shift || !shift.shiftId) {
      setMessage('Error: No shift to finalize.');
      return;
    }

    setLoading(true);
    try {
      const response = await makeAPICall({
        action: 'completeShift',
        shiftId: shift.shiftId,
        employeeId: user.id,
        completedAt: new Date().toISOString(),
        date: shift.shiftDate || shift.date
      });

      if (response.success) {
        alert('✅ Shift finalized successfully!');
        loadCurrentShiftStatus();
      } else {
        alert('Error: ' + response.message);
      }
    } catch (error) {
      alert('Error: ' + handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  // Handle delete shift
  const handleDeleteShift = async (shift) => {
    if (!shift || !shift.shiftId) {
      alert('Error: Cannot delete shift - no shift ID found.');
      return;
    }

    // Confirmation dialog with shift details
    const shiftDate = formatDate(shift.shiftDate || shift.date);
    const shiftTime = `${formatTime(shift.firstStartTime || shift.startTime)} - ${formatTime(shift.lastEndTime || shift.endTime)}`;
    const confirmMessage = `Are you sure you want to delete this shift?\n\nDate: ${shiftDate}\nTime: ${shiftTime}\nDuration: ${formatDuration(shift.totalDuration || 0)} hours\n\nThis action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setMessage('Deleting shift...');

    try {
      console.log('🗑️ Deleting shift:', shift.shiftId);

      const response = await deleteShift(shift.shiftId);

      if (response.success) {
        setMessage('✅ Shift deleted successfully!');
        alert('✅ Shift deleted successfully!');

        // Refresh shift list
        setTimeout(() => {
          loadCurrentShiftStatus();
        }, 500);
      } else {
        setMessage('❌ Error: ' + response.message);
        alert('Error deleting shift: ' + response.message);
      }
    } catch (error) {
      console.error('Failed to delete shift:', error);
      setMessage('❌ Error: ' + handleAPIError(error));
      alert('Error deleting shift: ' + handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return '-';
    try {
      if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
        return timeStr;
      }
      if (timeStr.includes('T')) {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
      return timeStr;
    } catch (error) {
      return timeStr;
    }
  };

  const formatDuration = (duration) => {
    const num = parseFloat(duration);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const handleViewSegments = (shift) => {
    let segments = [];
    if (shift.timeSegments) {
      try {
        segments = typeof shift.timeSegments === 'string' ? JSON.parse(shift.timeSegments) : shift.timeSegments;
      } catch (e) {
        console.error('Error parsing timeSegments:', e);
        segments = [];
      }
    } else if (shift.segments) {
      segments = shift.segments;
    }
    setViewingSegments({ ...shift, parsedSegments: segments });
  };

  if (!user) {
    return (
      <div className="alert alert-warning">
        Please log in to manage your shifts.
      </div>
    );
  }

  // Generate all date rows
  const dateRows = generateDateRows();

  // Create a map of existing shifts by date for quick lookup
  const shiftsByDate = {};
  shifts.forEach(shift => {
    const dateKey = (shift.shiftDate || shift.date);
    shiftsByDate[dateKey] = shift;
  });

  return (
    <div className="container-fluid p-3" style={{
      minHeight: '100vh'
    }}>
      <style>{`
        .card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
        }
        .btn-shine {
          position: relative;
          overflow: hidden;
        }
        .btn-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        .btn-shine:hover::before {
          left: 100%;
        }
        .pulse-badge {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div className="row g-0">
        <div className="col-12">
          <div className="card border-0 mb-4 shadow-lg" style={{
            background: '#0f3460',
            borderRadius: '12px'
          }}>
            <div className="card-body py-3" style={{
              background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
              borderRadius: '12px'
            }}>
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                <div>
                  <h4 className="mb-1" style={{ color: '#2d3748', fontWeight: '700' }}>
                    <i className="bi bi-calendar-check me-2"></i>
                    Fill My Shifts
                  </h4>
                  <small style={{ color: '#4a5568' }}>
                    <i className="bi bi-info-circle me-1"></i>
                    Today + Future Dates - Add times and submit each shift
                  </small>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-shine"
                    onClick={() => setShowQuickAdd(true)}
                    disabled={loading || saving}
                    style={{
                      fontWeight: '600',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    <i className="bi bi-lightning-fill me-2"></i>
                    Quick Add Shifts
                  </button>
                  <button
                    className="btn btn-shine"
                    onClick={() => loadCurrentShiftStatus()}
                    disabled={loading}
                    style={{
                      fontWeight: '600',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-2" style={{ animation: 'spin 2s linear infinite' }}></i>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
                        Refresh Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className={`alert ${message.includes('✅') ? 'alert-success' : message.includes('❌') ? 'alert-danger' : 'alert-info'} alert-dismissible fade show`} role="alert">
              {message}
              <button
                type="button"
                className="btn-close"
                onClick={() => setMessage('')}
                aria-label="Close"
              ></button>
            </div>
          )}

          {loading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="d-block d-md-none">
                {dateRows.map((dateRow, index) => {
                  const existingShift = shiftsByDate[dateRow.date];
                  const isCompleted = existingShift && existingShift.status === 'COMPLETED';

                  return (
                    <div key={index} className={`card mb-3 card-hover`} style={{
                      borderLeft: `4px solid ${isCompleted ? '#00d9ff' : existingShift ? '#e94560' : '#5a5a5a'}`,
                      backgroundColor: '#0f3460',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      color: 'white'
                    }}>
                      <div className="card-header py-2 border-0" style={{
                        background: isCompleted ? '#00d9ff' :
                          existingShift ? '#e94560' :
                            '#16213e',
                        borderRadius: '8px 8px 0 0',
                        color: 'white'
                      }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong className="text-white">{dateRow.displayDate}</strong>
                            <span className="badge bg-white bg-opacity-25 text-white ms-2">{dateRow.dayName}</span>
                          </div>
                          {existingShift && (
                            <span className={`badge pulse-badge ${existingShift.status === 'COMPLETED' ? 'bg-light text-success' :
                              existingShift.status === 'ACTIVE' ? 'bg-light text-primary' :
                                existingShift.status === 'DRAFT' ? 'bg-warning text-dark' : 'bg-light text-secondary'
                              }`} style={{ fontWeight: '700', padding: '6px 12px' }}>
                              {existingShift.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="card-body p-2" style={{ backgroundColor: '#0f3460', color: 'white' }}>
                        {existingShift ? (
                          <div className="row g-2 small">
                            <div className="col-6">
                              <div className="small" style={{ color: '#9ca3af' }}>Start Time</div>
                              <strong style={{ color: 'white' }}>{formatTime(existingShift.firstStartTime || existingShift.startTime)}</strong>
                            </div>
                            <div className="col-6">
                              <div className="small" style={{ color: '#9ca3af' }}>End Time</div>
                              <strong style={{ color: 'white' }}>{formatTime(existingShift.lastEndTime || existingShift.endTime)}</strong>
                            </div>
                            <div className="col-12">
                              <div className="small" style={{ color: '#9ca3af' }}>Duration</div>
                              <strong style={{ color: '#00d9ff' }}>{formatDuration(existingShift.totalDuration)} hrs</strong>
                            </div>
                            <div className="col-12 mt-2 d-flex gap-2">
                              <button
                                className={`btn btn-sm flex-grow-1 btn-shine ${isCompleted ? 'btn-outline-success' : 'btn-primary'
                                  }`}
                                onClick={() => handleEditShift(existingShift)}
                                disabled={saving}
                                style={{
                                  borderRadius: '10px',
                                  fontWeight: '600',
                                  padding: '8px'
                                }}
                              >
                                <i className={`bi ${isCompleted ? 'bi-eye' : 'bi-pencil'} me-1`}></i>
                                {isCompleted ? 'View' : 'Edit'}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => handleViewSegments(existingShift)}
                                title="View Segments"
                                style={{ borderRadius: '10px', padding: '8px 12px' }}
                              >
                                <i className="bi bi-list-task"></i>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn w-100 btn-shine"
                            style={{
                              borderRadius: '6px',
                              fontWeight: '600',
                              padding: '10px',
                              background: 'linear-gradient(135deg, #00d9ff 0%, #0088cc 100%)',
                              border: 'none',
                              color: 'white'
                            }}
                            onClick={() => {
                              setEditingShift({ date: dateRow.date, shiftDate: dateRow.date, isNew: true });
                              setEditFormData({ firstStartTime: '', lastEndTime: '', shiftType: 'Regular' });
                            }}
                            disabled={saving}
                          >
                            <i className="bi bi-plus-circle me-2"></i>
                            Add Shift
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="table-responsive d-none d-md-block shadow-lg" style={{
                backgroundColor: '#0f3460',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <table className="table table-hover mb-0" style={{ color: 'white' }}>
                  <thead style={{
                    background: 'linear-gradient(135deg, #e94560 0%, #ff6b6b 100%)',
                    color: 'white'
                  }}>
                    <tr>
                      <th style={{ width: '150px' }}>Date</th>
                      <th style={{ width: '80px' }}>Day</th>
                      <th style={{ width: '120px' }}>Start Time</th>
                      <th style={{ width: '120px' }}>End Time</th>
                      <th style={{ width: '100px' }}>Duration</th>
                      <th style={{ width: '80px' }}>Segments</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th style={{ width: '140px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateRows.map((dateRow, index) => {
                      const existingShift = shiftsByDate[dateRow.date];
                      const isCompleted = existingShift && existingShift.status === 'COMPLETED';
                      const isActive = existingShift && existingShift.status === 'ACTIVE';

                      return (
                        <tr key={index} style={{
                          backgroundColor: isCompleted ? 'rgba(0, 217, 255, 0.15)' :
                            isActive ? 'rgba(233, 69, 96, 0.15)' :
                              existingShift ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                          transition: 'all 0.2s ease',
                          color: 'white'
                        }} className="table-row-hover">
                          <style>{`.table-row-hover:hover { background-color: rgba(233, 69, 96, 0.25) !important; }`}</style>
                          <td><strong className={
                            isCompleted ? 'text-success' : isActive ? 'text-primary' : ''
                          }>{dateRow.displayDate}</strong></td>
                          <td>
                            <span className="badge pulse-badge" style={{
                              padding: '6px 12px',
                              fontWeight: '700',
                              backgroundColor: isCompleted ? '#00d9ff' : existingShift ? '#e94560' : '#5a5a5a',
                              color: 'white'
                            }}>{dateRow.dayName}</span>
                          </td>
                          <td className={existingShift ? 'fw-semibold' : 'text-muted'}>
                            {existingShift ? formatTime(existingShift.firstStartTime || existingShift.startTime) : '—'}
                          </td>
                          <td className={existingShift ? 'fw-semibold' : 'text-muted'}>
                            {existingShift ? formatTime(existingShift.lastEndTime || existingShift.endTime) : '—'}
                          </td>
                          <td>
                            {existingShift ? (
                              <strong style={{ color: '#667eea', fontSize: '1.05rem' }}>{formatDuration(existingShift.totalDuration)} hrs</strong>
                            ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                          </td>
                          <td>
                            {existingShift && ((existingShift.timeSegments && existingShift.timeSegments !== '[]') || (existingShift.segments && existingShift.segments.length > 0)) ? (
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => handleViewSegments(existingShift)}
                                style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="View Segments"
                              >
                                <i className="bi bi-list-task"></i>
                              </button>
                            ) : <span className="text-muted small">—</span>}
                          </td>
                          <td>
                            {existingShift ? (
                              <span className="badge" style={{
                                background: existingShift.status === 'COMPLETED' ? '#06D6A0' :
                                  existingShift.status === 'ACTIVE' ? '#FF6B6B' :
                                    existingShift.status === 'DRAFT' ? '#FFE66D' : '#A8DADC',
                                color: existingShift.status === 'DRAFT' ? '#2d3748' : 'white',
                                fontWeight: '700',
                                padding: '8px 16px'
                              }}>
                                {existingShift.status}
                              </span>
                            ) : <span className="badge" style={{ background: '#E5E7EB', color: '#6B7280', fontWeight: '600', padding: '6px 14px' }}>Pending</span>}
                          </td>
                          <td>
                            {existingShift ? (
                              <div className="d-flex gap-1">
                                <button
                                  className={`btn btn-sm btn-shine ${isCompleted ? 'btn-outline-success' : 'btn-primary'
                                    }`}
                                  onClick={() => handleEditShift(existingShift)}
                                  disabled={saving}
                                  style={{
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    padding: '6px 16px'
                                  }}
                                >
                                  <i className={`bi ${isCompleted ? 'bi-eye' : 'bi-pencil'} me-1`}></i>
                                  {isCompleted ? 'View' : 'Edit'}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteShift(existingShift)}
                                  disabled={loading}
                                  style={{
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    padding: '6px 16px'
                                  }}
                                  title="Delete shift"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-sm btn-shine"
                                style={{
                                  background: 'linear-gradient(135deg, #00d9ff 0%, #0088cc 100%)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontWeight: '600',
                                  padding: '6px 16px',
                                  color: 'white'
                                }}
                                onClick={() => {
                                  setEditingShift({ date: dateRow.date, shiftDate: dateRow.date, isNew: true });
                                  setEditFormData({ firstStartTime: '', lastEndTime: '', shiftType: 'Regular' });
                                }}
                                disabled={saving}
                              >
                                <i className="bi bi-plus-circle me-1"></i>
                                Add Shift
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Quick Add Shifts Modal */}
        {showQuickAdd && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content">
                <div className="modal-header" style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}>
                  <h5 className="modal-title">
                    <i className="bi bi-lightning-fill me-2"></i>
                    Quick Add Shifts - Bulk Creation
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={handleCancelQuickAdd}
                    disabled={bulkProgress.isProcessing}
                  ></button>
                </div>
                <div className="modal-body">
                  {/* Date Range Selection */}
                  <div className="card mb-3 border-primary">
                    <div className="card-header bg-primary text-white">
                      <i className="bi bi-calendar-range me-2"></i>
                      Select Date Range
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-5">
                          <label className="form-label fw-bold">Start Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={quickAddDateRange.startDate}
                            onChange={(e) => setQuickAddDateRange({ ...quickAddDateRange, startDate: e.target.value })}
                            disabled={bulkProgress.isProcessing}
                          />
                        </div>
                        <div className="col-md-2 d-flex align-items-end justify-content-center">
                          <i className="bi bi-arrow-right fs-3 text-muted mb-2"></i>
                        </div>
                        <div className="col-md-5">
                          <label className="form-label fw-bold">End Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={quickAddDateRange.endDate}
                            onChange={(e) => setQuickAddDateRange({ ...quickAddDateRange, endDate: e.target.value })}
                            disabled={bulkProgress.isProcessing}
                          />
                        </div>
                      </div>

                      {/* Date Range Summary */}
                      {(() => {
                        const start = new Date(quickAddDateRange.startDate);
                        const end = new Date(quickAddDateRange.endDate);
                        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        const datesToCreate = generateDateArray(quickAddDateRange.startDate, quickAddDateRange.endDate);
                        const existingCount = datesToCreate.filter(date => shiftsByDate[date]).length;
                        const newCount = datesToCreate.length - existingCount;

                        return (
                          <div className="mt-3 p-3 bg-light rounded">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <i className="bi bi-calendar3 me-2 text-primary"></i>
                                <strong>{daysDiff} day(s) selected</strong>
                              </div>
                              {existingCount > 0 && (
                                <div className="text-warning">
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {existingCount} shift(s) already exist (will be skipped)
                                </div>
                              )}
                            </div>
                            {newCount > 0 && (
                              <div className="mt-2 text-success">
                                <i className="bi bi-plus-circle me-1"></i>
                                {newCount} new shift(s) will be created
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Shift Type Selection */}
                  <div className="card mb-3 border-info">
                    <div className="card-header bg-info text-white">
                      <i className="bi bi-tag me-2"></i>
                      Shift Type
                    </div>
                    <div className="card-body">
                      <select
                        className="form-select"
                        value={quickAddShiftType}
                        onChange={(e) => setQuickAddShiftType(e.target.value)}
                        disabled={bulkProgress.isProcessing}
                      >
                        <option value="Regular">Regular</option>
                        <option value="Overtime">Overtime</option>
                        <option value="Night">Night Shift</option>
                        <option value="Weekend">Weekend</option>
                      </select>
                    </div>
                  </div>

                  {/* Time Segments Configuration */}
                  <div className="card mb-3 border-success">
                    <div className="card-header bg-success text-white">
                      <i className="bi bi-clock-history me-2"></i>
                      Configure Time Segments
                    </div>
                    <div className="card-body">
                      <TimeSegmentEntry
                        existingSegments={quickAddSegments}
                        onSubmit={handleQuickAddSegmentsUpdate}
                        buttonText="Update Time Segments"
                        submitButtonClass="btn-success"
                        showSubmitButton={false}
                        employeeName={user?.name}
                        employeeId={user?.id}
                        shiftDate={quickAddDateRange.startDate}
                        onSegmentsChange={handleQuickAddSegmentsUpdate}
                      />

                      {quickAddSegments.length > 0 && (
                        <div className="mt-3 p-2 bg-light rounded">
                          <small className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            {quickAddSegments.length} time segment(s) configured
                          </small>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {bulkProgress.isProcessing && (
                    <div className="card border-warning">
                      <div className="card-body">
                        <div className="d-flex align-items-center mb-2">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                          <strong>Creating shifts... {bulkProgress.current} of {bulkProgress.total}</strong>
                        </div>
                        <div className="progress" style={{ height: '25px' }}>
                          <div
                            className="progress-bar progress-bar-striped progress-bar-animated"
                            role="progressbar"
                            style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                          >
                            {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                          </div>
                        </div>
                        <small className="text-muted mt-2 d-block">
                          Please wait while shifts are being created...
                        </small>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelQuickAdd}
                    disabled={bulkProgress.isProcessing}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleQuickAddSubmit}
                    disabled={bulkProgress.isProcessing || quickAddSegments.length === 0}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    {bulkProgress.isProcessing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-lightning-fill me-1"></i>
                        Create Shifts
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit/Add Shift Modal */}
        {/* View Segments Modal */}
        {viewingSegments && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-light">
                  <h5 className="modal-title">
                    <i className="bi bi-clock-history me-2"></i>
                    Shift Segments
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setViewingSegments(null)}></button>
                </div>
                <div className="modal-body p-0">
                  <div className="p-3 bg-light border-bottom">
                    <div className="d-flex justify-content-between">
                      <div><strong>Date:</strong> {formatDate(viewingSegments.shiftDate || viewingSegments.date)}</div>
                      <div><strong>Total:</strong> {formatDuration(viewingSegments.totalDuration)} hrs</div>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-striped mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Start</th>
                          <th>End</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingSegments.parsedSegments && viewingSegments.parsedSegments.length > 0 ? (
                          viewingSegments.parsedSegments.map((seg, idx) => (
                            <tr key={idx}>
                              <td>{seg.startTime || '-'}</td>
                              <td>{seg.endTime || '-'}</td>
                              <td>{seg.duration ? formatDuration(seg.duration) : '-'} hrs</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="text-center text-muted py-3">No segments found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setViewingSegments(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingShift && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className={`bi ${editingShift.isNew ? 'bi-plus-circle' : 'bi-pencil-square'} me-2`}></i>
                    {editingShift.isNew ? 'Add New Shift' : 'Edit Shift Times'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <strong>Date:</strong> {formatDate(editingShift.shiftDate || editingShift.date)}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Shift Type</label>
                      <select
                        className="form-select"
                        value={editFormData.shiftType}
                        onChange={(e) => setEditFormData({ ...editFormData, shiftType: e.target.value })}
                        disabled={saving}
                      >
                        <option value="Regular">Regular</option>
                        <option value="Overtime">Overtime</option>
                        <option value="Night">Night Shift</option>
                        <option value="Weekend">Weekend</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Start Time</label>
                      <RollingTimePicker
                        label="Start Time"
                        value={editFormData.firstStartTime}
                        onChange={(time) => setEditFormData({ ...editFormData, firstStartTime: time })}
                        disabled={saving}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">End Time</label>
                      <RollingTimePicker
                        label="End Time"
                        value={editFormData.lastEndTime}
                        onChange={(time) => setEditFormData({ ...editFormData, lastEndTime: time })}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {editFormData.firstStartTime && editFormData.lastEndTime && (
                    <div className="mt-3 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Calculated Duration:</span>
                        <strong className="text-primary">
                          {calculateDuration(editFormData.firstStartTime, editFormData.lastEndTime).toFixed(2)} hours
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Advanced Time Segment Entry */}
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-info btn-sm"
                      onClick={() => setShowAdvancedEdit(!showAdvancedEdit)}
                      disabled={saving}
                    >
                      <i className="bi bi-gear me-1"></i>
                      {showAdvancedEdit ? 'Hide Advanced Edit' : 'Advanced Edit (Time Segments)'}
                    </button>
                  </div>

                  {showAdvancedEdit && (
                    <div className="mt-3">
                      <h6 className="text-primary">
                        <i className="bi bi-gear me-2"></i>
                        Advanced Time Segment Editor
                      </h6>
                      <div className="border rounded p-3 bg-light">
                        <TimeSegmentEntry
                          existingSegments={editingShift ? JSON.parse(editingShift.timeSegments || '[]') : []}
                          onSubmit={handleSubmitTimeSegments}
                          buttonText="Update Time Segments"
                          submitButtonClass="btn-success"
                          showSubmitButton={true}
                          employeeName={editingShift?.employeeName}
                          employeeId={editingShift?.employeeId}
                          shiftDate={editingShift?.shiftDate || editingShift?.date}
                          onCancel={() => setShowAdvancedEdit(false)}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveEdit}
                    disabled={saving || !editFormData.firstStartTime || !editFormData.lastEndTime}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftEntry;