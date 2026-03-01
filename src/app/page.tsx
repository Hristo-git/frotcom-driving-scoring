
import { ScoringEngine, DEFAULT_WEIGHTS, ScoringWeights } from '../../lib/scoring';
import DashboardClient from './DashboardClient';
// import { unstable_noStore as noStore } from 'next/cache'; // Optional based on caching needs

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

    // Default to current month
    const now = new Date();
    // Start of current month (UTC)
    const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const startStr = firstDay.toISOString();

    // End of current month (UTC)
    const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    const endStr = lastDay.toISOString();

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

    // Fetch data in parallel
    const [drivers, countries, warehouses, vehicles] = await Promise.all([
        engine.getDriverPerformance(start, end, { weights, countryNames: selectedCountry, warehouseNames: selectedWarehouse }),
        engine.getCountryPerformance(start, end, { warehouseNames: selectedWarehouse, weights }),
        engine.getWarehousePerformance(start, end, weights, { countryNames: selectedCountry }),
        engine.getVehiclePerformance(start, end, { weights, countryNames: selectedCountry, warehouseNames: selectedWarehouse })
    ]);

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
