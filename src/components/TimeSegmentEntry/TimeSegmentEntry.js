import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  IconButton,
  Grid,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import {
  validateSegmentsEditability,
  getTimeRestrictions
} from '../../services/appScriptAPI';
import ScheduleChangeWarning from '../ScheduleChangeWarning/ScheduleChangeWarning';
import { useAuth } from '../../contexts/AuthContext';
import RollingTimePicker from '../RollingTimePicker/RollingTimePicker';

const TimeSegmentEntry = ({ onSubmit, existingSegments = [], loading = false, shiftDate = null, scheduleStatus = 'draft' }) => {
  const { user } = useAuth();
  const [segments, setSegments] = useState(
    existingSegments.length > 0
      ? existingSegments.map(seg => ({
        startTime: seg.startTime || '',
        endTime: seg.endTime || '',
        id: seg.id || Date.now() + Math.random()
      }))
      : [{ startTime: '', endTime: '', id: Date.now() }]
  );
  const [errors, setErrors] = useState([]);
  const [isScheduleLocked, setIsScheduleLocked] = useState(scheduleStatus === 'locked' || scheduleStatus === 'completed');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Check time restrictions and editability on component mount and when segments change
  useEffect(() => {
    // Time restrictions are disabled, but keeping the structure for future use
    getTimeRestrictions(shiftDate);

    if (segments.length > 0 && segments.some(seg => seg.startTime && seg.endTime)) {
      validateSegmentsEditability(segments, shiftDate);
    }
  }, [segments, shiftDate]);

  const isSegmentEditable = (segment) => {
    // SIMPLIFIED: Only check schedule lock status, ignore time-based restrictions
    if (isScheduleLocked && !isEditing) return false;
    return true; // Always allow editing if schedule is not locked
  };

  const handleFixTiming = () => {
    if (validateSegments()) {
      setIsScheduleLocked(true);
      setIsEditing(false);
      // Call parent with locked status
      handleSubmit(true); // true indicates schedule should be locked
    }
  };

  const handleRevealSlots = () => {
    setShowWarningDialog(true);
  };

  const handleWarningConfirm = () => {
    setShowWarningDialog(false);
    setIsEditing(true);
    setIsScheduleLocked(false);
    // This will be tracked in the database
  };

  const handleWarningCancel = () => {
    setShowWarningDialog(false);
  };

  const addNewSegment = () => {
    setSegments([...segments, {
      startTime: '',
      endTime: '',
      id: Date.now() + Math.random()
    }]);
  };

  const removeSegment = (id) => {
    if (segments.length > 1) {
      setSegments(segments.filter(seg => seg.id !== id));
    }
  };

  const updateSegment = (id, field, value) => {
    const segment = segments.find(seg => seg.id === id);
    if (!isSegmentEditable(segment)) {
      return; // Prevent editing of non-editable segments
    }

    setSegments(segments.map(seg =>
      seg.id === id ? { ...seg, [field]: value } : seg
    ));
    // Clear errors when user starts typing
    setErrors([]);
  };

  const validateSegments = () => {
    const newErrors = [];

    segments.forEach((segment, index) => {
      // Check if both start and end times are provided
      if (!segment.startTime || !segment.endTime) {
        newErrors.push(`Segment ${index + 1}: Both start and end times are required`);
        return;
      }

      // Check if end time is after start time (allow cross-midnight shifts)
      const start = new Date(`1970-01-01T${segment.startTime}:00`);
      const end = new Date(`1970-01-01T${segment.endTime}:00`);

      // Calculate duration using the same logic as backend (handles cross-midnight)
      let diffMs = end - start;
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000; // Handle overnight shifts by adding 24 hours
      }
      const duration = diffMs / (1000 * 60 * 60);

      if (duration <= 0 || duration >= 24) {
        newErrors.push(`Segment ${index + 1}: Invalid time range (must be within 24 hours)`);
      }

      // REMOVED: Time restrictions for today's segments - now allows any time
    });

    // Check for overlapping segments
    for (let i = 0; i < segments.length - 1; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const seg1 = segments[i];
        const seg2 = segments[j];

        if (!seg1.startTime || !seg1.endTime || !seg2.startTime || !seg2.endTime) continue;

        const start1 = new Date(`1970-01-01T${seg1.startTime}:00`);
        const end1 = new Date(`1970-01-01T${seg1.endTime}:00`);
        const start2 = new Date(`1970-01-01T${seg2.startTime}:00`);
        const end2 = new Date(`1970-01-01T${seg2.endTime}:00`);

        if ((start1 < end2 && end1 > start2)) {
          newErrors.push(`Segments ${i + 1} and ${j + 1} overlap`);
        }
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const calculateTotalHours = () => {
    return segments.reduce((total, segment) => {
      if (segment.startTime && segment.endTime) {
        const start = new Date(`1970-01-01T${segment.startTime}:00`);
        const end = new Date(`1970-01-01T${segment.endTime}:00`);
        const diffMs = end - start;
        if (diffMs > 0) {
          return total + (diffMs / (1000 * 60 * 60));
        }
      }
      return total;
    }, 0);
  };

  const handleSubmit = (shouldLock = false) => {
    if (validateSegments()) {
      const validSegments = segments
        .filter(seg => seg.startTime && seg.endTime)
        .map((seg, index) => ({
          segmentId: index + 1,
          startTime: seg.startTime,
          endTime: seg.endTime,
          duration: (() => {
            try {
              const start = new Date(`1970-01-01T${seg.startTime}:00`);
              const end = new Date(`1970-01-01T${seg.endTime}:00`);
              let diffMs = end - start;

              // Handle overnight shifts
              if (diffMs < 0) {
                diffMs += 24 * 60 * 60 * 1000;
              }

              const hours = diffMs / (1000 * 60 * 60);
              console.log(`📊 Segment duration: ${seg.startTime} to ${seg.endTime} = ${hours.toFixed(2)} hours`);
              return Math.round(hours * 100) / 100; // Round to 2 decimal places
            } catch (error) {
              console.error('Error calculating segment duration:', error);
              return 0;
            }
          })()
        }));

      // Pass schedule status information to parent
      onSubmit(validSegments, {
        shouldLock,
        isScheduleChange: isEditing,
        previousStatus: scheduleStatus
      });
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          {/* Title Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Time Segments Entry
            </Typography>
          </Box>

          {/* Information Note */}
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.875rem' }}>
            <Typography variant="body2">
              <strong>Note:</strong> You can only have one active or completed shift per day.
              If you need to modify an existing shift, please use the History tab to edit your times.
            </Typography>
          </Alert>

          {/* Status Chips Row - Stack on Mobile */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flexWrap: 'wrap',
            '& > *': { flexShrink: 0 } // Prevent chips from shrinking
          }}>
            {isScheduleLocked ? (
              <Chip
                label="Schedule Locked"
                color="success"
                size="small"
                icon={<LockIcon />}
              />
            ) : (
              <Chip
                label="Draft Mode"
                color="warning"
                size="small"
                icon={<UnlockIcon />}
              />
            )}
            <Chip
              label={`Total: ${(calculateTotalHours() || 0).toFixed(2)} hours`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {isScheduleLocked && !isEditing && (
          <Alert severity="info" sx={{ mb: 2 }} icon={<CheckIcon />}>
            Your schedule is locked and secured. Click "Reveal Slots" if you need to make changes.
          </Alert>
        )}

        {isEditing && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
            Schedule editing mode is active. All changes will be tracked in the database.
          </Alert>
        )}

        {segments.map((segment, index) => {
          const segmentEditable = isSegmentEditable(segment);

          return (
            <Box key={segment.id} sx={{ mb: 2 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 1,
                flexWrap: 'wrap',
                gap: 1
              }}>
                <Typography variant="subtitle2" sx={{
                  minWidth: { xs: '80px', sm: '100px' },
                  flexShrink: 0
                }}>
                  Segment {index + 1}
                </Typography>
                {!segmentEditable && (
                  <Chip
                    label="Schedule Locked"
                    size="small"
                    color="warning"
                    icon={<LockIcon />}
                    sx={{ flexShrink: 0 }}
                  />
                )}
                {segments.length > 1 && segmentEditable && (
                  <IconButton
                    size="small"
                    onClick={() => removeSegment(segment.id)}
                    color="error"
                    sx={{
                      ml: { xs: 0, sm: 'auto' },
                      order: { xs: 3, sm: 0 },
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'flex-end', sm: 'center' }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <RollingTimePicker
                    label="Start Time"
                    value={segment.startTime}
                    onChange={(time) => updateSegment(segment.id, 'startTime', time)}
                    disabled={loading || (isScheduleLocked && !isEditing)}
                    error={errors.some(err => err.includes(`Segment ${index + 1}`))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <RollingTimePicker
                    label="End Time"
                    value={segment.endTime}
                    onChange={(time) => updateSegment(segment.id, 'endTime', time)}
                    disabled={loading || (isScheduleLocked && !isEditing)}
                    error={errors.some(err => err.includes(`Segment ${index + 1}`))}
                  />
                </Grid>
              </Grid>

              {index < segments.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          );
        })}

        <Box sx={{
          display: 'flex',
          gap: 1,
          mt: 3,
          flexWrap: 'wrap',
          alignItems: 'center',
          '& > button': {
            minWidth: 'fit-content',
            flexShrink: 0
          }
        }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addNewSegment}
            disabled={
              loading ||
              (isScheduleLocked && !isEditing)
            }
            size="small"
          >
            Add Segment
          </Button>

          {!isScheduleLocked && (
            <Button
              variant="contained"
              color="success"
              startIcon={<LockIcon />}
              onClick={handleFixTiming}
              disabled={
                loading ||
                segments.some(seg => !seg.startTime || !seg.endTime)
              }
              size="small"
            >
              Fix Timing
            </Button>
          )}

          {isScheduleLocked && !isEditing && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<UnlockIcon />}
              onClick={handleRevealSlots}
              disabled={loading}
              size="small"
            >
              Reveal Slots
            </Button>
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{
            display: 'block',
            lineHeight: 1.4,
            wordBreak: 'break-word'
          }}>
            💡 Tip: You can add multiple work segments for the same day (e.g., morning shift + evening shift)
            <br />📝 Note: Use "Fix Timing" to lock your schedule, or "Reveal Slots" to edit locked schedules.
          </Typography>
        </Box>
      </CardContent>

      <ScheduleChangeWarning
        open={showWarningDialog}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
        userName={user?.name || 'User'}
      />
    </Card>
  );
};

export default TimeSegmentEntry;