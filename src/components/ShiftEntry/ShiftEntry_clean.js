import React, { useState, useEffect, useCallback } from 'react';
import { 
  TextField, 
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
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  AccessTime,
  PlayArrow,
  Pause,
  Stop,
  Work,
  Schedule,
  CheckCircle,
  Warning,
  ExpandMore
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getCurrentShift, 
  getCurrentDate,
  handleAPIError,
  makeAPICall,
  testBackendAutoUpdate
} from '../../services/appScriptAPI';
import TimeSegmentEntry from '../TimeSegmentEntry/TimeSegmentEntry';

const ShiftEntry = () => {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [shiftType, setShiftType] = useState('Regular');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Enhanced Smart Status Calculation (synchronized with AdminDashboard)
  const determineSmartStatus = (shiftData) => {
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

  // Function to sync status with backend when calculated status differs
  const syncStatusWithBackend = async (shiftData, calculatedStatus) => {
    if (calculatedStatus !== shiftData.status) {
      try {
        console.log(`🔄 Employee Dashboard - Status sync needed for ${shiftData.shiftId}: ${shiftData.status} → ${calculatedStatus}`);
        
        const response = await makeAPICall({
          action: 'updateShiftStatus',
          shiftId: shiftData.shiftId,
          newStatus: calculatedStatus,
          reason: 'Employee dashboard smart calculation'
        });
        
        if (response.success) {
          console.log(`✅ Employee Dashboard - Status synced for ${shiftData.shiftId}`);
          return calculatedStatus;
        } else {
          console.warn(`⚠️ Employee Dashboard - Failed to sync status for ${shiftData.shiftId}:`, response.message);
        }
      } catch (error) {
        console.error(`❌ Employee Dashboard - Error syncing status for ${shiftData.shiftId}:`, error);
      }
    }
    return shiftData.status; // Return original status if sync failed
  };

  // Load current shift status with smart status calculation and sync
  const loadCurrentShiftStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage('Checking shift status...');
    try {
      const response = await getCurrentShift({
        employeeId: user.id,
        date: getCurrentDate()
      });
      if (response.success && response.data) {
        // Enhanced: Smart status calculation with automatic backend sync
        console.log('🔍 Employee Dashboard - Raw backend data:', response.data);
        const smartStatus = determineSmartStatus(response.data);
        console.log(`🧮 Employee Dashboard - Smart Status Logic: Backend="${response.data.status}" → Calculated="${smartStatus}"`);
        
        // Sync with backend if status differs
        const finalStatus = await syncStatusWithBackend(response.data, smartStatus);
        
        const enhancedShiftData = {
          ...response.data,
          status: finalStatus, // Use final status (post-sync)
          _originalStatus: response.data.status, // Keep original for debugging
          _calculatedStatus: smartStatus, // Keep calculated for debugging
          _statusSynced: finalStatus !== response.data.status
        };
        
        setCurrentShift(enhancedShiftData);
        
        // Enhanced status message with sync indicator
        const syncMessage = enhancedShiftData._statusSynced ? ' (Status auto-corrected)' : '';
        setMessage(`Shift data loaded successfully. Status: ${finalStatus}${syncMessage}`);
      } else {
        setCurrentShift(null);
        setMessage('No shift found for today. You can create a new one.');
      }
    } catch (error) {
      setMessage('Error: ' + handleAPIError(error));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isInitializing) {
      const shiftCheckTimeout = setTimeout(() => {
        setIsInitializing(false);
        loadCurrentShiftStatus();
      }, 1500);
      return () => clearTimeout(shiftCheckTimeout);
    } else if (!user) {
      setIsInitializing(true);
    }
  }, [user, isInitializing, loadCurrentShiftStatus]);

  // Auto-update status every 30 seconds to keep it current
  useEffect(() => {
    if (!user || !currentShift) return;

    const statusUpdateInterval = setInterval(() => {
      if (currentShift && currentShift.segments) {
        const newSmartStatus = determineSmartStatus(currentShift);
        if (newSmartStatus !== currentShift.status) {
          console.log(`🔄 Status Auto-Update: ${currentShift.status} → ${newSmartStatus}`);
          
          // Update frontend state
          setCurrentShift(prev => ({
            ...prev,
            status: newSmartStatus
          }));

          // Sync with backend using enhanced sync function
          if (currentShift.shiftId) {
            syncStatusWithBackend(currentShift, newSmartStatus);
          }
        }
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(statusUpdateInterval);
  }, [user, currentShift]);

  const handleSubmitTimeSegments = async (segments, scheduleInfo = {}) => {
    setLoading(true);
    setMessage('');
    
    if (!user || !user.name || !user.id) {
      setMessage('Error: User information not available.');
      setLoading(false);
      return;
    }

    try {
      const response = await makeAPICall({
        action: 'submitTimeSegments',
        segments,
        employeeName: user.name,
        employeeId: user.id,
        shiftType,
        date: getCurrentDate(),
        ...scheduleInfo
      });

      if (response.success) {
        setMessage('Time segments submitted successfully!');
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
        completedAt: new Date().toISOString()
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

    const { segments = [], status, _statusSynced } = currentShift;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Current Shift Status</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {renderStatusChip(status)}
              {_statusSynced && (
                <Chip
                  icon={<Warning />}
                  label="Auto-corrected"
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
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

  if (isInitializing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading shift information...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Shift Entry
      </Typography>

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
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
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