"use client";

import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { formatDecimal } from '../../../lib/formatters';
import { PerformanceReport } from '../../../lib/scoring-types';

interface Props {
    drivers: PerformanceReport[];
}

const EVENT_LABELS: Record<string, string> = {
    highRPM: 'Превишени обороти',
    lowSpeedBreak: 'Рязко спиране (ниск.)',
    highSpeedBreak: 'Рязко спиране (вис.)',
    lateralAcceleration: 'Остри завои',
    lowSpeedAcceleration: 'Рязко ускорение (ниск.)',
    highSpeedAcceleration: 'Рязко ускорение (вис.)',
    idling: 'Работа на място',
    accelBrakeFastShift: 'Смяна газ-спирачка',
    harshAccelerationLow: 'Ускорение (ниско)',
    harshAccelerationHigh: 'Ускорение (високо)',
    harshBrakingLow: 'Спиране (ниско)',
    harshBrakingHigh: 'Спиране (високо)',
    harshCornering: 'Рязко завиване',
    accelBrakeSwitch: 'Ускорение/спиране',
    excessiveIdling: 'Празен ход',
    alarms: 'Аларми',
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const val = payload[0]?.value ?? 0;
        let color = '#ef4444';
        if (val <= 0.5) color = '#10b981';
        else if (val <= 2) color = '#f59e0b';
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
                <div>Средно: <span style={{ color, fontWeight: 700 }}>{formatDecimal(val, 2)}</span> / 100km</div>
            </div>
        );
    }
    return null;
};

export default function TopBehaviorsChart({ drivers }: Props) {
    const data = useMemo(() => {
        const totalKm = drivers.reduce((s, d) => s + (d.distance || 0), 0);
        if (totalKm === 0) return [];

        const eventTotals = new Map<string, number>();
        for (const driver of drivers) {
            for (const [key, count] of Object.entries(driver.events || {})) {
                eventTotals.set(key, (eventTotals.get(key) || 0) + (count as number));
            }
        }

        return Array.from(eventTotals.entries())
            .filter(([, total]) => total > 0)
            .map(([key, total]) => ({
                name: EVENT_LABELS[key] || key,
                per100: parseFloat(((total / totalKm) * 100).toFixed(2))
            }))
            .sort((a, b) => b.per100 - a.per100)
            .slice(0, 8);
    }, [drivers]);

    if (data.length === 0) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Няма данни за събития
        </div>
    );

    const minHeight = Math.max(150, data.length * 44);

    return (
        <div style={{ width: '100%', minHeight: `${minHeight}px`, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 8, right: 60, left: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#475569"
                        label={{ value: 'на 100km', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#e2e8f0', fontSize: 11 }} width={140} stroke="none" />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="per100" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="per100" position="right" formatter={(v: unknown) => typeof v === 'number' ? formatDecimal(v, 2) : ''} style={{ fill: '#94a3b8', fontSize: 11 }} />
                        {data.map((entry, i) => {
                            let fill = '#ef4444';
                            if (entry.per100 <= 0.5) fill = '#10b981';
                            else if (entry.per100 <= 2) fill = '#f59e0b';
                            return <Cell key={i} fill={fill} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
