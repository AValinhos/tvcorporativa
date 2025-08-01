
'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { subDays, format } from 'date-fns';

interface AnalyticsDataPoint {
  date: string;
  time: string;
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

    const allDeviceKeys = new Set<string>();
    analyticsData.forEach(d => {
        Object.keys(d).forEach(key => {
            if (key !== 'date' && key !== 'time') {
                allDeviceKeys.add(key);
            }
        });
    });

    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    const filteredData = analyticsData.filter(d => {
        const recordDate = new Date(`${d.date}T${d.time}`);
        return recordDate >= thirtyDaysAgo && recordDate <= now;
    }).map(d => ({
        ...d,
        fullDate: `${d.date} ${d.time}`,
        formattedTime: format(new Date(`${d.date}T${d.time}`), "dd/MM HH:mm")
    }));
    
    const config: ChartConfig = {};
    Array.from(allDeviceKeys).forEach((key, index) => {
        config[key] = {
            label: key,
            color: generateHslColor(index),
        }
    });

    return { chartData: filteredData, chartConfig: config };

  }, [analyticsData]);
  
  const deviceKeys = Object.keys(chartConfig);


  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Monitoramento de Atividade (Últimos 30 dias)</CardTitle>
        <CardDescription>Tempo de uso (em minutos) por dispositivo ao longo do tempo.</CardDescription>
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
                        dataKey="formattedTime"
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
