
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Loader2 } from 'lucide-react';
import { subDays, parse } from 'date-fns';

interface AnalyticsDataPoint {
  date: string;
  time: string;
  [key: string]: any;
}

const generateColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

export default function AnalyticsChart() {
  const [data, setData] = useState<AnalyticsDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Falha ao buscar dados de analytics');
        const jsonData = await res.json();
        setData(jsonData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const { chartData, deviceKeys, chartConfig } = useMemo(() => {
    if (!data.length) return { chartData: [], deviceKeys: [], chartConfig: {} };
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const filteredData = data.filter(d => {
        const recordDate = parse(`${d.date} ${d.time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
        return recordDate >= thirtyDaysAgo;
    });

    if(!filteredData.length) return { chartData: [], deviceKeys: [], chartConfig: {} };

    const deviceKeys = Object.keys(filteredData[0] || {}).filter(
      key => key !== 'date' && key !== 'time'
    );
    
    const chartConfig = deviceKeys.reduce((acc, key) => {
      acc[key] = {
        label: key,
        color: generateColor(key),
      };
      return acc;
    }, {} as any);
    
    const chartData = filteredData.map(d => ({
      ...d,
      timestamp: `${d.date} ${d.time}`,
    })).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());


    return { chartData, deviceKeys, chartConfig };
  }, [data]);

  if (isLoading) {
    return <div className="flex h-48 w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-destructive">Erro: {error}</div>;
  }
  
  if(chartData.length === 0){
    return <p className="text-center text-muted-foreground">Nenhum dado de visualização encontrado nos últimos 30 dias.</p>;
  }


  return (
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
             <ChartLegend content={<ChartLegendContent />} />
            {deviceKeys.map(key => (
            <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`hsl(var(--chart-${Object.keys(chartConfig).indexOf(key) + 1}))`}
                strokeWidth={2}
                dot={false}
            />
            ))}
        </LineChart>
    </ChartContainer>
  );
}
