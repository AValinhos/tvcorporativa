
'use client';

import { useEffect, useState, useMemo } from 'react';
import ContentUploader from '@/components/ContentUploader';
import MediaManager from '@/components/MediaManager';
import PlaylistManager from '@/components/PlaylistManager';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, Tv, Clapperboard, ListMusic, PlayCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Header from '@/components/Header';


export interface MediaItem {
  id: string;
  name: string;
  type: string;
  src?: string;
  content?: string;
  subContent?: string;
  bgColor?: string;
  dataAiHint?: string;
  date: string;
  showFooter?: boolean;
  footerText1?: string;
  footerText2?: string;
  footerBgColor?: string;
  footerImageSrc?: string;
}

export interface PlaylistItemData {
  mediaId: string;
  duration: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItemData[];
}

export interface AnalyticsDataPoint {
    date: string;
    [key: string]: any; 
}


export default function Dashboard() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[] | null>(null);
  const [exposureData, setExposureData] = useState<{ [key: string]: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      if (!isLoading) setIsLoading(true);
      
      const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_DASHBOARD_DATA' }),
      });

      if (!res.ok) throw new Error('Falha ao buscar dados do painel');
      
      const data = await res.json();
      
      setMediaItems(data.mediaItems || []);
      setPlaylists(data.playlists || []);
      
      const sortedAnalytics = (data.analyticsData || []).sort((a: AnalyticsDataPoint, b: AnalyticsDataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAnalyticsData(sortedAnalytics);
      
      setExposureData(data.exposureData || null);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const filteredMediaItems = useMemo(() => {
    if (!searchQuery) return mediaItems;
    return mediaItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [mediaItems, searchQuery]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) return playlists;
    return playlists.filter(playlist => playlist.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [playlists, searchQuery]);

  const exposureByPlaylist = useMemo(() => {
    if (!playlists || !exposureData || !mediaItems) return [];
    return playlists.map(playlist => {
      let exposedItemsCount = 0;
      let totalViews = 0;

      playlist.items.forEach(item => {
        const views = exposureData[item.mediaId] || 0;
        if (views > 0) {
          exposedItemsCount++;
        }
        totalViews += views;
      });
      return {
        id: playlist.id,
        name: playlist.name,
        exposedItemsCount,
        totalItems: playlist.items.length,
        totalViews,
      };
    });
  }, [playlists, exposureData, mediaItems]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Telas Totais</CardTitle>
              <Tv className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : playlists.length}</div>
              <p className="text-xs text-muted-foreground">Cada playlist representa uma tela.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens de Mídia</CardTitle>
              <Clapperboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : mediaItems.length}</div>
              <p className="text-xs text-muted-foreground">Total de itens na biblioteca.</p>
            </CardContent>
          </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Playlists</CardTitle>
              <ListMusic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : playlists.length}</div>
              <p className="text-xs text-muted-foreground">Total de playlists criadas.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exposição por Playlist</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 flex items-center justify-center">
                {isLoading ? (
                  <div className="h-24 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                <Carousel className="w-full max-w-xs" opts={{ loop: true }}>
                  <CarouselContent>
                    {exposureByPlaylist.map((p, index) => (
                      <CarouselItem key={index}>
                          <div className="p-1">
                            <div className="p-4 flex flex-col items-center justify-center">
                                <h3 className="text-base font-semibold">{p.name}</h3>
                                <div className="flex items-center justify-center w-full gap-2 mt-1">
                                    <p className="text-xs text-muted-foreground">
                                      {p.exposedItemsCount} de {p.totalItems} itens expostos.
                                    </p>
                                    <Link href={`/display/${p.id}`} title="Ver Tela ao Vivo" target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="h-5 w-5 text-primary hover:text-primary/80" />
                                    </Link>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 font-semibold text-center truncate w-full" title={`${p.totalViews} visualizações`}>
                                  Total de Visualizações: {p.totalViews}
                                </p>
                            </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2" />
                  <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2" />
                </Carousel>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-5">
            <ContentUploader onContentSaved={fetchData} className="lg:col-span-2" />
            <PlaylistManager 
              className="lg:col-span-3"
              mediaItems={mediaItems} 
              playlists={filteredPlaylists} 
              onPlaylistUpdate={fetchData}
              isLoading={isLoading}
            />
        </div>

        <div className="grid gap-4 md:gap-8 lg:grid-cols-1">
            <MediaManager mediaItems={filteredMediaItems} onMediaUpdate={fetchData} isLoading={isLoading}/>
        </div>
        
      </main>
      </div>
  );
}
