import React from 'react';

// Harsh acceleration low speed — speedometer arrow up (slow)
export const IconAccelLow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 8v4l2 2" strokeWidth="1.5" />
        <path d="M16 4l2-2 2 2" strokeWidth="1.5" />
    </svg>
);

// Harsh acceleration high speed — speedometer arrow up (fast)
export const IconAccelHigh = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 8v4l2 2" strokeWidth="1.5" />
        <path d="M14 2l2-2 2 2M18 2l2-2 2 2" strokeWidth="1.5" />
    </svg>
);

// Harsh braking low speed — foot on brake (slow)
export const IconBrakeLow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
        <path d="M9 15l-3 3" strokeWidth="2.5" />
    </svg>
);

// Harsh braking high speed — foot on brake (fast)
export const IconBrakeHigh = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
        <path d="M6 18l-3 3M8 18l-3 3" strokeWidth="2" />
    </svg>
);

// Sharp cornering — arrow turning
export const IconCornering = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19V5h14" />
        <path d="M15 10l4-5 5 4" />
        <path d="M5 19l4-4" />
    </svg>
);

// Accel/brake switch — two arrows opposite
export const IconSwitch = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16H3l4 4 4-4H7" />
        <path d="M7 16V8a4 4 0 0 1 4-4h2" />
        <path d="M17 8h4l-4-4-4 4h4" />
        <path d="M17 8v8a4 4 0 0 1-4 4h-2" />
    </svg>
);

// Excessive idling — engine / clock
export const IconIdling = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
        <path d="M5 5l1 1M19 5l-1 1" />
    </svg>
);

// High RPM — lightning / tachometer
export const IconRPM = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

// Alarms — bell
export const IconAlarm = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

// No cruise control — speedometer with X
export const IconNoCruise = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 18 0" />
        <path d="M3 12a9 9 0 0 1 9-9" />
        <path d="M12 7v5l2.5 2.5" />
        <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
);

// Acceleration during cruise — cruise + upward arrow
export const IconAccelCruise = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
        <path d="M12 7v5l2 2" />
        <path d="M17 4l1-3 1 3" />
        <path d="M18 1v6" />
    </svg>
);
