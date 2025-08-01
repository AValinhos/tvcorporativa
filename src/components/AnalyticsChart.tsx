'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useMemo } from 'react';

interface AnalyticsDataPoint {
  date: string;
  [key: string]: any;
}

interface AnalyticsChartProps {
  analyticsData: AnalyticsDataPoint[];
  className?: string;
}

// Helper to generate a random HSL color
const generateHslColor = (index: number) => {
    const hue = (index * 137.508) % 360; 
    return `hsl(${hue}, 50%, 60%)`;
}


export default function AnalyticsChart({ analyticsData, className }: AnalyticsChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { chartData: [], chartConfig: {} };
    }
    
    // Format date for display
    const formattedData = analyticsData.map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));

    // Get all unique device names from the data
    const deviceKeys = Array.from(new Set(analyticsData.flatMap(d => Object.keys(d).filter(key => key !== 'date'))));
    
    // Create chart config for colors and labels
    const config: ChartConfig = {};
    deviceKeys.forEach((key, index) => {
        config[key] = {
            label: key,
            color: generateHslColor(index),
        }
    });

    return { chartData: formattedData, chartConfig: config };

  }, [analyticsData]);
  
  const deviceKeys = Object.keys(chartConfig);


  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Monitoramento de Atividade (Últimos 30 dias)</CardTitle>
        <CardDescription>Tempo de uso diário (em minutos) por dispositivo.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value}
                    />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {deviceKeys.map((key) => (
                        <Bar key={key} dataKey={key} fill={chartConfig[key].color} radius={4} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
