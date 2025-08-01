
'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AnalyticsDataPoint {
  date: string;
  [key: string]: any;
}

interface AnalyticsChartProps {
  className?: string;
}

const generateHslColor = (index: number) => {
    const hue = (index * 137.508) % 360; 
    return `hsl(${hue}, 50%, 60%)`;
}


export default function AnalyticsChart({ className }: AnalyticsChartProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/analytics');
            if (!res.ok) throw new Error('Falha ao buscar dados de analytics');
            const data = await res.json();
            setAnalyticsData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, []);

  const { chartData, chartConfig } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { chartData: [], chartConfig: {} };
    }

    const today = new Date();
    const last30Days: AnalyticsDataPoint[] = [];
    const allDeviceKeys = new Set<string>();

    // First pass to get all possible device names
    analyticsData.forEach(d => {
        Object.keys(d).forEach(key => {
            if (key !== 'date') {
                allDeviceKeys.add(key);
            }
        });
    });

    const dataMap = new Map(analyticsData.map(d => [d.date, d]));

    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        const dayData = dataMap.get(dateString);
        const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        const dataPoint: AnalyticsDataPoint = { date: formattedDate };
        
        allDeviceKeys.forEach(key => {
            dataPoint[key] = dayData?.[key] || 0;
        });

        last30Days.push(dataPoint);
    }
    
    const config: ChartConfig = {};
    Array.from(allDeviceKeys).forEach((key, index) => {
        config[key] = {
            label: key,
            color: generateHslColor(index),
        }
    });

    return { chartData: last30Days, chartConfig: config };

  }, [analyticsData]);
  
  const deviceKeys = Object.keys(chartConfig);


  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Monitoramento de Atividade (Últimos 30 dias)</CardTitle>
        <CardDescription>Tempo de uso diário (em minutos) por dispositivo.</CardDescription>
      </CardHeader>
      <CardContent>
       {isLoading ? (
          <div className="flex justify-center items-center min-h-[350px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
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
                        <Line key={key} type="monotone" dataKey={key} stroke={chartConfig[key]?.color} strokeWidth={2} dot={false} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
