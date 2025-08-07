
'use client';

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Loader2 } from 'lucide-react';

interface ExposureData {
  [mediaId: string]: number;
}

interface Device {
  id: string;
  name: string;
}

interface PlaylistItem {
  mediaId: string;
  duration: number;
}
interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  deviceIds?: string[];
}

interface DeviceView {
    id: string;
    name: string;
    views: number;
}


const ExposureChart = forwardRef((props, ref) => {
  const [exposureData, setExposureData] = useState<ExposureData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    };
  
  // Expose the fetchData function to the parent component via ref
  useImperativeHandle(ref, () => ({
    fetchData
  }));


  useEffect(() => {
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!exposureData || !devices.length || !playlists.length) return [];

    const deviceViewsMap = new Map<string, DeviceView>();

    // Initialize the map with all devices
    devices.forEach(d => {
        deviceViewsMap.set(d.id, { id: d.id, name: d.name, views: 0 });
    });

    // Iterate over playlists to aggregate views
    playlists.forEach(playlist => {
        const playlistTotalViews = playlist.items.reduce((acc, item) => {
            const views = exposureData[item.mediaId] || 0;
            return acc + (Number(views) || 0);
        }, 0);
        
        // This handles both the old `playlistId` on device and the new `deviceIds` on playlist
        const associatedDeviceIds = new Set<string>();
        if (playlist.deviceIds) {
            playlist.deviceIds.forEach(id => associatedDeviceIds.add(id));
        }
        devices.forEach(device => {
            if (device.playlistId === playlist.id) {
                associatedDeviceIds.add(device.id);
            }
        });


        associatedDeviceIds.forEach(deviceId => {
            const device = deviceViewsMap.get(deviceId);
            if (device) {
                device.views += playlistTotalViews;
            }
        });
    });
    
    const data = Array.from(deviceViewsMap.values()).sort((a,b) => b.views - a.views);

    return data;
  }, [exposureData, devices, playlists]);

  const chartConfig = {
    views: {
      label: 'Visualizações',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

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
        Nenhum dado de exposição encontrado ou a coleta está desabilitada.
      </p>
    );
  }
  
  const chartHeight = Math.max(200, chartData.length * 60);

  return (
    <div style={{ height: `${chartHeight}px`, minHeight: '200px' }}>
        <ChartContainer config={chartConfig} className="w-full h-full">
            <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                barCategoryGap="20%"
            >
                <XAxis type="number" hide />
                <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={120}
                tickFormatter={(value) => value.slice(0, 15) + (value.length > 15 ? '...' : '')}
                />
                <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<ChartTooltipContent indicator="line" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="views" radius={4} fill="var(--color-views)" barSize={32} />
            </BarChart>
        </ChartContainer>
    </div>
  );
});

ExposureChart.displayName = 'ExposureChart';

export default ExposureChart;
