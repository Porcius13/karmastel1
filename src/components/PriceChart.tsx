"use client";
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceHistoryItem {
    date: string;
    price: number;
}

interface PriceChartProps {
    history?: PriceHistoryItem[];
    currentPrice?: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ history = [], currentPrice = 0 }) => {
    // 1. Prepare Data (Real or Dummy)
    let displayData = [];
    const isDummy = !history || history.length < 2;

    if (isDummy) {
        // Generate Dummy Data (Last 7 Days)
        const basePrice = currentPrice > 0 ? currentPrice : 1500;
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);

            // Random price within 10% variance
            const variance = basePrice * 0.1;
            const randomPrice = basePrice + (Math.random() * variance * 2 - variance);

            displayData.push({
                date: d.toISOString(),
                price: Math.round(randomPrice),
                displayDate: d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
            });
        }
    } else {
        // Format Real Data
        displayData = history.map(item => ({
            ...item,
            displayDate: new Date(item.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
        }));
        // Sort by date just in case
        displayData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-surface p-3 border border-surfaceHighlight shadow-xl rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-bold text-primary">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value)}
                    </p>
                    {isDummy && <span className="text-[10px] text-muted-foreground italic">(Tahmini Veri)</span>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[300px] bg-surface rounded-xl p-2 select-none">
            {isDummy && (
                <div className="flex items-center gap-2 mb-2 px-2">
                    <span className="w-2 h-2 rounded-full bg-surfaceHighlight"></span>
                    <p className="text-xs text-muted-foreground">Yeterli veri yok, tahmini grafik gösteriliyor.</p>
                </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={displayData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E83C91" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#E83C91" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E0F8" />
                    <XAxis
                        dataKey="displayDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#7D6E83' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#7D6E83' }}
                        tickFormatter={(value) => `₺${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#E83C91"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
