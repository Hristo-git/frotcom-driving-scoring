"use client";

import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { PerformanceReport } from '../../../lib/scoring-types';

interface Props {
    drivers: PerformanceReport[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const count = payload[0]?.value ?? 0;
        const score = parseFloat(label);
        let color = '#ef4444';
        if (score >= 7) color = '#10b981';
        else if (score >= 4) color = '#f59e0b';
        return (
            <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '13px'
            }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color }}>Оценка {label}–{(parseFloat(label) + 1).toFixed(0)}</div>
                <div>{count} шофьор{count !== 1 ? 'и' : ''}</div>
            </div>
        );
    }
    return null;
};

export default function ScoreHistogram({ drivers }: Props) {
    const data = useMemo(() => {
        // 10 buckets: [0-1), [1-2), ..., [9-10]
        const buckets = Array.from({ length: 10 }, (_, i) => ({
            label: i.toString(),
            range: `${i}–${i + 1}`,
            count: 0,
            score: i
        }));
        for (const d of drivers) {
            const idx = Math.min(Math.floor(d.score), 9);
            buckets[idx].count++;
        }
        return buckets;
    }, [drivers]);

    if (drivers.length === 0) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Няма данни
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                    dataKey="range"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    stroke="#475569"
                    label={{ value: 'Оценка', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    stroke="#475569"
                    label={{ value: 'Шофьори', angle: -90, position: 'insideLeft', offset: 12, fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.map((entry, i) => {
                        let fill = '#ef4444';
                        if (entry.score >= 7) fill = '#10b981';
                        else if (entry.score >= 4) fill = '#f59e0b';
                        return <Cell key={i} fill={fill} fillOpacity={entry.count === 0 ? 0.2 : 0.85} />;
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
