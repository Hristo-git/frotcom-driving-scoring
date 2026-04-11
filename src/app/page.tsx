
import { ScoringEngine, DEFAULT_WEIGHTS, ScoringWeights } from '../../lib/scoring';
import DashboardClient from './DashboardClient';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function DashboardPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // noStore(); 

    // Handle searchParam promise for newer Next.js versions
    const searchParams = await props.searchParams;

    const engine = new ScoringEngine();

    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not defined in environment variables!');
    }

    // Default to current month: start = 1st of month, end = today (Sofia tz).
    // If 1st or 2nd of month, default to the previous full month instead.
    const nowMs = Date.now();
    const sofiaStr = new Date(nowMs).toLocaleDateString('sv-SE', { timeZone: 'Europe/Sofia' }); // YYYY-MM-DD
    const [sy, sm, sd] = sofiaStr.split('-').map(Number);

    const usePrevMonth = sd <= 2;
    const targetMonth = usePrevMonth ? sm - 2 : sm - 1; // 0-indexed
    const targetYear = sy;

    const firstDay = new Date(Date.UTC(targetYear, targetMonth, 1));
    const startStr = firstDay.toISOString();

    // End of range: today for current month, last day for previous month
    let endStr: string;
    if (usePrevMonth) {
        const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0));
        endStr = lastDay.toISOString();
    } else {
        endStr = `${sofiaStr}T23:59:59.999Z`;
    }

    const start = (searchParams?.start as string) || startStr;
    const end = (searchParams?.end as string) || endStr;

    // Parse multi-select params: can be string (single) or string[] (multiple)
    const toArray = (val: string | string[] | undefined): string[] | undefined => {
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
    };

    const selectedCountry = toArray(searchParams?.country);
    const selectedWarehouse = toArray(searchParams?.warehouse);
    const selectedBrand = toArray(searchParams?.brand);
    const selectedModel = toArray(searchParams?.model);

    // Helper to get weight from searchParams or default
    const getW = (key: string, def: number) => {
        const val = searchParams?.[key];
        return val ? parseFloat(val as string) : def;
    };

    const weights: ScoringWeights = {
        harshAccelerationLow: getW('hal', DEFAULT_WEIGHTS.harshAccelerationLow),
        harshAccelerationHigh: getW('hah', DEFAULT_WEIGHTS.harshAccelerationHigh),
        harshBrakingLow: getW('hbl', DEFAULT_WEIGHTS.harshBrakingLow),
        harshBrakingHigh: getW('hbh', DEFAULT_WEIGHTS.harshBrakingHigh),
        harshCornering: getW('hc', DEFAULT_WEIGHTS.harshCornering),
        accelBrakeSwitch: getW('abs', DEFAULT_WEIGHTS.accelBrakeSwitch),
        excessiveIdling: getW('ei', DEFAULT_WEIGHTS.excessiveIdling),
        highRPM: getW('hr', DEFAULT_WEIGHTS.highRPM),
        alarms: getW('al', DEFAULT_WEIGHTS.alarms),
        noCruiseControl: getW('ncc', DEFAULT_WEIGHTS.noCruiseControl),
        accelDuringCruise: getW('adc', DEFAULT_WEIGHTS.accelDuringCruise),
    };

    // Cache per unique combination of start/end/filters/weights — revalidate after 5 min
    const fetchDashboardData = unstable_cache(
        async (s: string, e: string, countries?: string[], warehouses?: string[], weightsJson?: string) => {
            const w: ScoringWeights = weightsJson ? JSON.parse(weightsJson) : weights;
            return Promise.all([
                engine.getDriverPerformance(s, e, { weights: w, countryNames: countries, warehouseNames: warehouses }),
                engine.getCountryPerformance(s, e, { warehouseNames: warehouses, weights: w }),
                engine.getWarehousePerformance(s, e, w, { countryNames: countries }),
                engine.getVehiclePerformance(s, e, { weights: w, countryNames: countries, warehouseNames: warehouses }),
            ]);
        },
        ['dashboard-data-v2'],
        { revalidate: 300, tags: ['dashboard'] }
    );

    const [drivers, countries, warehouses, vehicles] = await fetchDashboardData(
        start, end, selectedCountry, selectedWarehouse, JSON.stringify(weights)
    );

    // console.log(`Fetched: ${drivers.length} drivers, ${countries.length} countries, ${warehouses.length} warehouses, ${vehicles.length} vehicles`);
    console.log(`[Dashboard] Range: ${start} to ${end}`);
    console.log(`[Dashboard] Fetched: ${drivers.length} drivers, ${countries.length} countries, ${warehouses.length} warehouses, ${vehicles.length} vehicles`);

    return (
        <DashboardClient
            drivers={drivers}
            countries={countries}
            warehouses={warehouses}
            vehicles={vehicles}
            startDate={start}
            endDate={end}
            weights={weights}
            selectedCountry={selectedCountry}
            selectedWarehouse={selectedWarehouse}
            selectedBrand={selectedBrand}
            selectedModel={selectedModel}
        />
    );
}
