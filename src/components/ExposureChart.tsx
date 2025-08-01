'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
    }, 60000); // Atualiza a cada 60 segundos

    return () => clearInterval(interval); // Limpa o intervalo quando o componente é desmontado
  }, []);

  const chartData = useMemo(() => {
    if (!exposureData || !devices.length || !playlists.length) return [];

    const data: ChartDataPoint[] = devices
      .map((device) => {
        const playlist = playlists.find((p) => p.id === device.playlistId);
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
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Erro: {error}</div>;
  }

  if (chartData.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        Nenhum dado de exposição encontrado.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="w-full min-h-[300px]">
      <LineChart accessibilityLayer data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 15) + (value.length > 15 ? '...' : '')}
        />
        <YAxis />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Legend content={<ChartLegendContent />} />
        <Line
          dataKey="views"
          type="monotone"
          stroke="var(--color-views)"
          strokeWidth={2}
          dot={true}
        />
      </LineChart>
    </ChartContainer>
  );
}