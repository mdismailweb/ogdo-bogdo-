import React, { useState, useEffect, useRef } from 'react';
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

const RollingTimePicker = ({
    label = "Time",
    value = "",
    onChange,
    disabled = false,
    error = false,
    helperText = ""
}) => {
    const [open, setOpen] = useState(false);
    const [displayTime, setDisplayTime] = useState({ hour: '12', minute: '00', period: 'AM' });
    const [tempHour, setTempHour] = useState('12');
    const [tempMinute, setTempMinute] = useState('00');
    const [tempPeriod, setTempPeriod] = useState('AM');

    // Convert 24h to 12h
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
        setTempHour(displayTime.hour);
        setTempMinute(displayTime.minute);
        setTempPeriod(displayTime.period);
        setOpen(true);
    };

    const handleDone = () => {
        let hour24 = parseInt(tempHour);
        if (tempPeriod === 'AM' && hour24 === 12) hour24 = 0;
        else if (tempPeriod === 'PM' && hour24 !== 12) hour24 += 12;

        const time24 = `${hour24.toString().padStart(2, '0')}:${tempMinute}`;
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
                    <Typography sx={{
                        textAlign: 'center',
                        fontSize: '2.5rem',
                        fontWeight: 400,
                        color: '#007AFF',
                        mb: 2,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>
                        {tempHour}:{tempMinute} {tempPeriod}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                        <WheelPicker
                            value={tempHour}
                            onChange={setTempHour}
                            options={Array.from({ length: 12 }, (_, i) => (i + 1).toString())}
                        />
                        <WheelPicker
                            value={tempMinute}
                            onChange={setTempMinute}
                            options={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
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
                        sx={{ py: 0.8, fontSize: '0.95rem', textTransform: 'none', borderColor: '#d0d0d0', color: '#666' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDone}
                        variant="contained"
                        fullWidth
                        sx={{ py: 0.8, fontSize: '0.95rem', textTransform: 'none', backgroundColor: '#007AFF', '&:hover': { backgroundColor: '#0051D5' } }}
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// Custom Wheel Picker with Momentum Scrolling
const WheelPicker = ({ value, onChange, options }) => {
    const containerRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const velocityRef = useRef(0);
    const lastYRef = useRef(0);
    const lastTimeRef = useRef(0);
    const animationRef = useRef(null);

    const ITEM_HEIGHT = 40;
    const VISIBLE_ITEMS = 5;

    // Initialize scroll position when value changes or component mounts
    useEffect(() => {
        const index = options.indexOf(value);
        if (index !== -1 && !isDragging) {
            setScrollY(index * ITEM_HEIGHT);
        }
    }, [value, options, isDragging]);

    // Momentum animation
    const animate = () => {
        if (!isDragging && Math.abs(velocityRef.current) > 0.1) {
            setScrollY(prev => {
                const newY = prev + velocityRef.current;
                const maxScroll = (options.length - 1) * ITEM_HEIGHT;
                const clampedY = Math.max(0, Math.min(newY, maxScroll));
                return clampedY;
            });

            velocityRef.current *= 0.92; // Friction - lower = longer drift
            animationRef.current = requestAnimationFrame(animate);
        } else {
            // Snap to nearest item
            setScrollY(prev => {
                const index = Math.round(prev / ITEM_HEIGHT);
                const snappedY = index * ITEM_HEIGHT;
                onChange(options[index]);
                return snappedY;
            });
        }
    };

    const handleTouchStart = (e) => {
        setIsDragging(true);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        velocityRef.current = 0;
        lastYRef.current = e.touches[0].clientY;
        lastTimeRef.current = Date.now();
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;

        const currentY = e.touches[0].clientY;
        const currentTime = Date.now();
        const deltaY = lastYRef.current - currentY;
        const deltaTime = currentTime - lastTimeRef.current;

        setScrollY(prev => {
            const newY = prev + deltaY;
            const maxScroll = (options.length - 1) * ITEM_HEIGHT;
            return Math.max(0, Math.min(newY, maxScroll));
        });

        // Calculate velocity with higher multiplier for better inertia
        if (deltaTime > 0) {
            velocityRef.current = deltaY / deltaTime * 50; // Increased for more momentum
        }

        lastYRef.current = currentY;
        lastTimeRef.current = currentTime;
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        velocityRef.current = 0;
        lastYRef.current = e.clientY;
        lastTimeRef.current = Date.now();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const currentY = e.clientY;
        const currentTime = Date.now();
        const deltaY = lastYRef.current - currentY;
        const deltaTime = currentTime - lastTimeRef.current;

        setScrollY(prev => {
            const newY = prev + deltaY;
            const maxScroll = (options.length - 1) * ITEM_HEIGHT;
            return Math.max(0, Math.min(newY, maxScroll));
        });

        if (deltaTime > 0) {
            velocityRef.current = deltaY / deltaTime * 16;
        }

        lastYRef.current = currentY;
        lastTimeRef.current = currentTime;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        animationRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const currentIndex = Math.round(scrollY / ITEM_HEIGHT);

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            sx={{
                width: 80,
                height: ITEM_HEIGHT * VISIBLE_ITEMS,
                position: 'relative',
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none'
            }}
        >
            {/* Gradient overlays */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT * 2,
                background: 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))',
                pointerEvents: 'none',
                zIndex: 2
            }} />
            <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT * 2,
                background: 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))',
                pointerEvents: 'none',
                zIndex: 2
            }} />

            {/* Selection highlight */}
            <Box sx={{
                position: 'absolute',
                top: ITEM_HEIGHT * 2,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
                backgroundColor: 'rgba(0, 122, 255, 0.08)',
                borderTop: '1px solid rgba(0, 122, 255, 0.3)',
                borderBottom: '1px solid rgba(0, 122, 255, 0.3)',
                pointerEvents: 'none',
                zIndex: 1
            }} />

            {/* Items */}
            <Box sx={{
                position: 'absolute',
                top: ITEM_HEIGHT * 2,
                transform: `translateY(-${scrollY}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                width: '100%'
            }}>
                {options.map((option, index) => (
                    <Box
                        key={option}
                        sx={{
                            height: ITEM_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: index === currentIndex ? '1.5rem' : '1.2rem',
                            fontWeight: index === currentIndex ? 600 : 400,
                            color: index === currentIndex ? '#000' : '#999',
                            transition: 'all 0.2s',
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
