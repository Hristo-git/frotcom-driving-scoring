'use client';

import React, { useState } from 'react';
import styles from './dashboard.module.css';
import { useRouter } from 'next/navigation';
import type { PerformanceReport, AggregatedPerformance, ScoringWeights, VehiclePerformance } from '../../lib/scoring';
import ScoringControls from '../components/ScoringControls';
// Import dynamic with no SSR for Leaflet map to avoid window is not defined errors
import dynamic from 'next/dynamic';
import WarehouseChart from '../components/WarehouseChart';
import {
    IconAccelLow,
    IconAccelHigh,
    IconBrakeLow,
    IconBrakeHigh,
    IconCornering,
    IconSwitch,
    IconIdling,
    IconRPM,
    IconAlarm,
    IconNoCruise,
    IconAccelCruise
} from '../components/icons';
const LocationsMap = dynamic(() => import('../components/LocationsMap'), {
    ssr: false,
    loading: () => <div style={{ height: '400px', background: 'var(--card-bg)', borderRadius: '12px' }}>Loading Map...</div>
});

interface DashboardProps {
    drivers: PerformanceReport[];
    countries: AggregatedPerformance[];
    warehouses: AggregatedPerformance[];
    vehicles: VehiclePerformance[];
    startDate: string;
    endDate: string;
    weights: ScoringWeights;
    selectedCountry?: string;
    selectedWarehouse?: string;
}

const EVENT_TRANSLATIONS: Record<string, { label: string, Icon?: React.FC }> = {
    highRPM: { label: 'Превишени обороти', Icon: IconRPM },
    lowSpeedBreak: { label: 'Рязко спиране (ниска скорост)', Icon: IconBrakeLow },
    highSpeedBreak: { label: 'Рязко спиране (висока скорост)', Icon: IconBrakeHigh },
    lateralAcceleration: { label: 'Остри завои', Icon: IconCornering },
    lowSpeedAcceleration: { label: 'Рязко ускорение (ниска скорост)', Icon: IconAccelLow },
    highSpeedAcceleration: { label: 'Рязко ускорение (висока скорост)', Icon: IconAccelHigh },
    idling: { label: 'Работа на място', Icon: IconIdling },
    accelBrakeFastShift: { label: 'Бърза смяна газ-спирачка', Icon: IconSwitch },
    alarms: { label: 'Аларми', Icon: IconAlarm },
    noCruise: { label: 'Без круиз контрол', Icon: IconNoCruise },
    accWithCCActive: { label: 'Ускорение при круиз контрол', Icon: IconAccelCruise },
    harshAccelerationLow: { label: 'Ускорение (ниско)', Icon: IconAccelLow },
    harshAccelerationHigh: { label: 'Ускорение (високо)', Icon: IconAccelHigh },
    harshBrakingLow: { label: 'Спиране (ниско)', Icon: IconBrakeLow },
    harshBrakingHigh: { label: 'Спиране (високо)', Icon: IconBrakeHigh },
    harshCornering: { label: 'Рязко завиване', Icon: IconCornering },
    accelBrakeSwitch: { label: 'Превключване ускорение/спиране', Icon: IconSwitch },
    excessiveIdling: { label: 'Празен ход', Icon: IconIdling }
};

const RECOMMENDATION_TRANSLATIONS: Record<string, string> = {
    harshAccelerationLow: 'Намалете резките ускорения при ниска скорост.',
    harshAccelerationHigh: 'Избягвайте резките ускорения при висока скорост.',
    harshBrakingLow: 'Намалете резките спирания при ниска скорост.',
    harshBrakingHigh: 'Избягвайте резките спирания при висока скорост.',
    sharpCornering: 'Намалете скоростта преди завой, за да избегнете резки маневри.',
    suddenBrakeThrottleChange: 'Избягвайте бързата и директна смяна между газ и спирачка.',
    excessiveIdling: 'Гасете двигателя при постоянен престой за по-малко работа на място.',
    highRPM: 'Сменяйте предавките по-рано, за да избегнете движение в превишени обороти.',
    alarms: 'Обърнете внимание на алармите от автомобила.',
    timeWithoutCruiseControl: 'Използвайте круиз контрол по-често при дълги пътувания.',
    accelerationOnCruiseControl: 'Избягвайте ръчното ускорение, когато круиз контролът е активен.'
};

export default function DashboardClient({
    drivers, countries, warehouses, vehicles, startDate, endDate, weights,
    selectedCountry, selectedWarehouse
}: DashboardProps) {
    console.log('[DashboardClient] Props:', {
        driverCount: drivers.length,
        countryCount: countries.length,
        warehouseCount: warehouses.length,
        vehicleCount: vehicles.length,
        startDate,
        endDate
    });
    const router = useRouter();
    const [start, setStart] = useState(startDate.split('T')[0]);
    const [end, setEnd] = useState(endDate.split('T')[0]);
    const [mode, setMode] = useState<'single' | 'range'>('range');
    const [currentWeights, setCurrentWeights] = useState<ScoringWeights>(weights);
    const [view, setView] = useState<'report' | 'settings' | 'vehicles' | 'drivers'>('report');
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [expandedDriver, setExpandedDriver] = useState<number | null>(null);

    React.useEffect(() => {
        setStart(startDate.split('T')[0]);
        setEnd(endDate.split('T')[0]);
        setCurrentWeights(weights);
    }, [startDate, endDate, weights]);

    // Reset children filters when parent changes
    const handleCountryClick = (name: string) => {
        if (selectedCountry === name) {
            removeFilter('country');
        } else {
            handleFilterClick('country', name);
        }
        setSelectedBrand(null);
        setSelectedModel(null);
    };

    const handleBrandClick = (name: string | null) => {
        setSelectedBrand(name);
        setSelectedModel(null);
    };

    const handleApplyFilter = () => {
        const params = new URLSearchParams();
        params.set('start', `${start}T00:00:00.000Z`);
        params.set('end', `${end}T23:59:59.999Z`);

        if (selectedCountry) params.set('country', selectedCountry);
        if (selectedWarehouse) params.set('warehouse', selectedWarehouse);

        params.set('hal', currentWeights.harshAccelerationLow.toString());
        params.set('hah', currentWeights.harshAccelerationHigh.toString());
        params.set('hbl', currentWeights.harshBrakingLow.toString());
        params.set('hbh', currentWeights.harshBrakingHigh.toString());
        params.set('hc', currentWeights.harshCornering.toString());
        params.set('abs', currentWeights.accelBrakeSwitch.toString());
        params.set('ei', currentWeights.excessiveIdling.toString());
        params.set('hr', currentWeights.highRPM.toString());
        params.set('al', currentWeights.alarms.toString());
        params.set('ncc', currentWeights.noCruiseControl.toString());
        params.set('adc', currentWeights.accelDuringCruise.toString());

        router.push(`/?${params.toString()}`);
        if (view === 'settings') setView('report');
    };

    const handleFilterClick = (type: 'country' | 'warehouse', value: string) => {
        const params = new URLSearchParams(window.location.search);

        if (type === 'country') {
            if (selectedCountry === value) {
                params.delete('country');
                params.delete('warehouse');
            } else {
                params.set('country', value);
                params.delete('warehouse');
            }
        } else {
            if (selectedWarehouse === value) {
                params.delete('warehouse');
            } else {
                params.set('warehouse', value);
            }
        }

        router.push(`/?${params.toString()}`);
    };

    const removeFilter = (type: 'country' | 'warehouse') => {
        const params = new URLSearchParams(window.location.search);
        params.delete(type);
        if (type === 'country') params.delete('warehouse');
        router.push(`/?${params.toString()}`);
    };

    const overallScore = drivers.length > 0
        ? (drivers.reduce((acc, d) => acc + d.score, 0) / drivers.length).toFixed(2)
        : '0.00';

    const totalDistance = drivers.reduce((acc, d) => acc + (d.distance || 0), 0);
    const activeDrivers = drivers.length;

    const activeDriversWithConsumption = drivers.filter(d => d.consumption > 0);
    const avgConsumption = activeDriversWithConsumption.length > 0
        ? (activeDriversWithConsumption.reduce((acc, d) => acc + d.consumption, 0) / activeDriversWithConsumption.length).toFixed(1)
        : '0.0';

    const getScoreClass = (score: number) => {
        if (score >= 7.0) return styles.scoreHigh;
        if (score >= 4.0) return styles.scoreMed;
        return styles.scoreLow;
    };

    const formatTime = (seconds: number) => {
        if (!seconds || seconds <= 0) return '-';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}:${String(m).padStart(2, '0')}`;
    };

    // Prepare map data
    const mapData = countries.map(c => ({
        name: c.name,
        score: c.score,
        driverCount: c.driversCount
    }));

    // Prepare chart data
    const chartData = warehouses.map(w => ({
        name: w.name,
        score: w.score
    }));

    // Split drivers by score categories
    const sortedDrivers = [...drivers].sort((a, b) => b.score - a.score);
    const excellentDrivers = sortedDrivers.filter(d => d.score >= 7.0); // Green
    const goodDrivers = sortedDrivers.filter(d => d.score >= 4.0 && d.score < 7.0); // Orange
    const attentionDrivers = sortedDrivers.filter(d => d.score < 4.0); // Red

    const excellentPct = activeDrivers > 0 ? Math.round((excellentDrivers.length / activeDrivers) * 100) : 0;
    const goodPct = activeDrivers > 0 ? Math.round((goodDrivers.length / activeDrivers) * 100) : 0;
    const attentionPct = activeDrivers > 0 ? Math.round((attentionDrivers.length / activeDrivers) * 100) : 0;

    // Chained filtering for vehicles
    const availableVehicles = vehicles || [];

    // 1. Available brands depends on selected country
    const brands = Array.from(new Set(availableVehicles.map(v => v.manufacturer)))
        .filter(Boolean)
        .sort();

    // 2. Available models depend on selected country AND brand
    const availableModels = Array.from(new Set(
        availableVehicles
            .filter(v => !selectedBrand || v.manufacturer === selectedBrand)
            .map(v => v.model)
    )).filter(Boolean).sort();

    const filteredVehicles = availableVehicles.filter(v => {
        if (selectedBrand && v.manufacturer !== selectedBrand) return false;
        if (selectedModel && v.model !== selectedModel) return false;
        return true;
    });

    const getIndicatorColor = (type: string, val: number, distance: number = 0) => {
        const colors = {
            green: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#4ade80' },
            orange: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', text: '#fb923c' },
            red: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
            neutral: { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: '#cbd5e1' }
        };

        if (type === 'idling') {
            if (val <= 10) return colors.green;
            if (val <= 25) return colors.orange;
            return colors.red;
        }
        if (type === 'rpm') {
            if (val <= 3) return colors.green;
            if (val <= 8) return colors.orange;
            return colors.red;
        }
        if (type === 'consumption') {
            return colors.neutral; // Consumption varies by vehicle class, don't colorize generically
        }

        // For discrete events, compute rate per 100km
        if (distance === 0) return colors.neutral;
        const per100km = (val / distance) * 100;

        if (per100km <= 0.5) return colors.green;
        if (per100km <= 2.0) return colors.orange;
        return colors.red;
    };

    const renderDriverRow = (d: PerformanceReport) => (
        <React.Fragment key={d.driverId}>
            <tr className={styles.clickableRow} onClick={() => setExpandedDriver(expandedDriver === d.driverId ? null : d.driverId)}>
                <td style={{ fontWeight: 600 }}>{d.driverName}</td>
                <td style={{ textAlign: 'center', fontSize: '16px', fontWeight: 800 }} className={getScoreClass(d.score)}>
                    {d.score.toFixed(2)}
                </td>
                <td style={{ textAlign: 'right' }}>
                    {d.distance > 0 ? `${Math.round(d.distance).toLocaleString('bg-BG')} km` : '—'}
                </td>
            </tr>
            {expandedDriver === d.driverId && (
                <tr>
                    <td colSpan={3} style={{ padding: '12px 16px', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '0.85em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Основни показатели:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.9em' }}>
                                    {(() => {
                                        const idleColor = getIndicatorColor('idling', d.idling);
                                        const rpmColor = getIndicatorColor('rpm', d.rpm);
                                        const consColor = getIndicatorColor('consumption', d.consumption);
                                        return (
                                            <>
                                                <div style={{ background: idleColor.bg, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${idleColor.border}` }}>
                                                    <span style={{ color: '#cbd5e1' }}>Работа на място: </span>
                                                    <span style={{ fontWeight: 'bold', color: idleColor.text }}>{d.idling}%</span>
                                                </div>
                                                <div style={{ background: rpmColor.bg, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${rpmColor.border}` }}>
                                                    <span style={{ color: '#cbd5e1' }}>Превишени обороти: </span>
                                                    <span style={{ fontWeight: 'bold', color: rpmColor.text }}>{d.rpm}%</span>
                                                </div>
                                                <div style={{ background: consColor.bg, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${consColor.border}` }}>
                                                    <span style={{ color: '#cbd5e1' }}>Разход: </span>
                                                    <span style={{ fontWeight: 'bold', color: consColor.text }}>{d.consumption > 0 ? `${d.consumption} L/100km` : `—`}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {d.events && Object.keys(d.events).length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.85em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Влияещи фактори (на 100км):</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                        {Object.entries(d.events).map(([key, count]) => {
                                            const trans = EVENT_TRANSLATIONS[key] || { label: key };
                                            const Icon = trans.Icon as any;
                                            const color = getIndicatorColor(key, count as number, d.distance);
                                            const valPer100 = d.distance > 0 ? (((count as number) / d.distance) * 100).toFixed(1) : (count as number);

                                            return (
                                                <div key={key} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: color.bg,
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${color.border}`
                                                }}>
                                                    {Icon && <Icon style={{ width: 18, height: 18, color: color.text }} />}
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{trans.label}</span>
                                                        <span style={{ fontWeight: 600, color: color.text }}>{valPer100}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Driver Scoring Dashboard</h1>
                    <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
                        {activeDrivers} шофьори • {totalDistance.toLocaleString('bg-BG')} km общо
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={styles.navTabs}>
                        <button
                            className={`${styles.navTab} ${view === 'report' ? styles.navTabActive : ''}`}
                            onClick={() => setView('report')}
                        >Отчети</button>
                        <button
                            className={`${styles.navTab} ${view === 'vehicles' ? styles.navTabActive : ''}`}
                            onClick={() => setView('vehicles')}
                        >Автомобили</button>
                        <button
                            className={`${styles.navTab} ${view === 'drivers' ? styles.navTabActive : ''}`}
                            onClick={() => setView('drivers')}
                        >Шофьори</button>
                        <button
                            className={`${styles.navTab} ${view === 'settings' ? styles.navTabActive : ''}`}
                            onClick={() => setView('settings')}
                        >Настройки</button>
                    </div>

                    <div className={styles.filters}>
                        <div className={styles.modeToggle}>
                            <label><input type="radio" checked={mode === 'single'} onChange={() => { setMode('single'); setEnd(start); }} /> Ден</label>
                            <label><input type="radio" checked={mode === 'range'} onChange={() => setMode('range')} /> Период</label>
                        </div>

                        <input
                            type="date"
                            className={styles.filterInput}
                            value={start}
                            onChange={(e) => { setStart(e.target.value); if (mode === 'single') setEnd(e.target.value); }}
                        />
                        {mode === 'range' && (
                            <>
                                <span style={{ color: '#94a3b8' }}>—</span>
                                <input
                                    type="date"
                                    className={styles.filterInput}
                                    value={end}
                                    onChange={(e) => setEnd(e.target.value)}
                                />
                            </>
                        )}
                        <button className={styles.button} onClick={handleApplyFilter}>Обнови</button>
                    </div>
                </div>

                <div className={styles.filterBadgeContainer}>
                    {selectedCountry && (
                        <div className={styles.filterBadge}>
                            <span>Град: {selectedCountry}</span>
                            <button onClick={() => removeFilter('country')}>×</button>
                        </div>
                    )}
                    {selectedWarehouse && (
                        <div className={styles.filterBadge}>
                            <span>Склад: {selectedWarehouse}</span>
                            <button onClick={() => removeFilter('warehouse')}>×</button>
                        </div>
                    )}
                </div>
            </header>

            {view === 'settings' ? (
                <ScoringControls
                    weights={currentWeights}
                    onChange={setCurrentWeights}
                    onApply={handleApplyFilter}
                />
            ) : view === 'vehicles' ? (
                <div style={{ padding: '20px 0' }}>
                    {(() => {
                        const totalDist = filteredVehicles.reduce((acc, v) => acc + (v.distance || 0), 0);
                        const avgScore = filteredVehicles.length > 0
                            ? filteredVehicles.reduce((acc, v) => acc + v.score, 0) / filteredVehicles.length
                            : 0;
                        const vWithCons = filteredVehicles.filter(v => (v.fuelConsumption || 0) > 0);
                        const avgCons = vWithCons.length > 0
                            ? vWithCons.reduce((acc, v) => acc + (v.fuelConsumption || 0), 0) / vWithCons.length
                            : 0;

                        return (
                            <div className={styles.grid}>
                                <div className={styles.card}>
                                    <div className={styles.cardTitle}>Общо Километри (km)</div>
                                    <div className={styles.cardValue}>{Math.round(totalDist).toLocaleString('bg-BG')}</div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardTitle}>Среден Скор</div>
                                    <div className={`${styles.cardValue} ${getScoreClass(avgScore)}`}>
                                        {avgScore.toFixed(2)}
                                    </div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardTitle}>Среден Разход (L/100km)</div>
                                    <div className={styles.cardValue}>{avgCons > 0 ? avgCons.toFixed(1) : '—'}</div>
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                        {/* 1. City Filter as Large Tiles */}
                        <div className={styles.filterGroup}>
                            <div className={styles.filterLabel}>Град</div>
                            <div className={styles.filterTileContainer}>
                                <div
                                    className={`${styles.filterTile} ${!selectedCountry ? styles.filterTileActive : ''}`}
                                    onClick={() => removeFilter('country')}
                                >Всички</div>
                                {countries.map(c => (
                                    <div
                                        key={c.name}
                                        className={`${styles.filterTile} ${selectedCountry === c.name ? styles.filterTileActive : ''}`}
                                        onClick={() => handleCountryClick(c.name)}
                                    >{c.name}</div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Brand Filter as Large Tiles */}
                        <div className={styles.filterGroup}>
                            <div className={styles.filterLabel}>Марка</div>
                            <div className={styles.filterTileContainer}>
                                <div
                                    className={`${styles.filterTile} ${!selectedBrand ? styles.filterTileActive : ''}`}
                                    onClick={() => handleBrandClick(null)}
                                >Всички</div>
                                {brands.map(b => (
                                    <div
                                        key={b}
                                        className={`${styles.filterTile} ${selectedBrand === b ? styles.filterTileActive : ''}`}
                                        onClick={() => handleBrandClick(b)}
                                    >{b}</div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Model Filter as Chained Tiles */}
                        {(selectedBrand || selectedModel) && (
                            <div className={styles.filterGroup}>
                                <div className={styles.filterLabel}>Модел</div>
                                <div className={styles.filterTileContainer}>
                                    <div
                                        className={`${styles.filterTile} ${!selectedModel ? styles.filterTileActive : ''}`}
                                        onClick={() => setSelectedModel(null)}
                                    >Всички</div>
                                    {availableModels.map(m => (
                                        <div
                                            key={m}
                                            className={`${styles.filterTile} ${selectedModel === m ? styles.filterTileActive : ''}`}
                                            onClick={() => setSelectedModel(m)}
                                        >{m}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.tableContainer} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <table className={styles.table}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                                <tr>
                                    <th style={{ textAlign: 'left', minWidth: 150 }}>ПРОИЗВОДИТЕЛ</th>
                                    <th style={{ textAlign: 'left', minWidth: 150 }}>МОДЕЛ</th>
                                    <th style={{ textAlign: 'center', minWidth: 120 }}>РЕГ. НОМЕР</th>
                                    <th style={{ textAlign: 'center', minWidth: 80 }}>ТОЧКИ</th>
                                    <th style={{ textAlign: 'right', minWidth: 120 }}>СРЕДЕН РАЗХОД</th>
                                    <th style={{ textAlign: 'right', minWidth: 120 }}>КИЛОМЕТРИ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVehicles.length > 0 ? filteredVehicles.map((v, i) => (
                                    <tr key={i} className={styles.clickableRow}>
                                        <td style={{ fontWeight: 500 }}>{v.manufacturer}</td>
                                        <td style={{ fontWeight: 500 }}>{v.model}</td>
                                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '1.1em', letterSpacing: '1px' }}>{v.licensePlate}</td>
                                        <td style={{ textAlign: 'center', fontSize: '1.1em', fontWeight: 800 }} className={getScoreClass(v.score)}>
                                            {v.score.toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {v.fuelConsumption > 0 ? `${v.fuelConsumption.toFixed(1)} L / 100km` : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                            {Math.round(v.distance).toLocaleString('bg-BG')} km
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            Няма намерени автомобили за избраните филтри.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : view === 'drivers' ? (
                <div style={{ padding: '20px 0' }}>
                    <div className={styles.tableContainer} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <table className={styles.table}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                                <tr>
                                    <th style={{ textAlign: 'left', minWidth: 150 }}>ШОФЬОР</th>
                                    <th style={{ textAlign: 'center', minWidth: 80 }}>ТОЧКИ</th>
                                    <th style={{ textAlign: 'center', minWidth: 120 }}>СРЕДНО ВРЕМЕ</th>
                                    <th style={{ textAlign: 'center', minWidth: 120 }}>СРЕДЕН РАЗХОД</th>
                                    <th style={{ textAlign: 'left', minWidth: 150 }}>АВТОМОБИЛИ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedDrivers.length > 0 ? sortedDrivers.map((d) => (
                                    <React.Fragment key={d.driverId}>
                                        <tr className={styles.clickableRow} onClick={() => setExpandedDriver(expandedDriver === d.driverId ? null : d.driverId)}>
                                            <td style={{ fontWeight: 600 }}>{d.driverName}</td>
                                            <td style={{ textAlign: 'center', fontSize: '1.2em', fontWeight: 800 }} className={getScoreClass(d.score)}>
                                                {d.score.toFixed(2)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {formatTime(d.drivingTime)} ч.
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {d.consumption > 0 ? `${d.consumption.toFixed(1)} L/100km` : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.9em', color: '#64748b' }}>
                                                {(d.vehicles && d.vehicles.length > 0) ? d.vehicles.join(', ') : '—'}
                                            </td>
                                        </tr>
                                        {expandedDriver === d.driverId && (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '16px 24px', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-color)' }}>
                                                    <div style={{ fontSize: '0.9em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>ПРЕПОРЪКИ ЗА ПОДОБРЯВАНЕ (FROTCOM):</div>
                                                    {(!d.recommendations || d.recommendations.length === 0) ? (
                                                        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ padding: '6px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)' }}>✓</div>
                                                            Няма конкретни препоръки за избрания период. Шофирането е отлично!
                                                        </div>
                                                    ) : (
                                                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {d.recommendations.map((rec, i) => (
                                                                <li key={i}>{RECOMMENDATION_TRANSLATIONS[rec] || rec}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Няма данни</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>Overall Score</div>
                            <div className={`${styles.cardValue} ${getScoreClass(parseFloat(overallScore))}`}>
                                {overallScore}
                            </div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>Active Drivers</div>
                            <div className={styles.cardValue}>{activeDrivers}</div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>Total Distance (km)</div>
                            <div className={styles.cardValue}>{Math.round(totalDistance).toLocaleString('bg-BG')}</div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>Среден разход</div>
                            <div className={styles.cardValue}>{avgConsumption}</div>
                        </div>
                    </div>

                    <div className={styles.dashboardMain}>
                        <div className={styles.mapSection}>
                            <LocationsMap
                                data={mapData}
                                selectedLocation={selectedCountry || null}
                                onLocationSelect={(loc) => handleFilterClick('country', loc)}
                            />
                        </div>

                        <div className={styles.chartsSection}>
                            <div className={styles.card} style={{ flex: 1 }}>
                                <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Warehouse Performance</h2>
                                <WarehouseChart
                                    data={chartData}
                                    selectedWarehouse={selectedWarehouse || null}
                                    onWarehouseSelect={(wh) => handleFilterClick('warehouse', wh)}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '32px' }}>
                        <div className={styles.flexCol}>
                            <h2 className={styles.sectionTitle} style={{ marginTop: 0, color: '#10b981' }}>Отлични ({excellentPct}%)</h2>
                            <div className={styles.tableContainer} style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className={styles.table}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', minWidth: 150 }}>ШОФЬОР</th>
                                            <th style={{ textAlign: 'center', minWidth: 80 }}>ТОЧКИ</th>
                                            <th style={{ textAlign: 'right', minWidth: 90 }}>КИЛОМЕТРИ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {excellentDrivers.length > 0 ? excellentDrivers.map(renderDriverRow) : (
                                            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>Няма данни</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.flexCol}>
                            <h2 className={styles.sectionTitle} style={{ marginTop: 0, color: '#f59e0b' }}>Добри ({goodPct}%)</h2>
                            <div className={styles.tableContainer} style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className={styles.table}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', minWidth: 150 }}>ШОФЬОР</th>
                                            <th style={{ textAlign: 'center', minWidth: 80 }}>ТОЧКИ</th>
                                            <th style={{ textAlign: 'right', minWidth: 90 }}>КИЛОМЕТРИ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {goodDrivers.length > 0 ? goodDrivers.map(renderDriverRow) : (
                                            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>Няма данни</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.flexCol}>
                            <h2 className={styles.sectionTitle} style={{ marginTop: 0, color: '#ef4444' }}>Внимание ({attentionPct}%)</h2>
                            <div className={styles.tableContainer} style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className={styles.table}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', minWidth: 150 }}>ШОФЬОР</th>
                                            <th style={{ textAlign: 'center', minWidth: 80 }}>ТОЧКИ</th>
                                            <th style={{ textAlign: 'right', minWidth: 90 }}>КИЛОМЕТРИ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attentionDrivers.length > 0 ? attentionDrivers.map(renderDriverRow) : (
                                            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>Няма данни</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

