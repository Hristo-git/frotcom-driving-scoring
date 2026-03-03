export interface FrotcomDriver {
    id: number;
    name: string;
    employee_no?: string;
    license_no?: string;
    department?: string;
    departmentId?: number;
    segment?: string;
    segmentId?: number;
}

export interface FrotcomVehicle {
    id: number;
    licensePlate: string;
    field1?: string;
    [key: string]: any;
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

const API_BASE_URL = 'https://v2api.frotcom.com';

// Frotcom API interprets datetime strings as local time (EET = UTC+2 in winter, UTC+3 in summer).
// We always pass local Sofia/Bucharest time strings so our day boundaries match the Frotcom UI.
// Call toFrotcomLocal() before passing any datetime to the API.
function getEetOffset(dateStr: string): number {
    // Simple DST detection for EET/EEST:
    // EEST (UTC+3) from last Sunday of March to last Sunday of October.
    // EET  (UTC+2) otherwise.
    const d = new Date(dateStr + 'Z'); // parse as UTC to get the month
    const month = d.getUTCMonth() + 1; // 1-12
    if (month > 3 && month < 10) return 3;
    if (month === 3 || month === 10) {
        // Approximate: last Sunday check (close enough for operational use)
        const day = d.getUTCDate();
        return day >= 25 ? (month === 3 ? 3 : 2) : (month === 3 ? 2 : 3);
    }
    return 2;
}

export function toFrotcomLocal(isoDatetime: string): string {
    // If the string already has a timezone offset or 'Z', return as-is.
    if (isoDatetime.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(isoDatetime)) {
        return isoDatetime;
    }
    // Append explicit EET/EEST offset so Frotcom interprets the day boundary correctly.
    const offsetHours = getEetOffset(isoDatetime);
    const sign = '+';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${isoDatetime}${sign}${pad(offsetHours)}:00`;
}

export class FrotcomClient {
    private static cachedToken: string | null = null;
    private static lastAuthTime: number = 0;
    private static readonly TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes (conservative)

    private static async authorize(): Promise<string> {
        // If we have a valid cached token, return it
        const now = Date.now();
        if (this.cachedToken && (now - this.lastAuthTime < this.TOKEN_EXPIRY_MS)) {
            return this.cachedToken;
        }

        const username = process.env.FROTCOM_USER;
        const password = process.env.FROTCOM_PASS;

        if (!username || !password) {
            throw new Error('FROTCOM_USER or FROTCOM_PASS is not defined');
        }

        console.log('Authorizing with Frotcom...');
        const url = `${API_BASE_URL}/v2/authorize`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                provider: 'thirdparty',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Frotcom Authorization Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        // The research says the token is in the response body.
        // Usually it's something like { api_key: "..." } or similar.
        // If the header user sent was 91 bytes, it might be { "api_key": "GUID..." }
        if (!data.token && !data.api_key) {
            throw new Error('No token found in Frotcom authorization response');
        }

        this.cachedToken = data.token || data.api_key;
        this.lastAuthTime = Date.now();
        return this.cachedToken!;
    }

    public static async getAccessToken(): Promise<string> {
        return this.authorize();
    }

    public static async request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
        const token = await this.authorize();

        const url = new URL(`${API_BASE_URL}/${endpoint}`);
        url.searchParams.append('api_key', token);
        url.searchParams.append('version', '1');

        const response = await fetch(url.toString(), {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            // If 401, maybe try to re-authorize once
            if (response.status === 401) {
                this.cachedToken = null; // Clear cache
                return this.request(endpoint, method, body); // Retry
            }
            throw new Error(`Frotcom API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    static async getVehicles(): Promise<FrotcomVehicle[]> {
        // Attempting to fetch all vehicles.
        return this.request<FrotcomVehicle[]>('v2/vehicles');
    }

    static async getDrivers(): Promise<FrotcomDriver[]> {
        return this.request<FrotcomDriver[]>('v2/drivers');
    }

    static async getVehicleDetails(vehicleId: string): Promise<FrotcomVehicleDetails> {
        // "Get vehicle details" logic
        return this.request<FrotcomVehicleDetails>(`v2/vehicles/${vehicleId}`);
    }

    static async getEcodrivingData(param: EcodrivingRequest): Promise<EcodrivingResponse> {
        // This is likely a POST or GET with params. 
        // Research said GET /v2/ecodriving/driver with params.
        const queryString = new URLSearchParams({
            from_datetime: param.period_start,
            to_datetime: param.period_end,
        }).toString();

        throw new Error("Method requires specific driver/object ID implementation");
    }

    static async calculateEcodriving(start: string, end: string, driverIds?: number[], vehicleIds?: number[], groupBy?: string): Promise<any[]> {
        return this.request<any[]>('v2/ecodriving/calculate', 'POST', {
            from: toFrotcomLocal(start),
            to: toFrotcomLocal(end),
            driverIds,
            vehicleIds,
            groupBy: groupBy || 'driver'
        });
    }
}
