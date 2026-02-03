import React, { useState, useEffect } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    Paper,
    Typography
} from '@mui/material';
import { AccessTime as ClockIcon } from '@mui/icons-material';

const RollingTimePicker = ({
    label = "Time",
    value = "", // 24-hour format "HH:MM"
    onChange,
    disabled = false,
    error = false,
    helperText = ""
}) => {
    // State for 12-hour format components
    const [hour, setHour] = useState('12');
    const [minute, setMinute] = useState('00');
    const [period, setPeriod] = useState('AM');

    // Convert 24-hour to 12-hour format when value changes
    useEffect(() => {
        if (value && value.includes(':')) {
            const [hours, minutes] = value.split(':');
            const hourNum = parseInt(hours);

            // Convert to 12-hour format
            const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
            const newPeriod = hourNum >= 12 ? 'PM' : 'AM';

            setHour(hour12.toString());
            setMinute(minutes);
            setPeriod(newPeriod);
        }
    }, [value]);

    // Convert 12-hour to 24-hour and notify parent
    const handleTimeChange = (newHour, newMinute, newPeriod) => {
        let hour24 = parseInt(newHour);

        // Convert to 24-hour format
        if (newPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        } else if (newPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        }

        const time24 = `${hour24.toString().padStart(2, '0')}:${newMinute}`;
        onChange(time24);
    };

    const handleHourChange = (e) => {
        const newHour = e.target.value;
        setHour(newHour);
        handleTimeChange(newHour, minute, period);
    };

    const handleMinuteChange = (e) => {
        const newMinute = e.target.value;
        setMinute(newMinute);
        handleTimeChange(hour, newMinute, period);
    };

    const handlePeriodChange = (event, newPeriod) => {
        if (newPeriod !== null) {
            setPeriod(newPeriod);
            handleTimeChange(hour, minute, newPeriod);
        }
    };

    // Generate hour options (1-12)
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

    // Generate minute options (00-59)
    const minutes = Array.from({ length: 60 }, (_, i) =>
        i.toString().padStart(2, '0')
    );

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                border: error ? '1px solid #d32f2f' : '1px solid #e0e0e0',
                borderRadius: 1,
                backgroundColor: disabled ? '#f5f5f5' : 'transparent'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <ClockIcon sx={{ mr: 1, color: disabled ? 'text.disabled' : 'primary.main', fontSize: 20 }} />
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 500,
                        color: disabled ? 'text.disabled' : error ? 'error.main' : 'text.primary'
                    }}
                >
                    {label}
                </Typography>
            </Box>

            <Box sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                {/* Hour Selector */}
                <FormControl
                    size="small"
                    sx={{
                        minWidth: 80,
                        flex: { xs: '1 1 45%', sm: '0 0 auto' }
                    }}
                    disabled={disabled}
                >
                    <InputLabel id={`${label}-hour-label`}>Hour</InputLabel>
                    <Select
                        labelId={`${label}-hour-label`}
                        value={hour}
                        label="Hour"
                        onChange={handleHourChange}
                        MenuProps={{
                            PaperProps: {
                                style: {
                                    maxHeight: 300,
                                },
                            },
                        }}
                        sx={{
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            '& .MuiSelect-select': {
                                py: 1.5,
                            }
                        }}
                    >
                        {hours.map((h) => (
                            <MenuItem
                                key={h}
                                value={h}
                                sx={{
                                    fontSize: '1.1rem',
                                    py: 1.5,
                                    justifyContent: 'center'
                                }}
                            >
                                {h}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Typography variant="h6" sx={{ color: 'text.secondary', px: 0.5 }}>:</Typography>

                {/* Minute Selector */}
                <FormControl
                    size="small"
                    sx={{
                        minWidth: 80,
                        flex: { xs: '1 1 45%', sm: '0 0 auto' }
                    }}
                    disabled={disabled}
                >
                    <InputLabel id={`${label}-minute-label`}>Min</InputLabel>
                    <Select
                        labelId={`${label}-minute-label`}
                        value={minute}
                        label="Min"
                        onChange={handleMinuteChange}
                        MenuProps={{
                            PaperProps: {
                                style: {
                                    maxHeight: 300,
                                },
                            },
                        }}
                        sx={{
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            '& .MuiSelect-select': {
                                py: 1.5,
                            }
                        }}
                    >
                        {minutes.map((m) => (
                            <MenuItem
                                key={m}
                                value={m}
                                sx={{
                                    fontSize: '1.1rem',
                                    py: 1.5,
                                    justifyContent: 'center'
                                }}
                            >
                                {m}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* AM/PM Toggle */}
                <ToggleButtonGroup
                    value={period}
                    exclusive
                    onChange={handlePeriodChange}
                    disabled={disabled}
                    sx={{
                        flex: { xs: '1 1 100%', sm: '0 0 auto' },
                        '& .MuiToggleButton-root': {
                            flex: { xs: 1, sm: 'initial' },
                            py: 1.2,
                            px: 3,
                            fontSize: '1rem',
                            fontWeight: 600,
                            minWidth: { xs: 'auto', sm: '60px' }
                        }
                    }}
                >
                    <ToggleButton value="AM" aria-label="AM">
                        AM
                    </ToggleButton>
                    <ToggleButton value="PM" aria-label="PM">
                        PM
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {helperText && (
                <Typography
                    variant="caption"
                    sx={{
                        mt: 1,
                        display: 'block',
                        color: error ? 'error.main' : 'text.secondary'
                    }}
                >
                    {helperText}
                </Typography>
            )}
        </Paper>
    );
};

export default RollingTimePicker;
