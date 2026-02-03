import React, { useState, useEffect, useCallback } from 'react';
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  Button, 
  Grid, 
  Alert,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  AccessTime,
  PlayArrow,
  Pause,
  Stop,
  Schedule,
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getCurrentShift, 
  getCurrentDate,
  handleAPIError,
  makeAPICall,
  syncStatusToSheet,
  submitTimeSegments,
  applyFrontendSmartStatus,
  fixShiftStatus,
  getCurrentShiftWithCrossMidnight
} from '../../services/appScriptAPI';
import TimeSegmentEntry from '../TimeSegmentEntry/TimeSegmentEntry';

const ShiftEntry = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // When the date changes, clear current shift and fetch new data
  useEffect(() => {
    if (user && selectedDate) {
      setCurrentShift(null);
      setMessage('Loading shift data for selected date...');
      // Always enforce DRAFT for future dates, skip correction logic
      (async () => {
        let response = await getCurrentShiftWithCrossMidnight({
          employeeId: user.id,
          date: selectedDate.toISOString().split('T')[0],
          forceRefresh: true
        });
        if (response.success && response.data) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let shiftDate = new Date(selectedDate);
          shiftDate.setHours(0, 0, 0, 0);
          // If future date, always display DRAFT and skip correction
          if (shiftDate > today) {
            response.data.status = 'DRAFT';
            setCurrentShift(response.data);
            setMessage(`📊 Current status: DRAFT (future date)`);
            return;
          }
          // For today/past, use enhanced smart status and correct if needed
          const correction = detectStatusCorrection(response.data);
          if (correction.needsCorrection) {
            console.log(`🔄 ShiftEntry STATUS CORRECTION: ${correction.originalStatus} → ${correction.correctedStatus}`);
            try {
              // Use the robust fixShiftStatus system
              const fixResult = await fixShiftStatus({
                shiftId: response.data.shiftId,
                correctStatus: correction.correctedStatus
              });
              
              if (fixResult.success) {
                console.log('✅ ShiftEntry status correction applied successfully');
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                console.warn('⚠️ fixShiftStatus failed, falling back to syncStatusToSheet');
                // Fallback to original method
                await syncStatusToSheet(
                  response.data.shiftId,
                  correction.correctedStatus,
                  `Smart status update: ${correction.originalStatus} → ${correction.correctedStatus}`
                );
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } catch (error) {
              console.error('❌ Status correction error:', error);
              setMessage(`❌ Error updating status: ${error.message}`);
            }
            
            response = await getCurrentShiftWithCrossMidnight({
              employeeId: user.id,
              date: selectedDate.toISOString().split('T')[0],
              forceRefresh: true
            });
          }
          setCurrentShift(response.data);
          setMessage(`📊 Current status: ${response.data.status} (verified)`);
        } else {
          setCurrentShift(null);
          let dateStr = 'today';
          if (selectedDate instanceof Date && !isNaN(selectedDate)) {
            dateStr = selectedDate.toLocaleDateString('en-US');
          }
          setMessage(`No shift found for ${dateStr}.`);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

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

  // Load current shift with smart calculation → update sheet → fetch fresh data
  const loadCurrentShiftStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage('Loading shift data from Google Sheets...');
    
    try {
      // Capture the date at the start of the function to avoid race conditions
      const dateAtFetch = selectedDate instanceof Date && !isNaN(selectedDate)
        ? new Date(selectedDate)
        : new Date();
      // Always fetch, recalculate, update sheet if needed, then fetch again
      let response = await getCurrentShiftWithCrossMidnight({
        employeeId: user.id,
        date: dateAtFetch.toISOString().split('T')[0],
        forceRefresh: true
      });

      if (response.success && response.data) {
        console.log('📊 RECEIVED SHEET DATA:', JSON.stringify(response.data, null, 2));

        const sheetStatus = response.data.status;
        const calculatedStatus = determineSmartStatus(response.data);

        console.log(`STATUS COMPARISON: Sheet="${sheetStatus}" vs Calculated="${calculatedStatus}"`);

        // Use enhanced status correction detection
        const correction = detectStatusCorrection(response.data);
        if (correction.needsCorrection) {
          console.log(`🔄 UPDATING SHEET: ${correction.originalStatus} → ${correction.correctedStatus}`);
          try {
            // Try the robust fixShiftStatus first
            const fixResult = await fixShiftStatus({
              shiftId: response.data.shiftId,
              correctStatus: correction.correctedStatus
            });
            
            if (fixResult.success) {
              console.log('✅ Sheet updated successfully with fixShiftStatus');
            } else {
              console.warn('⚠️ fixShiftStatus failed, using fallback');
              // Fallback to original method
              const syncResult = await syncStatusToSheet(
                response.data.shiftId,
                correction.correctedStatus,
                `Smart status update: ${correction.originalStatus} → ${correction.correctedStatus}`
              );
              if (syncResult.success) {
                console.log('✅ Sheet updated successfully with fallback');
              } else {
                setMessage(`⚠️ Failed to update sheet: ${syncResult.message}`);
              }
            }
          } catch (error) {
            console.error('❌ Status update error:', error);
            setMessage(`❌ Error updating status: ${error.message}`);
          }
          // Always fetch fresh data after update attempt
          response = await getCurrentShiftWithCrossMidnight({
            employeeId: user.id,
            date: dateAtFetch.toISOString().split('T')[0],
            forceRefresh: true
          });
        }
        // Display latest data
        setCurrentShift(response.data);
        setMessage(`📊 Current status: ${response.data.status} (verified)`);
      } else {
        setCurrentShift(null);
        // Always use the selectedDate for the message
        let dateStr = 'today';
        if (selectedDate instanceof Date && !isNaN(selectedDate)) {
          // Format as MM/DD/YYYY for clarity
          dateStr = selectedDate.toLocaleDateString('en-US');
        }
        setMessage(`No shift found for ${dateStr}.`);
      }
    } catch (error) {
      setMessage('Error: ' + handleAPIError(error));
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

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

  const handleSubmitTimeSegments = async (segments, scheduleInfo = {}) => {
    setLoading(true);
    setMessage('');
    
    if (!user || !user.name || !user.id) {
      setMessage('Error: User information not available.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        segments,
        employeeName: user.name,
        employeeId: user.id,
        shiftType: 'Regular',
        date: selectedDate ? selectedDate.toISOString().split('T')[0] : getCurrentDate(),
        ...scheduleInfo
      };
      
      // 🔥 CRITICAL: Pass existing shift ID if available for proper segment updates
      if (currentShift && currentShift.shiftId) {
        payload.existingShiftId = currentShift.shiftId;
        payload.isUpdate = true;
        console.log(`🔧 Using existing shift ID: ${currentShift.shiftId} for segment update`);
      } else {
        console.log('🆕 Creating new shift (no existing shift ID)');
      }
      
      console.log('📤 ShiftEntry submitting segments with payload:', payload);
      
      const response = await submitTimeSegments(payload);

      if (response.success) {
        setMessage('✅ Time segments updated successfully in Google Sheets!');
        
        // 🔄 Force fresh data reload to show updated segments
        console.log('🔄 Forcing fresh data reload after segment update...');
        setTimeout(() => {
          loadCurrentShiftStatus();
        }, 1000); // Small delay to ensure backend processing is complete
        
      } else {
        setMessage('❌ Error: ' + response.message);
      }
    } catch (error) {
      setMessage('❌ Error: ' + handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteShift = async () => {
    if (!currentShift || !currentShift.shiftId) {
      setMessage('Error: No active shift to complete.');
      return;
    }

    setLoading(true);
    try {
      const response = await makeAPICall({
        action: 'completeShift',
        shiftId: currentShift.shiftId,
        employeeId: user.id,
        completedAt: new Date().toISOString(),
        date: selectedDate ? selectedDate.toISOString().split('T')[0] : getCurrentDate()
      });

      if (response.success) {
        setMessage('Shift completed successfully!');
        loadCurrentShiftStatus();
      } else {
        setMessage('Error: ' + response.message);
      }
    } catch (error) {
      setMessage('Error: ' + handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const renderStatusChip = (status) => {
    const statusConfig = {
      'DRAFT': { color: 'default', icon: <Schedule />, label: 'Draft' },
      'OFFLINE': { color: 'default', icon: <Pause />, label: 'Offline' },
      'ACTIVE': { color: 'success', icon: <PlayArrow />, label: 'Active' },
      'ON BREAK': { color: 'warning', icon: <Pause />, label: 'On Break' },
      'COMPLETED': { color: 'primary', icon: <CheckCircle />, label: 'Completed' }
    };

    const config = statusConfig[status] || statusConfig['DRAFT'];
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        variant="outlined"
        size="small"
      />
    );
  };

  const renderShiftSummary = () => {
    if (!currentShift) return null;

    const { segments = [], status } = currentShift;
    // Always use the frontend-calculated status for display
    const displayStatus = determineSmartStatus(currentShift);

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Current Shift (Pure Sheet Data)</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {renderStatusChip(displayStatus)}
            </Box>
          </Box>
          
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Shift ID: {currentShift.shiftId} | Date: {currentShift.date}
              {currentShift.day && (
                <Chip 
                  label={currentShift.day} 
                  size="small" 
                  color="secondary" 
                  sx={{ ml: 1 }} 
                />
              )}
              {currentShift._isCrossMidnight && (
                <Chip 
                  label="Cross-Midnight Shift" 
                  size="small" 
                  color="info" 
                  sx={{ ml: 1 }} 
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Duration: {currentShift.totalDuration || 'N/A'} | Last End: {currentShift.lastEndTime || 'N/A'}
            </Typography>
            {currentShift._crossMidnightNote && (
              <Typography variant="body2" color="info.main" sx={{ fontStyle: 'italic', mt: 1 }}>
                ℹ️ {currentShift._crossMidnightNote}
              </Typography>
            )}
          </Box>
          
          {segments.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Time Segments:
              </Typography>
              <List dense>
                {segments.map((segment, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <AccessTime fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${segment.startTime} - ${segment.endTime || 'In Progress'}`}
                      secondary={segment.activity || 'Work'}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Shift Entry
      </Typography>

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Select Shift Date"
          value={selectedDate}
          onChange={(newDate) => setSelectedDate(newDate)}
          disablePast={false}
          renderInput={(params) => <TextField {...params} sx={{ mb: 2 }} />}
        />
      </LocalizationProvider>

      {message && (
        <Alert 
          severity={message.includes('Error') ? 'error' : 'success'} 
          sx={{ mb: 2 }}
        >
          {message}
        </Alert>
      )}

      {renderShiftSummary()}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <TimeSegmentEntry
              onSubmit={handleSubmitTimeSegments}
              currentShift={currentShift}
              loading={loading}
            />
          </Paper>
        </Grid>
      </Grid>

      {currentShift && currentShift.status === 'ACTIVE' && (
        <Box mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCompleteShift}
            disabled={loading}
            startIcon={<Stop />}
          >
            Complete Shift
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={loadCurrentShiftStatus}
            disabled={loading}
            sx={{ ml: 2 }}
          >
            Refresh Sheet Data
          </Button>
        </Box>
      )}

      {(!currentShift || currentShift.status !== 'ACTIVE') && (
        <Box mt={2}>
          <Button
            variant="outlined"
            color="primary"
            onClick={loadCurrentShiftStatus}
            disabled={loading}
          >
            Refresh Sheet Data
          </Button>
        </Box>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" mt={2}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default ShiftEntry;