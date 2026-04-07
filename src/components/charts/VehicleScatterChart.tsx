"use client";

import { useMemo } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatScore, formatKm, formatDecimal } from '../../../lib/formatters';
import { VehiclePerformance } from '../../../lib/scoring-types';

interface Props {
    vehicles: VehiclePerformance[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0]?.payload;
        if (!d) return null;
        let color = '#ef4444';
        if (d.score >= 7) color = '#10b981';
        else if (d.score >= 4) color = '#f59e0b';
        return (
            <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '13px',
                maxWidth: 200
            }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1 }}>{d.plate}</div>
                <div style={{ color: '#94a3b8', marginBottom: 4 }}>{d.brand} {d.model}</div>
                <div>Оценка: <span style={{ color, fontWeight: 700 }}>{formatScore(d.score)}</span></div>
                <div>{formatKm(d.km)}</div>
            </div>
        );
    }
    return null;
};

export default function VehicleScatterChart({ vehicles }: Props) {
    const data = useMemo(() => vehicles.map(v => ({
        score: parseFloat(v.score.toFixed(2)),
        km: Math.round(v.distance),
        plate: v.licensePlate,
        brand: v.manufacturer,
        model: v.model,
        fill: v.score >= 7 ? '#10b981' : v.score >= 4 ? '#f59e0b' : '#ef4444'
    })), [vehicles]);

    if (data.length === 0) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Няма данни
        </div>
    );

    const maxKm = Math.max(...data.map(d => d.km), 1);
    const kmStep = Math.round(maxKm / 4 / 1000) * 1000 || 1000;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="score"
                    type="number"
                    domain={[0, 10]}
                    name="Оценка"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    stroke="#475569"
                    label={{ value: 'Оценка', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                    dataKey="km"
                    type="number"
                    name="km"
                    tickFormatter={(v) => `${formatDecimal(v / 1000, 0)}k`}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    stroke="#475569"
                    label={{ value: 'Километри', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
                    tickCount={5}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.15)' }} />
                <ReferenceLine x={7} stroke="rgba(16,185,129,0.3)" strokeDasharray="4 4" />
                <ReferenceLine x={4} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 4" />
                <Scatter
                    data={data}
                    shape={(props: any) => (
                        <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={5}
                            fill={props.payload.fill}
                            fillOpacity={0.8}
                            stroke={props.payload.fill}
                            strokeWidth={1}
                            strokeOpacity={0.5}
                        />
                    )}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
}
