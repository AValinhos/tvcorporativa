
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Loader2 } from 'lucide-react';
import { MediaItem } from '@/app/page';

interface ExposureData {
  [key: string]: number;
}

interface ChartDataPoint {
  name: string;
  views: number;
}

export default function ExposureChart() {
  const [exposureData, setExposureData] = useState<ExposureData | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [exposureRes, dataRes] = await Promise.all([
          fetch('/api/exposure'),
          fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_DASHBOARD_DATA' }),
          }),
        ]);

        if (!exposureRes.ok || !dataRes.ok) {
          throw new Error('Falha ao buscar dados de visualização');
        }

        const exposureJson = await exposureRes.json();
        const dataJson = await dataRes.json();
        
        setExposureData(exposureJson);
        setMediaItems(dataJson.mediaItems || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!exposureData || !mediaItems.length) return [];
    
    const data: ChartDataPoint[] = Object.entries(exposureData)
      .map(([mediaId, views]) => {
        const mediaItem = mediaItems.find(item => item.id === mediaId);
        return {
          name: mediaItem?.name || `ID: ${mediaId}`,
          views: views,
        };
      })
      .sort((a, b) => b.views - a.views); // Sort by views descending
      
      return data;

  }, [exposureData, mediaItems]);

  const chartConfig = {
    views: {
      label: 'Visualizações',
      color: 'hsl(var(--chart-1))',
    },
  };


  if (isLoading) {
    return <div className="flex h-48 w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-destructive">Erro: {error}</div>;
  }
  
  if (chartData.length === 0){
    return <p className="text-center text-muted-foreground">Nenhum dado de exposição encontrado.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ left: 10 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 25) + (value.length > 25 ? '...' : '')}
          className="text-sm"
        />
        <XAxis dataKey="views" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar dataKey="views" fill="var(--color-views)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}


    