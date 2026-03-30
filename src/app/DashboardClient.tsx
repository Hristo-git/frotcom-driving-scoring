'use client';

import React, { useState } from 'react';
import styles from './dashboard.module.css';
import { useRouter } from 'next/navigation';
import { PerformanceReport, AggregatedPerformance, ScoringWeights, VehiclePerformance } from '../../lib/scoring-types';
// Import dynamic with no SSR for Leaflet map to avoid window is not defined errors
import dynamic from 'next/dynamic';
import WarehouseChart from '../components/WarehouseChart';
import BrandDonutChart from '../components/charts/BrandDonutChart';
import BrandComparisonChart from '../components/charts/BrandComparisonChart';
import VehicleScatterChart from '../components/charts/VehicleScatterChart';
import ScoreHistogram from '../components/charts/ScoreHistogram';
import TopBehaviorsChart from '../components/charts/TopBehaviorsChart';
import CitySegmentChart from '../components/charts/CitySegmentChart';
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
    selectedCountry?: string[];
    selectedWarehouse?: string[];
    selectedBrand?: string[];
    selectedModel?: string[];
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
    selectedCountry = [], selectedWarehouse = [], selectedBrand = [], selectedModel = []
}: DashboardProps) {
    // ... [console.log omitted for brevity]
    const router = useRouter();
    const [start, setStart] = useState(startDate.split('T')[0]);
    const [end, setEnd] = useState(endDate.split('T')[0]);
    const [mode, setMode] = useState<'single' | 'range'>('range');
    const [currentWeights] = useState<ScoringWeights>(weights);
    const [view, setView] = useState<'report' | 'vehicles' | 'drivers'>('report');

    const [expandedDriver, setExpandedDriver] = useState<number | null>(null);
    const [driverSortField, setDriverSortField] = useState<string>('score');
    const [driverSortOrder, setDriverSortOrder] = useState<'asc' | 'desc'>('desc');

    const applyWithDates = (newStart: string, newEnd: string) => {
        const params = new URLSearchParams();
        params.set('start', `${newStart}T00:00:00.000Z`);
        params.set('end', `${newEnd}T23:59:59.999Z`);
        if (selectedCountry.length > 0) selectedCountry.forEach(c => params.append('country', c));
        if (selectedWarehouse.length > 0) selectedWarehouse.forEach(w => params.append('warehouse', w));
        if (selectedBrand.length > 0) selectedBrand.forEach(b => params.append('brand', b));
        if (selectedModel.length > 0) selectedModel.forEach(m => params.append('model', m));
        Object.entries(currentWeights).forEach(([key, val]) => {
            const shortKey = ({ harshAccelerationLow: 'hal', harshAccelerationHigh: 'hah', harshBrakingLow: 'hbl', harshBrakingHigh: 'hbh', harshCornering: 'hc', accelBrakeSwitch: 'abs', excessiveIdling: 'ei', highRPM: 'hr', alarms: 'al', noCruiseControl: 'ncc', accelDuringCruise: 'adc' } as any)[key];
            if (shortKey) params.set(shortKey, (val as number).toString());
        });
        router.push(`/?${params.toString()}`);
    };

    const handleApplyFilter = () => {
        const params = new URLSearchParams();
        params.set('start', `${start}T00:00:00.000Z`);
        params.set('end', `${end}T23:59:59.999Z`);

        if (selectedCountry.length > 0) selectedCountry.forEach(c => params.append('country', c));
        if (selectedWarehouse.length > 0) selectedWarehouse.forEach(w => params.append('warehouse', w));
        if (selectedBrand.length > 0) selectedBrand.forEach(b => params.append('brand', b));
        if (selectedModel.length > 0) selectedModel.forEach(m => params.append('model', m));

        // Add weights
        Object.entries(currentWeights).forEach(([key, val]) => {
            const shortKey = ({
                harshAccelerationLow: 'hal', harshAccelerationHigh: 'hah',
                harshBrakingLow: 'hbl', harshBrakingHigh: 'hbh',
                harshCornering: 'hc', accelBrakeSwitch: 'abs',
                excessiveIdling: 'ei', highRPM: 'hr',
                alarms: 'al', noCruiseControl: 'ncc',
                accelDuringCruise: 'adc'
            } as any)[key];
            if (shortKey) params.set(shortKey, (val as number).toString());
        });

        router.push(`/?${params.toString()}`);
    };

    const toggleFilter = (type: 'country' | 'warehouse' | 'brand' | 'model', value: string) => {
        const params = new URLSearchParams(window.location.search);
        const currentValues = params.getAll(type);

        if (currentValues.includes(value)) {
            // Remove
            const newValues = currentValues.filter(v => v !== value);
            params.delete(type);
            newValues.forEach(v => params.append(type, v));
            // If country removed, also clear warehouses
            if (type === 'country') params.delete('warehouse');
        } else {
            // Add
            params.append(type, value);
            // If country added, we don't necessarily clear warehouses, as it's multi-select now
        }

        router.push(`/?${params.toString()}`);
    };

    const removeFilter = (type: 'country' | 'warehouse' | 'brand' | 'model') => {
        const params = new URLSearchParams(window.location.search);
        params.delete(type);
        if (type === 'country') params.delete('warehouse');
        router.push(`/?${params.toString()}`);
    };

    const handleDriverSort = (field: string) => {
        if (driverSortField === field) {
            setDriverSortOrder(driverSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setDriverSortField(field);
            setDriverSortOrder('desc');
        }
    };

    const getSortIcon = (field: string) => {
        if (driverSortField !== field) return '↕';
        return driverSortOrder === 'asc' ? '↑' : '↓';
    };

    // Derive actionable recommendations from actual metric values
    const deriveRecommendations = (d: PerformanceReport): string[] => {
        if (d.recommendations && d.recommendations.length > 0) return d.recommendations;
        const recs: string[] = [];
        const km = d.distance || 0;
        const ev = d.events || {};
        const per100 = (n: number) => km > 0 ? (n / km) * 100 : 0;
        if (per100((ev.lowSpeedAcceleration || ev.harshAccelerationLow || 0) as number) > 0.5) recs.push('harshAccelerationLow');
        if (per100((ev.highSpeedAcceleration || ev.harshAccelerationHigh || 0) as number) > 0.3) recs.push('harshAccelerationHigh');
        if (per100((ev.lowSpeedBreak || ev.harshBrakingLow || 0) as number) > 0.5)            recs.push('harshBrakingLow');
        if (per100((ev.highSpeedBreak || ev.harshBrakingHigh || 0) as number) > 0.3)          recs.push('harshBrakingHigh');
        if (d.idling > 25)  recs.push('excessiveIdling');
        if (d.rpm > 8)      recs.push('highRPM');
        return recs;
    };

    const totalDistance = drivers.reduce((acc, d) => acc + (d.distance || 0), 0);
    const overallScore = totalDistance > 0
        ? (drivers.reduce((acc, d) => acc + (d.score * (d.distance || 0)), 0) / totalDistance).toFixed(2)
        : '0.00';

    const activeDrivers = drivers.length;

    const activeDriversWithConsumption = drivers.filter(d => d.consumption > 0);
    const totalDistanceForConsumption = activeDriversWithConsumption.reduce((acc, d) => acc + (d.distance || 0), 0);
    const avgConsumption = totalDistanceForConsumption > 0
        ? (activeDriversWithConsumption.reduce((acc, d) => acc + (d.consumption * (d.distance || 0)), 0) / totalDistanceForConsumption).toFixed(1)
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
    const mapData = countries
        .filter(c => c.name && c.name.trim() !== '')
        .map(c => ({
            name: c.name,
            score: c.score,
            driverCount: c.driversCount
        }));

    // Prepare chart data
    const chartData = warehouses
        .filter(w => w.name && w.name.trim() !== '')
        .map(w => ({
            name: w.name,
            score: w.score
        }));

    // Split drivers by score categories
    const sortedDriversRaw = [...drivers].sort((a, b) => {
        const field = driverSortField as keyof typeof a;
        let valA = a[field];
        let valB = b[field];

        if (typeof valA === 'string' && typeof valB === 'string') {
            return driverSortOrder === 'asc'
                ? valA.localeCompare(valB, 'bg')
                : valB.localeCompare(valA, 'bg');
        }

        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;

        return driverSortOrder === 'asc' ? numA - numB : numB - numA;
    });

    const sortedDrivers = sortedDriversRaw; // For score categorization, we might still want the default score sort, but let's see. 
    // Actually, excellentDrivers etc should probably stay sorted by score for the overview.
    const excellentDrivers = [...drivers].sort((a, b) => b.score - a.score).filter(d => d.score >= 7.0); // Green
    const goodDrivers = [...drivers].sort((a, b) => b.score - a.score).filter(d => d.score >= 4.0 && d.score < 7.0); // Orange
    const attentionDrivers = [...drivers].sort((a, b) => b.score - a.score).filter(d => d.score < 4.0); // Red

    const excellentPct = activeDrivers > 0 ? Math.round((excellentDrivers.length / activeDrivers) * 100) : 0;
    const goodPct = activeDrivers > 0 ? Math.round((goodDrivers.length / activeDrivers) * 100) : 0;
    const attentionPct = activeDrivers > 0 ? Math.round((attentionDrivers.length / activeDrivers) * 100) : 0;

    // Chained filtering for vehicles
    const availableVehicles = vehicles || [];

    // 1. Available brands depends on selected country
    const brands = Array.from(new Set(availableVehicles.map(v => v.manufacturer)))
        .filter(Boolean)
        .sort();

    // 2. Available models depend on selected country AND selected brands
    const availableModels = Array.from(new Set(
        availableVehicles
            .filter(v => selectedBrand.length === 0 || selectedBrand.includes(v.manufacturer))
            .map(v => v.model)
    )).filter(Boolean).sort();

    const filteredVehicles = availableVehicles.filter(v => {
        if (selectedBrand.length > 0 && !selectedBrand.includes(v.manufacturer)) return false;
        if (selectedModel.length > 0 && !selectedModel.includes(v.model)) return false;
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
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
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

                            {(!d.events || Object.keys(d.events).length === 0) && (
                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(34, 197, 94, 0.05)',
                                    borderRadius: '8px',
                                    border: '1px dashed rgba(34, 197, 94, 0.2)',
                                    color: '#4ade80',
                                    fontSize: '0.9em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>✨</span> Няма записани критични събития за периода. Шофирането е плавно.
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );

    const activeFilterCount = selectedCountry.length + selectedWarehouse.length;

    return (
        <div className={styles.container}>
            {/* ── TOP BAR ── */}
            <header className={styles.topBar}>
                <div className={styles.brandArea}>
                    <h1 className={styles.title}>Driver<br className={styles.titleBreak} /> Scoring Dashboard</h1>
                    <div className={styles.subtitle}>
                        {activeDrivers} шофьори • {totalDistance.toLocaleString('bg-BG')} km общо
                    </div>
                </div>

                {/* Desktop nav */}
                <nav className={styles.navTabs}>
                    <button className={`${styles.navTab} ${view === 'report' ? styles.navTabActive : ''}`} onClick={() => setView('report')}>Отчети</button>
                    <button className={`${styles.navTab} ${view === 'vehicles' ? styles.navTabActive : ''}`} onClick={() => setView('vehicles')}>Автомобили</button>
                    <button className={`${styles.navTab} ${view === 'drivers' ? styles.navTabActive : ''}`} onClick={() => setView('drivers')}>Шофьори</button>
                </nav>
            </header>

            {/* ── FILTER BAR ── */}
            <div className={styles.filterBar}>
                {/* City chips */}
                <div className={styles.cityChips}>
                    <button
                        className={`${styles.chip} ${selectedCountry.length === 0 ? styles.chipActive : ''}`}
                        onClick={() => removeFilter('country')}
                    >Всички</button>
                    {countries.map(c => (
                        <button
                            key={c.name}
                            className={`${styles.chip} ${selectedCountry.includes(c.name) ? styles.chipActive : ''}`}
                            onClick={() => toggleFilter('country', c.name)}
                        >
                            {c.name}
                            <span className={styles.chipCount}>{c.driversCount}</span>
                        </button>
                    ))}
                </div>

                {/* Date range + refresh */}
                <div className={styles.dateSection}>
                    <div className={styles.modeToggle}>
                        <label><input type="radio" checked={mode === 'single'} onChange={() => { setMode('single'); setEnd(start); }} /> Ден</label>
                        <label><input type="radio" checked={mode === 'range'} onChange={() => setMode('range')} /> Период</label>
                    </div>
                    <input type="date" className={styles.filterInput} value={start}
                        onChange={(e) => {
                            const v = e.target.value;
                            setStart(v);
                            if (mode === 'single') { setEnd(v); applyWithDates(v, v); }
                            else applyWithDates(v, end);
                        }} />
                    {mode === 'range' && (
                        <>
                            <span className={styles.dateSep}>—</span>
                            <input type="date" className={styles.filterInput} value={end}
                                onChange={(e) => { setEnd(e.target.value); applyWithDates(start, e.target.value); }} />
                        </>
                    )}
                    <button className={styles.button} onClick={handleApplyFilter}>Обнови</button>
                </div>
            </div>

            {/* Active filter badges */}
            {activeFilterCount > 0 && (
                <div className={styles.filterBadgeContainer}>
                    {selectedCountry.length > 0 && selectedCountry.map(c => (
                        <div key={c} className={styles.filterBadge}>
                            <span>Град: {c}</span>
                            <button onClick={() => toggleFilter('country', c)}>×</button>
                        </div>
                    ))}
                    {selectedWarehouse.length > 0 && selectedWarehouse.map(w => (
                        <div key={w} className={styles.filterBadge}>
                            <span>Склад: {w}</span>
                            <button onClick={() => toggleFilter('warehouse', w)}>×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── BOTTOM NAV (mobile only) ── */}
            <nav className={styles.bottomNav}>
                <button className={`${styles.bottomNavItem} ${view === 'report' ? styles.bottomNavActive : ''}`} onClick={() => setView('report')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    <span>Отчети</span>
                </button>
                <button className={`${styles.bottomNavItem} ${view === 'vehicles' ? styles.bottomNavActive : ''}`} onClick={() => setView('vehicles')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
                    <span>Автомобили</span>
                </button>
                <button className={`${styles.bottomNavItem} ${view === 'drivers' ? styles.bottomNavActive : ''}`} onClick={() => setView('drivers')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    <span>Шофьори</span>
                </button>
            </nav>

            {view === 'vehicles' ? (
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
                        {/* Brand Filter */}
                        <div className={styles.filterGroup}>
                            <div className={styles.filterLabel}>Марка</div>
                            <div className={styles.filterTileContainer}>
                                <div
                                    className={`${styles.filterTile} ${selectedBrand.length === 0 ? styles.filterTileActive : ''}`}
                                    onClick={() => removeFilter('brand')}
                                >Всички</div>
                                {brands.map(b => (
                                    <div
                                        key={b}
                                        className={`${styles.filterTile} ${selectedBrand.includes(b) ? styles.filterTileActive : ''}`}
                                        onClick={() => toggleFilter('brand', b)}
                                    >{b}</div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Model Filter as Chained Tiles */}
                        <div className={styles.filterGroup}>
                            <div className={styles.filterLabel}>Модел</div>
                            <div className={styles.filterTileContainer}>
                                <div
                                    className={`${styles.filterTile} ${selectedModel.length === 0 ? styles.filterTileActive : ''}`}
                                    onClick={() => removeFilter('model')}
                                >Всички</div>
                                {availableModels.map(m => (
                                    <div
                                        key={m}
                                        className={`${styles.filterTile} ${selectedModel.includes(m) ? styles.filterTileActive : ''}`}
                                        onClick={() => toggleFilter('model', m)}
                                    >{m}</div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div className={styles.card} style={{ minHeight: 280 }}>
                            <h3 className={styles.sectionTitle} style={{ marginTop: 0, fontSize: '1em' }}>Километри по марка</h3>
                            <div style={{ height: 240 }}>
                                <BrandDonutChart vehicles={filteredVehicles} />
                            </div>
                        </div>
                        <div className={styles.card} style={{ minHeight: 280 }}>
                            <h3 className={styles.sectionTitle} style={{ marginTop: 0, fontSize: '1em' }}>Среден скор по марка</h3>
                            <div style={{ height: 240 }}>
                                <BrandComparisonChart vehicles={filteredVehicles} />
                            </div>
                        </div>
                    </div>
                    <div className={styles.card} style={{ minHeight: 320, marginBottom: '24px' }}>
                        <h3 className={styles.sectionTitle} style={{ marginTop: 0, fontSize: '1em' }}>Скор vs Километри (всеки камион)</h3>
                        <div style={{ height: 280 }}>
                            <VehicleScatterChart vehicles={filteredVehicles} />
                        </div>
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
                    {/* Driver Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div className={styles.card} style={{ minHeight: 280 }}>
                            <h3 className={styles.sectionTitle} style={{ marginTop: 0, fontSize: '1em' }}>Разпределение на скоровете</h3>
                            <div style={{ height: 240 }}>
                                <ScoreHistogram drivers={sortedDrivers} />
                            </div>
                        </div>
                        <div className={styles.card} style={{ minHeight: 280 }}>
                            <h3 className={styles.sectionTitle} style={{ marginTop: 0, fontSize: '1em' }}>Топ проблемни поведения (fleet)</h3>
                            <div style={{ height: 240 }}>
                                <TopBehaviorsChart drivers={sortedDrivers} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.tableContainer} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <table className={styles.table}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                                <tr>
                                    <th
                                        style={{ textAlign: 'left', minWidth: 150, cursor: 'pointer' }}
                                        onClick={() => handleDriverSort('driverName')}
                                    >
                                        ШОФЬОР {getSortIcon('driverName')}
                                    </th>
                                    <th
                                        style={{ textAlign: 'center', minWidth: 80, cursor: 'pointer' }}
                                        onClick={() => handleDriverSort('score')}
                                    >
                                        ТОЧКИ {getSortIcon('score')}
                                    </th>
                                    <th
                                        style={{ textAlign: 'center', minWidth: 120, cursor: 'pointer' }}
                                        onClick={() => handleDriverSort('drivingTime')}
                                    >
                                        СРЕДНО ВРЕМЕ {getSortIcon('drivingTime')}
                                    </th>
                                    <th
                                        style={{ textAlign: 'center', minWidth: 120, cursor: 'pointer' }}
                                        onClick={() => handleDriverSort('consumption')}
                                    >
                                        СРЕДЕН РАЗХОД {getSortIcon('consumption')}
                                    </th>
                                    <th
                                        style={{ textAlign: 'left', minWidth: 200, cursor: 'pointer' }}
                                        onClick={() => handleDriverSort('vehicles')}
                                    >
                                        АВТОМОБИЛИ {getSortIcon('vehicles')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedDrivers.length > 0 ? sortedDrivers.map((d) => (
                                    <React.Fragment key={d.driverId}>
                                        <tr
                                            className={`${styles.clickableRow} ${expandedDriver === d.driverId ? styles.rowActive : ''}`}
                                            onClick={() => setExpandedDriver(expandedDriver === d.driverId ? null : d.driverId)}
                                        >
                                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: d.score >= 7 ? '#10b981' : d.score >= 4 ? '#f59e0b' : '#ef4444'
                                                    }}></span>
                                                    {d.driverName}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: '1.2em', fontWeight: 800 }} className={getScoreClass(d.score)}>
                                                {d.score.toFixed(2)}
                                            </td>
                                            <td style={{ textAlign: 'center', color: '#cbd5e1' }}>
                                                {formatTime(d.drivingTime)} ч.
                                            </td>
                                            <td style={{ textAlign: 'center', color: '#cbd5e1' }}>
                                                {d.consumption > 0 ? `${d.consumption.toFixed(1)} L/100km` : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.9em', color: '#94a3b8' }}>
                                                {(d.vehicles && d.vehicles.length > 0) ? d.vehicles.join(', ') : '—'}
                                            </td>
                                        </tr>
                                        {expandedDriver === d.driverId && (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '0', background: 'rgba(15, 23, 42, 0.4)' }}>
                                                    <div style={{ padding: '20px 24px', borderLeft: '4px solid var(--accent-color)' }}>
                                                        <div style={{ fontSize: '0.85em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 700 }}>
                                                            Препоръки за подобряване на представянето:
                                                        </div>

                                                        {(() => {
                                                            const recs = deriveRecommendations(d);
                                                            if (d.score >= 7.0 && recs.length === 0) return (
                                                                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05em' }}>
                                                                    <span style={{ fontSize: '1.4em' }}>🏆</span>
                                                                    Браво! Шофирането е в отлични граници. Продължавай все така!
                                                                </div>
                                                            );
                                                            if (recs.length === 0) return (
                                                                <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05em', fontStyle: 'italic' }}>
                                                                    <span style={{ fontSize: '1.4em' }}>📈</span>
                                                                    Продължавайте да следите показателите за още по-добри резултати.
                                                                </div>
                                                            );
                                                            return (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                    {recs.map((rec: string, i: number) => (
                                                                        <div key={i} style={{
                                                                            display: 'flex', alignItems: 'center', gap: '12px',
                                                                            padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)',
                                                                            borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)'
                                                                        }}>
                                                                            <span style={{ color: '#f59e0b', fontSize: '1.2em' }}>💡</span>
                                                                            <span style={{ color: '#f1f5f9', lineHeight: '1.4' }}>
                                                                                {RECOMMENDATION_TRANSLATIONS[rec] || rec}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}

                                                        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                                                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                                                                <div style={{ fontSize: '0.75em', color: '#64748b', marginBottom: '4px' }}>ИЗМИНАТО РАЗСТОЯНИЕ</div>
                                                                <div style={{ fontWeight: 600 }}>{Math.round(d.distance).toLocaleString('bg-BG')} km</div>
                                                            </div>
                                                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                                                                <div style={{ fontSize: '0.75em', color: '#64748b', marginBottom: '4px' }}>ОБЩО ВРЕМЕ</div>
                                                                <div style={{ fontWeight: 600 }}>{formatTime(d.drivingTime)} ч.</div>
                                                            </div>
                                                        </div>
                                                    </div>
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

                    {((mapData && mapData.length > 0) || (chartData && chartData.length > 0)) && (
                        <div className={styles.dashboardMain}>
                            {mapData && mapData.length > 0 && (
                                <div className={styles.mapSection}>
                                    <LocationsMap
                                        data={mapData}
                                        selectedLocation={selectedCountry}
                                        onLocationSelect={(loc) => toggleFilter('country', loc)}
                                    />
                                </div>
                            )}

                            {chartData && chartData.length > 0 && (
                                <div className={styles.chartsSection}>
                                    <div className={styles.card} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Warehouse Performance</h2>
                                        <div style={{ flex: 1, minHeight: 0 }}>
                                            <WarehouseChart
                                                data={chartData}
                                                selectedWarehouses={selectedWarehouse}
                                                onWarehouseSelect={(wh: string) => toggleFilter('warehouse', wh)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* City segment chart */}
                    {countries.length > 0 && (
                        <div className={styles.card} style={{ minHeight: 320, marginTop: '24px' }}>
                            <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>Шофьори по град и категория</h2>
                            <div style={{ height: 280 }}>
                                <CitySegmentChart
                                    drivers={drivers}
                                    onCityClick={(city) => toggleFilter('country', city)}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '24px' }}>
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

