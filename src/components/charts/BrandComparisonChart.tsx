"use client";

import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { VehiclePerformance } from '../../../lib/scoring-types';

interface Props {
    vehicles: VehiclePerformance[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const score = payload[0]?.value ?? 0;
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
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div>Средна оценка: <span style={{ color, fontWeight: 700 }}>{score.toFixed(2)}</span></div>
                <div style={{ color: '#94a3b8' }}>Брой: {payload[0]?.payload?.count} авт.</div>
            </div>
        );
    }
    return null;
};

export default function BrandComparisonChart({ vehicles }: Props) {
    const data = useMemo(() => {
        const byBrand = new Map<string, { totalScore: number; count: number }>();
        for (const v of vehicles) {
            const brand = v.manufacturer || 'Неизвестна';
            const cur = byBrand.get(brand) || { totalScore: 0, count: 0 };
            byBrand.set(brand, { totalScore: cur.totalScore + v.score, count: cur.count + 1 });
        }
        return Array.from(byBrand.entries())
            .map(([name, { totalScore, count }]) => ({
                name,
                score: parseFloat((totalScore / count).toFixed(2)),
                count
            }))
            .sort((a, b) => b.score - a.score);
    }, [vehicles]);

    if (data.length === 0) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Няма данни
        </div>
    );

    const minHeight = Math.max(120, data.length * 44);

    return (
        <div style={{ width: '100%', minHeight: `${minHeight}px`, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 8, right: 50, left: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#475569" />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#e2e8f0', fontSize: 12 }} width={90} stroke="none" />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="score" position="right" formatter={(v: unknown) => typeof v === 'number' ? v.toFixed(2) : ''} style={{ fill: '#94a3b8', fontSize: 11 }} />
                        {data.map((entry, i) => {
                            let fill = '#ef4444';
                            if (entry.score >= 7) fill = '#10b981';
                            else if (entry.score >= 4) fill = '#f59e0b';
                            return <Cell key={i} fill={fill} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
