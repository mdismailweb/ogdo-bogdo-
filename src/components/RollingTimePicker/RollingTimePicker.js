import React, { useState, useEffect } from 'react';
import {
    TextField,
    Dialog,
    DialogContent,
    Button,
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
                        overflow: 'hidden',
                        maxWidth: '340px'
                    }
                }}
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
                    <IconButton onClick={handleCancel} size="small">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <DialogContent sx={{ px: 0, py: 3 }}>
                    {/* Current Time Display - Large Blue Numbers */}
                    <Box sx={{
                        textAlign: 'center',
                        mb: 3,
                        px: 3
                    }}>
                        <Typography sx={{
                            fontSize: '3rem',
                            fontWeight: 400,
                            color: '#007AFF',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '0.02em'
                        }}>
                            {tempHour}:{tempMinute} {tempPeriod}
                        </Typography>
                    </Box>

                    {/* Wheel Pickers Container */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 2,
                        px: 2,
                        mb: 2
                    }}>
                        {/* Hour Wheel */}
                        <IOSWheelPicker
                            value={tempHour}
                            onChange={setTempHour}
                            options={Array.from({ length: 12 }, (_, i) => (i + 1).toString())}
                        />

                        {/* Minute Wheel */}
                        <IOSWheelPicker
                            value={tempMinute}
                            onChange={setTempMinute}
                            options={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))}
                        />
                    </Box>

                    {/* AM/PM Toggle - iOS Style */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 1,
                        px: 3,
                        mb: 2
                    }}>
                        <Button
                            variant={tempPeriod === 'AM' ? 'contained' : 'outlined'}
                            onClick={() => setTempPeriod('AM')}
                            sx={{
                                flex: 1,
                                py: 1,
                                fontSize: '1rem',
                                textTransform: 'none',
                                fontWeight: 500,
                                borderRadius: 2,
                                backgroundColor: tempPeriod === 'AM' ? '#007AFF' : 'transparent',
                                borderColor: '#007AFF',
                                color: tempPeriod === 'AM' ? 'white' : '#007AFF',
                                '&:hover': {
                                    backgroundColor: tempPeriod === 'AM' ? '#0051D5' : 'rgba(0, 122, 255, 0.04)'
                                }
                            }}
                        >
                            AM
                        </Button>
                        <Button
                            variant={tempPeriod === 'PM' ? 'contained' : 'outlined'}
                            onClick={() => setTempPeriod('PM')}
                            sx={{
                                flex: 1,
                                py: 1,
                                fontSize: '1rem',
                                textTransform: 'none',
                                fontWeight: 500,
                                borderRadius: 2,
                                backgroundColor: tempPeriod === 'PM' ? '#007AFF' : 'transparent',
                                borderColor: '#007AFF',
                                color: tempPeriod === 'PM' ? 'white' : '#007AFF',
                                '&:hover': {
                                    backgroundColor: tempPeriod === 'PM' ? '#0051D5' : 'rgba(0, 122, 255, 0.04)'
                                }
                            }}
                        >
                            PM
                        </Button>
                    </Box>
                </DialogContent>

                {/* Footer Buttons - Compact */}
                <Box sx={{
                    display: 'flex',
                    gap: 1,
                    px: 2,
                    pb: 2,
                    borderTop: '1px solid #e0e0e0',
                    pt: 2
                }}>
                    <Button
                        onClick={handleCancel}
                        variant="outlined"
                        fullWidth
                        sx={{
                            py: 0.8,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            fontWeight: 500,
                            borderRadius: 2,
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
                            fontWeight: 500,
                            borderRadius: 2,
                            backgroundColor: '#007AFF',
                            '&:hover': {
                                backgroundColor: '#0051D5'
                            }
                        }}
                    >
                        Done
                    </Button>
                </Box>
            </Dialog>
        </>
    );
};

// iOS-Style Wheel Picker Component
const IOSWheelPicker = ({ value, onChange, options }) => {
    const containerRef = React.useRef(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const ITEM_HEIGHT = 44;
    const VISIBLE_ITEMS = 5;
    const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

    // Create infinite scroll by tripling the options
    const infiniteOptions = [...options, ...options, ...options];
    const offsetIndex = options.length;

    // Scroll to selected value
    React.useEffect(() => {
        if (!containerRef.current || isDragging) return;

        const selectedIndex = options.indexOf(value);
        if (selectedIndex !== -1) {
            const scrollPosition = (selectedIndex + offsetIndex - 2) * ITEM_HEIGHT;
            containerRef.current.scrollTop = scrollPosition;
        }
    }, [value, options, offsetIndex, isDragging]);

    // Handle scroll end - snap to nearest item
    React.useEffect(() => {
        if (!containerRef.current) return;

        let scrollTimeout;
        const handleScroll = () => {
            setIsDragging(true);
            clearTimeout(scrollTimeout);

            scrollTimeout = setTimeout(() => {
                if (!containerRef.current) return;

                const scrollTop = containerRef.current.scrollTop;
                const selectedIndex = Math.round(scrollTop / ITEM_HEIGHT);
                const actualIndex = selectedIndex % options.length;

                onChange(options[actualIndex]);

                // Smooth scroll to snapped position
                containerRef.current.scrollTo({
                    top: selectedIndex * ITEM_HEIGHT,
                    behavior: 'smooth'
                });

                setTimeout(() => setIsDragging(false), 100);
            }, 100);
        };

        const container = containerRef.current;
        container.addEventListener('scroll', handleScroll);

        return () => {
            clearTimeout(scrollTimeout);
            container.removeEventListener('scroll', handleScroll);
        };
    }, [options, onChange]);

    return (
        <Box sx={{ position: 'relative', width: 80 }}>
            {/* Gradient Overlay */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                background: `
          linear-gradient(to bottom, 
            rgba(255,255,255,1) 0%,
            rgba(255,255,255,0) 20%,
            rgba(255,255,255,0) 80%,
            rgba(255,255,255,1) 100%)
        `,
                zIndex: 1
            }} />

            {/* Selection Highlight */}
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0, 122, 255, 0.08)',
                borderTop: '1px solid rgba(0, 122, 255, 0.3)',
                borderBottom: '1px solid rgba(0, 122, 255, 0.3)',
                borderRadius: 1,
                pointerEvents: 'none',
                zIndex: 1
            }} />

            {/* Scrollable Container */}
            <Box
                ref={containerRef}
                sx={{
                    height: CONTAINER_HEIGHT,
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    paddingTop: ITEM_HEIGHT * 2,
                    paddingBottom: ITEM_HEIGHT * 2
                }}
            >
                {infiniteOptions.map((option, index) => (
                    <Box
                        key={`${option}-${index}`}
                        onClick={() => {
                            onChange(option);
                            const targetIndex = index;
                            containerRef.current.scrollTo({
                                top: (targetIndex - 2) * ITEM_HEIGHT,
                                behavior: 'smooth'
                            });
                        }}
                        sx={{
                            height: ITEM_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 400,
                            color: option === value ? '#000' : '#999',
                            cursor: 'pointer',
                            scrollSnapAlign: 'start',
                            transition: 'color 0.2s, font-size 0.2s',
                            userSelect: 'none',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                    >
                        {option}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default RollingTimePicker;
