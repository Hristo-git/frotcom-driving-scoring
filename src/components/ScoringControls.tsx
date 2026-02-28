'use client';

import React from 'react';
import type { ScoringWeights } from '../../lib/scoring';
import styles from '../app/dashboard.module.css';
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
} from './icons';

interface ScoringControlsProps {
    weights: ScoringWeights;
    onChange: (weights: ScoringWeights) => void;
    onApply: () => void;
}

const criteria = [
    { key: 'harshAccelerationLow', label: 'Среден брой резки ускорения при ниска скорост', Icon: IconAccelLow },
    { key: 'harshAccelerationHigh', label: 'Среден брой резки ускорения при висока скорост', Icon: IconAccelHigh },
    { key: 'harshBrakingLow', label: 'Среден брой резки спирания при ниска скорост', Icon: IconBrakeLow },
    { key: 'harshBrakingHigh', label: 'Среден брой резки спирания при висока скорост', Icon: IconBrakeHigh },
    { key: 'harshCornering', label: 'Рязък завой', Icon: IconCornering },
    { key: 'accelBrakeSwitch', label: 'Рязка смяна между ускорение и спирачка', Icon: IconSwitch },
    { key: 'excessiveIdling', label: 'Превишена работа на място', Icon: IconIdling },
    { key: 'highRPM', label: 'Време с превишени обороти', Icon: IconRPM },
    { key: 'alarms', label: 'Аларми', Icon: IconAlarm },
    { key: 'noCruiseControl', label: 'Време без Круиз контрол', Icon: IconNoCruise },
    { key: 'accelDuringCruise', label: 'Ускорение по време на използване на круиз контрол', Icon: IconAccelCruise },
] as const;

export default function ScoringControls({ weights, onChange, onApply }: ScoringControlsProps) {
    const handleSliderChange = (key: keyof ScoringWeights, value: string) => {
        onChange({ ...weights, [key]: parseFloat(value) });
    };

    const total = (Object.values(weights) as number[]).reduce((a: number, b: number) => a + b, 0);

    return (
        <div style={{
            backgroundColor: '#ffffff',
            padding: '30px',
            borderRadius: '4px',
            border: '1px solid #e1e4e8',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <h3 style={{
                marginTop: 0,
                marginBottom: '25px',
                fontSize: '15px',
                fontWeight: 600,
                color: '#2c3e50',
                letterSpacing: '0.5px'
            }}>
                ЗАДАЙ ПЕРСОНАЛИЗИРАНА ОЦЕНКА
            </h3>

            <style dangerouslySetInnerHTML={{
                __html: `
                input[type=range].frotcom-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    background: transparent;
                }
                input[type=range].frotcom-slider::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 8px;
                    cursor: pointer;
                    background: #e2e8f0;
                    border-radius: 4px;
                }
                input[type=range].frotcom-slider::-webkit-slider-thumb {
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 2px solid #3b82f6;
                    cursor: pointer;
                    -webkit-appearance: none;
                    margin-top: -5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                input[type=range].frotcom-slider:focus { outline: none; }
            `}} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {criteria.map((item) => {
                    const val = weights[item.key as keyof ScoringWeights];
                    return (
                        <div key={item.key} className={styles.scoringRow} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Icon badge — dark square like Frotcom */}
                            <div style={{
                                width: '38px',
                                height: '38px',
                                minWidth: '38px',
                                backgroundColor: '#1a202c',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}>
                                <item.Icon />
                            </div>

                            {/* Label */}
                            <div className={styles.scoringLabel} style={{ flex: 1, fontSize: '14px', color: '#4a5568', fontWeight: 500 }}>
                                {item.label}
                            </div>

                            {/* Slider with blue fill */}
                            <div className={styles.scoringSliderWrapper} style={{ width: '250px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    height: '8px',
                                    backgroundColor: val > 0 ? '#3b82f6' : '#e2e8f0',
                                    borderRadius: '4px',
                                    width: `${val}%`,
                                    pointerEvents: 'none',
                                    zIndex: 1
                                }} />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={val}
                                    onChange={(e) => handleSliderChange(item.key as keyof ScoringWeights, e.target.value)}
                                    className="frotcom-slider"
                                    style={{ position: 'relative', zIndex: 2 }}
                                />
                            </div>

                            {/* Percentage value */}
                            <div style={{ width: '44px', textAlign: 'right', fontSize: '14px', color: '#1a202c', fontWeight: 700 }}>
                                {val}%
                            </div>

                            {/* Button */}
                            <button style={{
                                padding: '6px 14px',
                                fontSize: '11px',
                                color: '#4a5568',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}>
                                ЗАДАЙ ГРАНИЦИ
                            </button>
                        </div>
                    );
                })}
            </div>

            <div style={{
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid #edf2f7',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#4a5568' }}>
                    Общо тегло:{' '}
                    <span style={{ color: '#1a202c', fontWeight: 800 }}>{total.toFixed(0)}%</span>
                    <span style={{ fontSize: '13px', color: '#718096', marginLeft: '12px', fontWeight: 400 }}>
                        (Теглата ще бъдат автоматично нормирани)
                    </span>
                </div>
                <div className={styles.scoringActions} style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#ffffff',
                            color: '#4a5568',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}>
                        ОТКАЖИ
                    </button>
                    <button
                        onClick={onApply}
                        style={{
                            padding: '10px 30px',
                            backgroundColor: '#111827',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                        }}>
                        ЗАПАЗИ ПРОМЕНИТЕ
                    </button>
                </div>
            </div>
        </div>
    );
}
