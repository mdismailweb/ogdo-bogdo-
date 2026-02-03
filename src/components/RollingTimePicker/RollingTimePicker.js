import React, { useState, useEffect } from 'react';
import {
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    Button,
    ToggleButton,
    ToggleButtonGroup,
    Box,
    Typography,
    IconButton
} from '@mui/material';
import { AccessTime as ClockIcon, Close as CloseIcon } from '@mui/icons-material';
import Picker from 'react-mobile-picker';

const RollingTimePicker = ({
    label = "Time",
    value = "", // 24-hour format "HH:MM"
    onChange,
    disabled = false,
    error = false,
    helperText = ""
}) => {
    const [open, setOpen] = useState(false);

    // Display state (from value prop)
    const [displayHour, setDisplayHour] = useState('12');
    const [displayMinute, setDisplayMinute] = useState('00');
    const [displayPeriod, setDisplayPeriod] = useState('AM');

    // Temporary state (while modal is open)
    const [pickerValue, setPickerValue] = useState({
        hour: '12',
        minute: '00'
    });
    const [tempPeriod, setTempPeriod] = useState('AM');

    // Generate picker options
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    // Convert 24-hour to 12-hour format
    useEffect(() => {
        if (value && value.includes(':')) {
            const [hours, mins] = value.split(':');
            const hourNum = parseInt(hours);

            const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
            const newPeriod = hourNum >= 12 ? 'PM' : 'AM';

            setDisplayHour(hour12.toString());
            setDisplayMinute(mins);
            setDisplayPeriod(newPeriod);
        }
    }, [value]);

    // Format display value
    const formattedValue = value ? `${displayHour}:${displayMinute} ${displayPeriod}` : '';

    // Open modal and initialize temp state
    const handleOpen = () => {
        if (disabled) return;
        setPickerValue({
            hour: displayHour,
            minute: displayMinute
        });
        setTempPeriod(displayPeriod);
        setOpen(true);
    };

    // Handle Done button
    const handleDone = () => {
        // Convert 12h to 24h
        let hour24 = parseInt(pickerValue.hour);
        if (tempPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        } else if (tempPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        }

        const time24 = `${hour24.toString().padStart(2, '0')}:${pickerValue.minute}`;
        onChange(time24);
        setOpen(false);
    };

    // Handle Cancel button
    const handleCancel = () => {
        setOpen(false);
    };

    return (
        <>
            {/* Clickable Text Field */}
            <TextField
                fullWidth
                label={label}
                value={formattedValue}
                onClick={handleOpen}
                InputProps={{
                    readOnly: true,
                    endAdornment: <ClockIcon sx={{ color: 'action.active', cursor: 'pointer' }} />
                }}
                disabled={disabled}
                error={error}
                helperText={helperText}
                sx={{
                    cursor: disabled ? 'default' : 'pointer',
                    '& .MuiInputBase-input': {
                        cursor: disabled ? 'default' : 'pointer'
                    }
                }}
            />

            {/* Time Picker Modal */}
            <Dialog
                open={open}
                onClose={handleCancel}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden'
                    }
                }}
            >
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {label}
                    </Typography>
                    <IconButton onClick={handleCancel} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <DialogContent sx={{ px: 0, py: 3 }}>
                    {/* Current Time Display */}
                    <Box sx={{
                        textAlign: 'center',
                        mb: 3,
                        px: 3
                    }}>
                        <Typography variant="h4" sx={{
                            fontWeight: 700,
                            color: 'primary.main',
                            fontFamily: 'monospace'
                        }}>
                            {pickerValue.hour}:{pickerValue.minute} {tempPeriod}
                        </Typography>
                    </Box>

                    {/* iOS-Style Wheel Picker */}
                    <Box sx={{
                        px: 2,
                        '& .picker-container': {
                            backgroundColor: '#f5f5f5',
                            borderRadius: 2,
                            overflow: 'hidden'
                        },
                        '& .picker-column': {
                            flex: 1
                        },
                        '& .picker-item': {
                            fontSize: '1.25rem',
                            fontWeight: 500,
                            color: '#666',
                            height: '44px',
                            lineHeight: '44px',
                            transition: 'all 0.3s'
                        },
                        '& .picker-item-selected': {
                            color: '#000',
                            fontWeight: 700,
                            fontSize: '1.5rem'
                        },
                        '& .picker-highlight': {
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            border: '1px solid rgba(25, 118, 210, 0.2)',
                            borderRadius: '8px',
                            margin: '0 8px'
                        }
                    }}>
                        <Picker
                            value={pickerValue}
                            onChange={setPickerValue}
                            wheelMode="natural"
                            height={220}
                        >
                            <Picker.Column name="hour">
                                {hours.map((hour) => (
                                    <Picker.Item key={hour} value={hour}>
                                        {hour}
                                    </Picker.Item>
                                ))}
                            </Picker.Column>
                            <Picker.Column name="minute">
                                {minutes.map((minute) => (
                                    <Picker.Item key={minute} value={minute}>
                                        {minute}
                                    </Picker.Item>
                                ))}
                            </Picker.Column>
                        </Picker>
                    </Box>

                    {/* AM/PM Toggle */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, px: 3 }}>
                        <ToggleButtonGroup
                            value={tempPeriod}
                            exclusive
                            onChange={(e, newPeriod) => {
                                if (newPeriod !== null) {
                                    setTempPeriod(newPeriod);
                                }
                            }}
                            fullWidth
                            sx={{
                                '& .MuiToggleButton-root': {
                                    py: 1.5,
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark'
                                        }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="AM">AM</ToggleButton>
                            <ToggleButton value="PM">PM</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </DialogContent>

                <DialogActions sx={{
                    p: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    gap: 1
                }}>
                    <Button
                        onClick={handleCancel}
                        variant="outlined"
                        fullWidth
                        sx={{
                            py: 1.2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDone}
                        variant="contained"
                        fullWidth
                        sx={{
                            py: 1.2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none'
                        }}
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default RollingTimePicker;
