"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { formatScore } from '../../lib/formatters';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons in Next.js
import L from 'leaflet';

// Map cities// Basic coordinates for Bulgarian cities and Stolnik
const cityCoordinates: Record<string, { lat: number, lng: number }> = {
    'София': { lat: 42.6977, lng: 23.3219 },
    'Пловдив': { lat: 42.1439, lng: 24.7496 },
    'Варна': { lat: 43.2141, lng: 27.9147 },
    'Бургас': { lat: 42.5048, lng: 27.4626 },
    'Русе': { lat: 43.8443, lng: 25.9535 },
    'Стара Загора': { lat: 42.4258, lng: 25.6345 },
    'Плевен': { lat: 43.4170, lng: 24.6253 },
    'Сливен': { lat: 42.6817, lng: 26.3225 },
    'Добрич': { lat: 43.5726, lng: 27.8273 },
    'Шумен': { lat: 43.2712, lng: 26.9261 },
    'Перник': { lat: 42.6052, lng: 23.0378 },
    'Хасково': { lat: 41.9344, lng: 25.5556 },
    'Ямбол': { lat: 42.4842, lng: 26.5035 },
    'Ямбол Щафетни': { lat: 42.4842, lng: 26.5035 }, // Same coordinate as Yambol
    'Пазарджик': { lat: 42.1928, lng: 24.3336 },
    'Благоевград': { lat: 42.0209, lng: 23.0943 },
    'Велико Търново': { lat: 43.0757, lng: 25.6172 },
    'Враца': { lat: 43.2046, lng: 23.5529 },
    'Габрово': { lat: 42.8742, lng: 25.3187 },
    'Видин': { lat: 43.9900, lng: 22.8725 },
    'Ловеч': { lat: 43.1370, lng: 24.7142 },
    'Кюстендил': { lat: 42.2833, lng: 22.6833 },
    'Ботевград': { lat: 42.9000, lng: 23.7833 },
    'Банско': { lat: 41.8389, lng: 23.4885 },
    'Смолян': { lat: 41.5772, lng: 24.7011 },
    'Казанлък': { lat: 42.6194, lng: 25.3949 },
    'Елин Пелин': { lat: 42.6680, lng: 23.6022 },
    'Столник': { lat: 42.7122, lng: 23.6269 },
    'Петрич': { lat: 41.3964, lng: 23.2073 },
    'Skopje': { lat: 42.0000, lng: 21.4333 },
    'Chișinău': { lat: 47.0105, lng: 28.8638 },
    'Bucharest': { lat: 44.4268, lng: 26.1025 },
};

// Helper component to adjust map bounds based on markers
function MapBounds({ locations }: { locations: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (locations.length > 0) {
            const bounds = L.latLngBounds(locations);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
        }
    }, [locations, map]);
    return null;
}

interface LocationData {
    name: string;
    score: number;
    driverCount: number;
}

interface LocationsMapProps {
    data: LocationData[];
    selectedLocation?: string[];
    onLocationSelect: (locationName: string) => void;
}

function getColorByScore(score: number): string {
    if (score >= 7.0) return '#10b981'; // Green (Success)
    if (score >= 4.0) return '#f59e0b'; // Orange (Warning)
    return '#ef4444'; // Red (Danger)
}

export default function LocationsMap({ data, selectedLocation = [], onLocationSelect }: LocationsMapProps) {
    // To avoid Next.js hydration mismatch with React-Leaflet
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div style={{ height: '100%', minHeight: '400px', background: 'var(--card-bg)', borderRadius: '12px' }} />;

    const validLocations = data
        .filter(item => cityCoordinates[item.name])
        .map(item => ({
            ...item,
            coords: cityCoordinates[item.name]
        }));

    const coordsList: [number, number][] = validLocations.map(loc => [loc.coords.lat, loc.coords.lng]);

    return (
        <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <MapContainer
                center={[42.7339, 25.4858]} // Center of Bulgaria
                zoom={6}
                style={{ height: '100%', width: '100%', minHeight: '400px', background: '#0B0F19' }}
                zoomControl={false}
            >
                {/* Dark theme tile layer (CartoDB Dark Matter) */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {coordsList.length > 0 && <MapBounds locations={coordsList} />}

                {validLocations.map((loc, idx) => {
                    const isSelected = selectedLocation.includes(loc.name);
                    const color = getColorByScore(loc.score);
                    const radius = Math.max(10, Math.min(30, loc.driverCount * 2)); // Dynamic size based on driver count

                    return (
                        <CircleMarker
                            key={idx}
                            center={loc.coords}
                            radius={isSelected ? radius + 5 : radius}
                            pathOptions={{
                                color: isSelected ? '#ffffff' : color,
                                fillColor: color,
                                fillOpacity: isSelected ? 0.9 : 0.6,
                                weight: isSelected ? 3 : 2,
                            }}
                            eventHandlers={{
                                click: () => onLocationSelect(loc.name),
                            }}
                        >
                            <Popup>
                                <div style={{ color: '#111', fontWeight: 600 }}>
                                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{loc.name}</div>
                                    <div>Оценка: <span style={{ color }}>{formatScore(loc.score)}</span></div>
                                    <div>Шофьори: {loc.driverCount}</div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
