import React, { useState, useEffect } from 'react';
import {
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    Button,
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

    // Generate options
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    // Display state
    const [displayTime, setDisplayTime] = useState({ hour: '12', minute: '00', period: 'AM' });

    // Temporary picker state (while modal is open)
    const [pickerValue, setPickerValue] = useState({ hour: '12', minute: '00' });
    const [tempPeriod, setTempPeriod] = useState('AM');

    // Convert 24h to 12h for display
    useEffect(() => {
        if (value && value.includes(':')) {
            const [hours, mins] = value.split(':');
            const hourNum = parseInt(hours);

            const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
            const period = hourNum >= 12 ? 'PM' : 'AM';

            setDisplayTime({ hour: hour12.toString(), minute: mins, period });
        }
    }, [value]);

    const formattedValue = value ? `${displayTime.hour}:${displayTime.minute} ${displayTime.period}` : '';

    const handleOpen = () => {
        if (disabled) return;
        setPickerValue({ hour: displayTime.hour, minute: displayTime.minute });
        setTempPeriod(displayTime.period);
        setOpen(true);
    };

    const handleDone = () => {
        // Convert 12h to 24h
        let hour24 = parseInt(pickerValue.hour);
        if (tempPeriod === 'AM' && hour24 === 12) hour24 = 0;
        else if (tempPeriod === 'PM' && hour24 !== 12) hour24 += 12;

        const time24 = `${hour24.toString().padStart(2, '0')}:${pickerValue.minute}`;
        onChange(time24);
        setOpen(false);
    };

    return (
        <>
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
                    '& .MuiInputBase-input': { cursor: disabled ? 'default' : 'pointer' }
                }}
            />

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, maxWidth: '340px' } }}
            >
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderBottom: '1px solid #e0e0e0'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {label}
                    </Typography>
                    <IconButton onClick={() => setOpen(false)} size="small">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <DialogContent sx={{ px: 2, py: 3 }}>
                    {/* Time Display */}
                    <Typography sx={{
                        textAlign: 'center',
                        fontSize: '2.5rem',
                        fontWeight: 400,
                        color: '#007AFF',
                        mb: 2,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>
                        {pickerValue.hour}:{pickerValue.minute} {tempPeriod}
                    </Typography>

                    {/* Wheel Picker */}
                    <Box sx={{
                        '& .picker-container': {
                            backgroundColor: '#f8f8f8',
                            borderRadius: 2,
                            py: 1
                        },
                        '& .picker-item': {
                            fontSize: '1.3rem',
                            color: '#999',
                            height: '36px',
                            lineHeight: '36px'
                        },
                        '& .picker-item-selected': {
                            color: '#000',
                            fontWeight: 600,
                            fontSize: '1.4rem'
                        },
                        '& .picker-highlight': {
                            backgroundColor: 'rgba(0, 122, 255, 0.1)',
                            border: '1px solid rgba(0, 122, 255, 0.3)',
                            borderRadius: 1
                        }
                    }}>
                        <Picker
                            value={pickerValue}
                            onChange={setPickerValue}
                            wheelMode="natural"
                            height={180}
                        >
                            <Picker.Column name="hour">
                                {hours.map(hour => (
                                    <Picker.Item key={hour} value={hour}>{hour}</Picker.Item>
                                ))}
                            </Picker.Column>
                            <Picker.Column name="minute">
                                {minutes.map(minute => (
                                    <Picker.Item key={minute} value={minute}>{minute}</Picker.Item>
                                ))}
                            </Picker.Column>
                        </Picker>
                    </Box>

                    {/* AM/PM Toggle */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        {['AM', 'PM'].map(period => (
                            <Button
                                key={period}
                                variant={tempPeriod === period ? 'contained' : 'outlined'}
                                onClick={() => setTempPeriod(period)}
                                fullWidth
                                sx={{
                                    py: 1,
                                    fontSize: '1rem',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    borderRadius: 2,
                                    backgroundColor: tempPeriod === period ? '#007AFF' : 'transparent',
                                    borderColor: '#007AFF',
                                    color: tempPeriod === period ? 'white' : '#007AFF',
                                    '&:hover': {
                                        backgroundColor: tempPeriod === period ? '#0051D5' : 'rgba(0, 122, 255, 0.04)'
                                    }
                                }}
                            >
                                {period}
                            </Button>
                        ))}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 2, pb: 2, gap: 1, borderTop: '1px solid #e0e0e0', pt: 2 }}>
                    <Button
                        onClick={() => setOpen(false)}
                        variant="outlined"
                        fullWidth
                        sx={{
                            py: 0.8,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            borderColor: '#d0d0d0',
                            color: '#666'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDone}
                        variant="contained"
                        fullWidth
                        sx={{
                            py: 0.8,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            backgroundColor: '#007AFF',
                            '&:hover': { backgroundColor: '#0051D5' }
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
