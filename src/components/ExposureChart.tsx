
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Loader2 } from 'lucide-react';

interface ExposureData {
  [mediaId: string]: number;
}

interface Device {
    id: string;
    name: string;
    playlistId: string;
}

interface PlaylistItem {
    mediaId: string;
    duration: number;
}
interface Playlist {
    id: string;
    name: string;
    items: PlaylistItem[];
}

interface ChartDataPoint {
  name: string;
  views: number;
}

export default function ExposureChart() {
  const [exposureData, setExposureData] = useState<ExposureData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setError(null);
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
        setDevices(dataJson.devices || []);
        setPlaylists(dataJson.playlists || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
        }
      }
    };
    
    fetchData(true); // Carga inicial
    
    const interval = setInterval(() => {
      fetchData(); // Atualizações periódicas
    }, 15000); // Atualiza a cada 15 segundos

    return () => clearInterval(interval); // Limpa o intervalo quando o componente é desmontado
  }, []);

  const chartData = useMemo(() => {
    if (!exposureData || !devices.length || !playlists.length) return [];
    
    const data: ChartDataPoint[] = devices.map(device => {
        const playlist = playlists.find(p => p.id === device.playlistId);
        let totalViews = 0;
        
        if (playlist && playlist.items) {
            totalViews = playlist.items.reduce((acc, item) => {
                const views = exposureData[item.mediaId] || 0;
                return acc + (Array.isArray(views) ? views.length : Number(views) || 0);
            }, 0);
        }

        return {
          name: device.name,
          views: totalViews,
        };
      })
      .sort((a, b) => b.views - a.views); // Sort by views descending
      
      return data;

  }, [exposureData, devices, playlists]);

  const chartConfig = {
    views: {
      label: 'Visualizações',
      color: 'hsl(var(--primary))',
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
        margin={{ left: 10, right: 10 }}
        barCategoryGap="20%"
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
          content={<ChartTooltipContent indicator="line" labelKey='views'/>}
        />
        <Bar dataKey="views" fill="var(--color-views)" radius={4} barSize={20} />
      </BarChart>
    </ChartContainer>
  );
}
