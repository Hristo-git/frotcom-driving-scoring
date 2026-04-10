export interface ScoringWeights {
    harshAccelerationLow: number;
    harshAccelerationHigh: number;
    harshBrakingLow: number;
    harshBrakingHigh: number;
    harshCornering: number;
    accelBrakeSwitch: number;
    excessiveIdling: number;    // Weight for idling %
    highRPM: number;            // Weight for high RPM %
    alarms: number;
    noCruiseControl: number;    // Weight for % time without CC
    accelDuringCruise: number;
}

export interface PerformanceReport {
    driverId: number;
    driverName: string;
    country: string;
    warehouse: string;
    countryId?: number;
    warehouseId?: number;
    score: number;
    distance: number;
    drivingTime: number;
    idling: number;
    consumption: number;
    rpm: number;
    vehicles: string[];
    recommendations: string[];
    dataPoints: number;
    events: Record<string, number>;
}

export interface AggregatedPerformance {
    name: string;
    score: number;
    driversCount: number;
    totalDistance: number;
}

export interface VehiclePerformance {
    licensePlate: string;
    manufacturer: string;
    model: string;
    vehicleClass: string; // e.g. VC_Truck, VC_Minibus, VC_Van
    score: number;
    distance: number;
    fuelConsumption: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
    harshAccelerationLow:  0.85,
    harshAccelerationHigh: 0.70,
    harshBrakingLow:       0.75,
    harshBrakingHigh:      0.60,
    harshCornering:        0.70,
    accelBrakeSwitch:      0.00,
    excessiveIdling:       0.10,
    highRPM:               0.00,
    alarms:                0.00,
    noCruiseControl:       0.00,
    accelDuringCruise:     0.00
};

export const SCORING_PROFILES: Record<string, ScoringWeights> = {
    frotcom_personalized: { ...DEFAULT_WEIGHTS },
    safety_focused: {
        ...DEFAULT_WEIGHTS,
        harshCornering: 1.5,
        alarms: 1.0
    },
    eco_economy: {
        ...DEFAULT_WEIGHTS,
        excessiveIdling: 1.5,
        accelDuringCruise: 0.1
    }
};

export const RECOMMENDATION_LABELS: Record<number, string> = {
    1: 'harshAccelerationLow',
    2: 'harshAccelerationHigh',
    3: 'harshBrakingLow',
    4: 'harshBrakingHigh',
    5: 'sharpCornering',
    6: 'accelBrakeSwitch',
    7: 'excessiveIdling',
    8: 'highRPM',
    9: 'safetyAlarms',
    10: 'noCruiseControl',
    11: 'accelDuringCruise'
};
