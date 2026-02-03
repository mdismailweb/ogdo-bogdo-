import React, { useState, useEffect, useRef } from 'react';
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
    const [tempHour, setTempHour] = useState('12');
    const [tempMinute, setTempMinute] = useState('00');
    const [tempPeriod, setTempPeriod] = useState('AM');

    // Convert 24-hour to 12-hour format
    useEffect(() => {
        if (value && value.includes(':')) {
            const [hours, minutes] = value.split(':');
            const hourNum = parseInt(hours);

            const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
            const newPeriod = hourNum >= 12 ? 'PM' : 'AM';

            setDisplayHour(hour12.toString());
            setDisplayMinute(minutes);
            setDisplayPeriod(newPeriod);
        }
    }, [value]);

    // Format display value
    const formattedValue = value ? `${displayHour}:${displayMinute} ${displayPeriod}` : '';

    // Open modal and initialize temp state
    const handleOpen = () => {
        if (disabled) return;
        setTempHour(displayHour);
        setTempMinute(displayMinute);
        setTempPeriod(displayPeriod);
        setOpen(true);
    };

    // Handle Done button
    const handleDone = () => {
        // Convert 12h to 24h
        let hour24 = parseInt(tempHour);
        if (tempPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        } else if (tempPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        }

        const time24 = `${hour24.toString().padStart(2, '0')}:${tempMinute}`;
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
                        p: 2
                    }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {label}
                    </Typography>
                    <IconButton onClick={handleCancel} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <DialogContent sx={{ pb: 2 }}>
                    {/* Wheel Pickers Container */}
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 2
                    }}>
                        {/* Hour Wheel */}
                        <WheelPicker
                            value={tempHour}
                            onChange={setTempHour}
                            options={Array.from({ length: 12 }, (_, i) => (i + 1).toString())}
                            label="Hour"
                        />

                        {/* Separator */}
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.secondary', pt: 2 }}>
                            :
                        </Typography>

                        {/* Minute Wheel */}
                        <WheelPicker
                            value={tempMinute}
                            onChange={setTempMinute}
                            options={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))}
                            label="Minute"
                        />
                    </Box>

                    {/* AM/PM Toggle */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <ToggleButtonGroup
                            value={tempPeriod}
                            exclusive
                            onChange={(e, newPeriod) => {
                                if (newPeriod !== null) {
                                    setTempPeriod(newPeriod);
                                }
                            }}
                            sx={{
                                '& .MuiToggleButton-root': {
                                    px: 4,
                                    py: 1.5,
                                    fontSize: '1.1rem',
                                    fontWeight: 600
                                }
                            }}
                        >
                            <ToggleButton value="AM">AM</ToggleButton>
                            <ToggleButton value="PM">PM</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCancel} variant="outlined" sx={{ px: 3 }}>
                        Cancel
                    </Button>
                    <Button onClick={handleDone} variant="contained" sx={{ px: 3 }}>
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// Wheel Picker Component
const WheelPicker = ({ value, onChange, options, label }) => {
    const containerRef = useRef(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);

    // Scroll to selected value on mount and value change
    useEffect(() => {
        if (!containerRef.current || isUserScrolling) return;

        const selectedIndex = options.indexOf(value);
        if (selectedIndex !== -1) {
            const itemHeight = 48;
            const scrollPosition = selectedIndex * itemHeight;
            containerRef.current.scrollTop = scrollPosition;
        }
    }, [value, options, isUserScrolling]);

    // Handle scroll end - snap to nearest item
    useEffect(() => {
        if (!containerRef.current) return;

        let scrollTimeout;
        const handleScroll = () => {
            setIsUserScrolling(true);
            clearTimeout(scrollTimeout);

            scrollTimeout = setTimeout(() => {
                if (!containerRef.current) return;

                const itemHeight = 48;
                const scrollTop = containerRef.current.scrollTop;
                const selectedIndex = Math.round(scrollTop / itemHeight);
                const clampedIndex = Math.max(0, Math.min(selectedIndex, options.length - 1));

                // Update value
                onChange(options[clampedIndex]);

                // Smooth scroll to snapped position
                containerRef.current.scrollTo({
                    top: clampedIndex * itemHeight,
                    behavior: 'smooth'
                });

                setIsUserScrolling(false);
            }, 150);
        };

        const container = containerRef.current;
        container.addEventListener('scroll', handleScroll);

        return () => {
            clearTimeout(scrollTimeout);
            container.removeEventListener('scroll', handleScroll);
        };
    }, [options, onChange]);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 80
        }}>
            <Typography variant="caption" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                {label}
            </Typography>

            <Box
                ref={containerRef}
                sx={{
                    height: 240,
                    overflowY: 'scroll',
                    position: 'relative',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    // Gradient masks
                    maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                    // Center highlight overlay
                    '&::before': {
                        content: '""',
                        position: 'sticky',
                        top: 96,
                        left: 0,
                        right: 0,
                        height: 48,
                        backgroundColor: 'action.hover',
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: 'primary.main',
                        pointerEvents: 'none',
                        zIndex: 1
                    }
                }}
            >
                {/* Spacer top */}
                <Box sx={{ height: 96 }} />

                {/* Options */}
                {options.map((option) => (
                    <Box
                        key={option}
                        onClick={() => {
                            onChange(option);
                            const selectedIndex = options.indexOf(option);
                            const itemHeight = 48;
                            containerRef.current.scrollTo({
                                top: selectedIndex * itemHeight,
                                behavior: 'smooth'
                            });
                        }}
                        sx={{
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: value === option ? 700 : 400,
                            color: value === option ? 'primary.main' : 'text.secondary',
                            cursor: 'pointer',
                            scrollSnapAlign: 'start',
                            transition: 'all 0.2s',
                            userSelect: 'none',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                                borderRadius: 1
                            }
                        }}
                    >
                        {option}
                    </Box>
                ))}

                {/* Spacer bottom */}
                <Box sx={{ height: 96 }} />
            </Box>
        </Box>
    );
};

export default RollingTimePicker;
