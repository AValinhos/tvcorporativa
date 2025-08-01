
'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { subDays, format, parse } from 'date-fns';

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

    const filteredData = analyticsData
      .map(d => {
        // Usa a biblioteca date-fns para parsear a data e hora
        const recordDate = parse(`${d.date} ${d.time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
        return {
          ...d,
          recordDate, // Mantém o objeto Date para ordenação e filtragem
          formattedTime: format(recordDate, "dd/MM HH:mm")
        };
      })
      .filter(d => d.recordDate >= thirtyDaysAgo && d.recordDate <= now)
      .sort((a,b) => a.recordDate.getTime() - b.recordDate.getTime());

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
                    <Tooltip content={<ChartTooltipContent indicator="dot" />} />
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
