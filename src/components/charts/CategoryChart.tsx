"use client";

import { useMemo } from 'react';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import { VehiclePerformance } from '../../../lib/scoring-types';

interface Props {
    vehicles: VehiclePerformance[];
    selectedCategory?: string | null;
    onCategoryClick?: (cat: string) => void;
}

function getCategory(plate: string, vehicleClass?: string): string {
    if (/-[Бб]$/.test(plate)) return 'Категория B (до 3.5т)';
    if (/-[Цц]$/.test(plate)) return 'Категория C (над 3.5т)';
    if (vehicleClass === '[VC_Truck]') return 'Категория C (над 3.5т)';
    if (vehicleClass === '[VC_Minibus]' || vehicleClass === '[VC_Van]' || vehicleClass === '[VC_Passenger]') return 'Категория B (до 3.5т)';
    return 'Некатегоризирани';
}

const COLORS: Record<string, string> = {
    'Категория B (до 3.5т)': '#3b82f6',
    'Категория C (над 3.5т)': '#10b981',
    'Некатегоризирани': '#64748b',
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '13px'
            }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                <div>Автомобили: <b>{d.count}</b></div>
                <div>Средна оценка: <b style={{ color: d.score >= 7 ? '#4ade80' : d.score >= 4 ? '#fb923c' : '#f87171' }}>{d.score.toFixed(2)}</b></div>
                <div>Километри: <b>{Math.round(d.km).toLocaleString('bg-BG')}</b></div>
                <div>Среден разход: <b>{d.cons > 0 ? `${d.cons.toFixed(1)} L/100km` : '—'}</b></div>
            </div>
        );
    }
    return null;
};

export default function CategoryChart({ vehicles, selectedCategory, onCategoryClick }: Props) {
    const data = useMemo(() => {
        const map = new Map<string, { km: number; weightedScore: number; weightedCons: number; consKm: number; count: number }>();

        for (const v of vehicles) {
            const cat = getCategory(v.licensePlate, v.vehicleClass);
            if (!map.has(cat)) map.set(cat, { km: 0, weightedScore: 0, weightedCons: 0, consKm: 0, count: 0 });
            const e = map.get(cat)!;
            e.km += v.distance || 0;
            e.weightedScore += v.score * (v.distance || 0);
            if (v.fuelConsumption > 0) {
                e.weightedCons += v.fuelConsumption * (v.distance || 0);
                e.consKm += v.distance || 0;
            }
            e.count++;
        }

        const order = ['Категория B (до 3.5т)', 'Категория C (над 3.5т)', 'Некатегоризирани'];
        return order
            .filter(cat => map.has(cat))
            .map(cat => {
                const e = map.get(cat)!;
                return {
                    name: cat,
                    score: e.km > 0 ? parseFloat((e.weightedScore / e.km).toFixed(2)) : 0,
                    km: e.km,
                    cons: e.consKm > 0 ? parseFloat((e.weightedCons / e.consKm).toFixed(1)) : 0,
                    count: e.count,
                    fill: COLORS[cat],
                };
            });
    }, [vehicles]);

    if (data.length === 0) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Няма данни
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 12 }} tickCount={6} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                    dataKey="score"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(d) => d?.name && onCategoryClick?.(d.name)}
                >
                    {data.map((entry) => (
                        <Cell
                            key={entry.name}
                            fill={entry.fill}
                            opacity={!selectedCategory || selectedCategory === entry.name ? 1 : 0.35}
                        />
                    ))}
                    <LabelList dataKey="score" position="top" formatter={(v: any) => typeof v === 'number' ? v.toFixed(2) : v} style={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 700 }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

