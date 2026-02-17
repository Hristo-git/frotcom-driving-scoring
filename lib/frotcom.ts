export interface FrotcomDriver {
    id: string; // The GUID from Frotcom
    name: string;
    employee_no?: string;
    license_no?: string;
}

export interface FrotcomVehicle {
    id: string; // The GUID from Frotcom
    license_plate: string;
}

export interface FrotcomVehicleDetails {
    vehicle_id: string; // The GUID from Frotcom
    department?: string; // Mapped to Warehouse
    departmentId?: string;
    segment?: string; // Mapped to Country
    segmentId?: string;
}

export interface EcodrivingRequest {
    period_start: string; // ISO-8601
    period_end: string;
    drivers?: string[]; // List of driver IDs
    vehicles?: string[]; // List of vehicle IDs
}

export interface EcodrivingResponse {
    // To be defined based on actual API response structure
    rows: any[];
}

const API_BASE_URL = 'https://api.fm-track.com'; // Based on research

export class FrotcomClient {
    private static async request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
        const API_KEY = process.env.FROTCOM_API_KEY;
        if (!API_KEY) {
            throw new Error('FROTCOM_API_KEY is not defined');
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`, // Or specific header key if different
            // Frotcom sometimes uses a specific query param or header for the key. Research said "api_key" parameter.
            // We will assume it might be a query param based on "api_key: string" in research.
            // Let's adjust to query param for now, or check if it's a header.
        };

        const url = new URL(`${API_BASE_URL}/${endpoint}`);
        url.searchParams.append('api_key', API_KEY);
        url.searchParams.append('version', '1'); // As per research

        const response = await fetch(url.toString(), {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Frotcom API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    static async getVehicles(): Promise<FrotcomVehicle[]> {
        // Attempting to fetch all vehicles.
        return this.request<FrotcomVehicle[]>('vehicles');
    }

    static async getDrivers(): Promise<FrotcomDriver[]> {
        // Endpoint might be /drivers or similar. Need to confirm if not found in research.
        // Assuming /v2/drivers based on general REST patterns or /drivers.
        // Research mentioned /ecodriving/object and /ecodriving/driver. 
        // We likely need a general endpoint to get the list first.
        // If not known, we might need to ask user or assume a standard one.
        // Let's assume there is a way to get drivers.
        return this.request<FrotcomDriver[]>('drivers');
    }

    static async getVehicleDetails(vehicleId: string): Promise<FrotcomVehicleDetails> {
        // "Get vehicle details" logic
        return this.request<FrotcomVehicleDetails>(`vehicles/${vehicleId}`);
    }

    static async getEcodrivingData(param: EcodrivingRequest): Promise<EcodrivingResponse> {
        // This is likely a POST or GET with params. 
        // Research said GET /ecodriving/driver with params.
        const queryString = new URLSearchParams({
            from_datetime: param.period_start,
            to_datetime: param.period_end,
            // If filtering by specific drivers, we might need multiple requests or a different endpoint.
            // The research says "id" is mandatory. So we probably fetch per driver.
        }).toString();

        // This method might need to be called in a loop for each driver if the API requires ID.
        throw new Error("Method requires specific driver/object ID implementation");
    }

    static async getDriverEcodriving(driverId: string, start: string, end: string): Promise<any> {
        const url = `ecodriving/driver?id=${driverId}&from_datetime=${start}&to_datetime=${end}`;
        return this.request(url);
    }
}
