"use client";

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface WarehouseData {
    name: string;
    score: number;
}

interface WarehouseChartProps {
    data: WarehouseData[];
    selectedWarehouse: string | null;
    onWarehouseSelect: (warehouseName: string) => void;
}

// Custom Tooltip for Dark Theme
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const score = payload[0].value;
        let color = '#ef4444'; // Red
        if (score >= 9) color = '#10b981'; // Green
        else if (score >= 7) color = '#f59e0b'; // Orange

        return (
            <div style={{
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px',
                borderRadius: '8px',
                backdropFilter: 'blur(4px)',
                color: '#e2e8f0',
                fontWeight: 600
            }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#94a3b8' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '16px' }}>
                    Score: <span style={{ color }}>{score.toFixed(2)}</span>
                </p>
            </div>
        );
    }
    return null;
};

export default function WarehouseChart({ data, selectedWarehouse, onWarehouseSelect }: WarehouseChartProps) {
    // Sort data so highest scores are at the top (if we use a horizontal layout) 
    // or at the left (for vertical alignment).
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => b.score - a.score).slice(0, 15); // Top 15 to fit nicely
    }, [data]);

    if (!sortedData || sortedData.length === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                No warehouse data available
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    layout="vertical" // Horizontal bars often look better in dashboards for long names
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />

                    <XAxis
                        type="number"
                        domain={[0, 10]}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />

                    <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#64748b"
                        tick={{ fill: '#e2e8f0', fontSize: 12 }}
                        width={120}
                    />

                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />

                    <Bar
                        dataKey="score"
                        radius={[0, 4, 4, 0]}
                        onClick={(data) => {
                            if (data && data.name) {
                                onWarehouseSelect(data.name);
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        {sortedData.map((entry, index) => {
                            const isSelected = selectedWarehouse === entry.name;

                            // Color based on performance
                            let fill = '#ef4444'; // Low -> Red
                            if (entry.score >= 9) fill = '#10b981'; // High -> Green
                            else if (entry.score >= 7) fill = '#f59e0b'; // Med -> Orange

                            // If something is selected, dim the unselected ones
                            if (selectedWarehouse && !isSelected) {
                                fill = `${fill}40`; // Add transparency (hex 40 ~ 25% opacity)
                            }

                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={fill}
                                    stroke={isSelected ? '#ffffff' : 'none'}
                                    strokeWidth={isSelected ? 2 : 0}
                                />
                            );
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
