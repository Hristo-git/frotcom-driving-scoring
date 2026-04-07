"use client";

import { useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatKm } from '../../../lib/formatters';
import { VehiclePerformance } from '../../../lib/scoring-types';

interface Props {
    vehicles: VehiclePerformance[];
}

const BRAND_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const { name, value, payload: entry } = payload[0];
        return (
            <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '13px'
            }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{name}</div>
                <div>{formatKm(value)}</div>
                <div style={{ color: '#94a3b8' }}>{entry.pct}% от общото</div>
            </div>
        );
    }
    return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) => {
    if (pct < 5) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
            {pct}%
        </text>
    );
};

export default function BrandDonutChart({ vehicles }: Props) {
    const data = useMemo(() => {
        const byBrand = new Map<string, number>();
        for (const v of vehicles) {
            const brand = v.manufacturer || 'Неизвестна';
            byBrand.set(brand, (byBrand.get(brand) || 0) + (v.distance || 0));
        }
        const total = Array.from(byBrand.values()).reduce((a, b) => a + b, 0);
        return Array.from(byBrand.entries())
            .map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }))
            .sort((a, b) => b.value - a.value);
    }, [vehicles]);

    if (data.length === 0) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Няма данни
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    innerRadius="40%"
                    outerRadius="65%"
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                >
                    {data.map((entry, i) => (
                        <Cell key={entry.name} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{value}</span>}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
