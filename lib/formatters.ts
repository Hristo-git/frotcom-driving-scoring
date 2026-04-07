/**
 * Centralized formatting utilities for the Driver Scoring Dashboard
 * All functions follow the Bulgarian (bg-BG) locale standards.
 */

/**
 * Formats distance in kilometers with a thousands separator (space) and 'km' suffix.
 * Example: 1234.56 -> "1 235 km"
 */
export const formatKm = (val: number): string => {
    return new Intl.NumberFormat('bg-BG', {
        useGrouping: true,
        maximumFractionDigits: 0
    }).format(Math.round(val || 0)) + " km";
};

/**
 * Formats a numeric score with 2 decimal places and a comma separator.
 * Example: 8.5 -> "8,50"
 */
export const formatScore = (val: number): string => {
    return new Intl.NumberFormat('bg-BG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
    }).format(val || 0);
};

/**
 * Formats fuel consumption with 1 decimal place and a comma separator.
 * Example: 18.23 -> "18,2"
 */
export const formatConsumption = (val: number): string => {
    return new Intl.NumberFormat('bg-BG', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        useGrouping: true
    }).format(val || 0);
};

/**
 * Formats a generic number with specified decimal places and a comma separator.
 */
export const formatDecimal = (val: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('bg-BG', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: true
    }).format(val || 0);
};

