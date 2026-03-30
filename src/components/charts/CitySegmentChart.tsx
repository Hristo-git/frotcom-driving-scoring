"use client";

import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { PerformanceReport } from '../../../lib/scoring-types';

interface Props {
    drivers: PerformanceReport[];
    onCityClick?: (city: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const excellent = payload.find((p: any) => p.dataKey === 'excellent')?.value ?? 0;
        const good = payload.find((p: any) => p.dataKey === 'good')?.value ?? 0;
        const attention = payload.find((p: any) => p.dataKey === 'attention')?.value ?? 0;
        const total = excellent + good + attention;
        return (
            <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px 16px',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '13px'
            }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><span style={{ color: '#10b981' }}>● Отлични (≥7): </span>{excellent}</div>
                    <div><span style={{ color: '#f59e0b' }}>● Добри (4–7): </span>{good}</div>
                    <div><span style={{ color: '#ef4444' }}>● Внимание (&lt;4): </span>{attention}</div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4, marginTop: 4, color: '#94a3b8' }}>
                        Общо: {total} шофьора
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function CitySegmentChart({ drivers, onCityClick }: Props) {
    const data = useMemo(() => {
        const byCity = new Map<string, { excellent: number; good: number; attention: number }>();
        for (const d of drivers) {
            const city = d.country || 'Неизвестен';
            const cur = byCity.get(city) || { excellent: 0, good: 0, attention: 0 };
            if (d.score >= 7) cur.excellent++;
            else if (d.score >= 4) cur.good++;
            else cur.attention++;
            byCity.set(city, cur);
        }
        return Array.from(byCity.entries())
            .map(([name, counts]) => ({ name, ...counts, total: counts.excellent + counts.good + counts.attention }))
            .filter(d => d.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [drivers]);

    if (data.length === 0) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Няма данни
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 8, right: 16, left: 0, bottom: 60 }}
                onClick={(e) => {
                    if (e && e.activeLabel && onCityClick) onCityClick(String(e.activeLabel));
                }}
                style={{ cursor: onCityClick ? 'pointer' : 'default' }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                    dataKey="name"
                    tick={{ fill: '#e2e8f0', fontSize: 11 }}
                    stroke="#475569"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={70}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#475569" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend
                    formatter={(value) => {
                        const labels: Record<string, string> = { excellent: 'Отлични (≥7)', good: 'Добри (4–7)', attention: 'Внимание (<4)' };
                        return <span style={{ color: '#cbd5e1', fontSize: 12 }}>{labels[value] || value}</span>;
                    }}
                />
                <Bar dataKey="excellent" stackId="a" fill="#10b981" name="excellent" />
                <Bar dataKey="good" stackId="a" fill="#f59e0b" name="good" />
                <Bar dataKey="attention" stackId="a" fill="#ef4444" name="attention" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
