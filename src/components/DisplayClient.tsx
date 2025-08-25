
'use client'

import * as React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Loader2 } from 'lucide-react'
import Fade from 'embla-carousel-fade'
import { cn } from '@/lib/utils'


interface MediaItem {
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
  iframeNoReload?: boolean;
  iframeReloadInterval?: number;
}

interface PlaylistItemData {
  mediaId: string;
  duration: number;
}

interface Playlist {
  id: string;
  name: string;
  transition?: 'slide' | 'fade';
  items: (MediaItem & { duration: number })[];
}

interface Device {
    id: string;
    name: string;
    playlistId: string; 
}

interface AppSettings {
    enableAnalytics: boolean;
}

const getCombinedPlaylistForDevice = (deviceId: string, allData: { mediaItems: MediaItem[], playlists: { id: string, name: string, items: PlaylistItemData[], deviceIds?: string[], transition?: 'slide' | 'fade' }[], devices: Device[] }): Playlist | null => {
    const associatedPlaylists = allData.playlists.filter(p => p.deviceIds?.includes(deviceId));

    if (associatedPlaylists.length === 0) {
      const device = allData.devices.find(d => d.id === deviceId);
      if (!device || !device.playlistId) return null;
      const singlePlaylist = allData.playlists.find(p => p.id === device.playlistId);
      if (!singlePlaylist) return null;
      associatedPlaylists.push(singlePlaylist);
    }
    
    if (associatedPlaylists.length === 0) return null;

    const combinedItems: (MediaItem & { duration: number })[] = [];
    
    associatedPlaylists.forEach(playlistData => {
        const items = playlistData.items.map(item => {
            const media = allData.mediaItems.find(m => m.id === item.mediaId);
            if (!media) return null;
            return {
                ...media,
                duration: item.duration,
            }
        }).filter((item): item is MediaItem & { duration: number } => item !== null);

        combinedItems.push(...items);
    });

    const primaryTransition = associatedPlaylists.find(p => p.transition === 'fade') ? 'fade' : 'slide';


    return {
        id: `device-${deviceId}-combined`,
        name: `Combined Playlist for Device ${deviceId}`,
        transition: primaryTransition,
        items: combinedItems,
    };
}


const trackExposure = async (payload: { mediaId: string }) => {
    try {
        await fetch('/api/exposure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Failed to track exposure:", error);
    }
};

const updateAnalytics = async () => {
    try {
        await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("Failed to update analytics:", error);
    }
};

const extractSrcFromIframe = (iframeString: string): string => {
    let urlString = iframeString;

    if (iframeString.includes('<iframe')) {
        const match = iframeString.match(/src="([^"]*)"/);
        if (match) {
            urlString = match[1];
        } else {
            return ''; 
        }
    }

    try {
        const url = new URL(urlString);
        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
            url.searchParams.set('autoplay', '1');
            url.searchParams.set('mute', '1');
            url.searchParams.set('loop', '1');
            const videoId = url.pathname.split('/').pop();
            if (videoId) {
                url.searchParams.set('playlist', videoId);
            }
            url.searchParams.set('modestbranding', '1'); 
            url.searchParams.set('rel', '0'); 
            url.searchParams.set('controls', '0');
            url.searchParams.set('disablekb', '1'); 
            return url.toString();
        }
        if (url.hostname.includes('vimeo.com')) {
             url.searchParams.set('autoplay', '1');
             url.searchParams.set('muted', '1'); 
             url.searchParams.set('loop', '1');
             return url.toString();
        }
        return url.toString();
    } catch (error) {
        return urlString;
    }
};

const FooterImage: React.FC<{ src: string }> = ({ src }) => {
    const [error, setError] = React.useState(false);

    if (error || !src) {
        return <span className="text-white font-bold text-lg mr-[5%]">crash</span>;
    }

    // eslint-disable-next-line @next/next/no-img-element
    return (
        <img
            src={src}
            alt="Footer Image"
            width={80}
            height={80}
            className="object-contain h-20 w-20 mr-[5%]"
            onError={() => setError(true)}
        />
    );
};

const IframeRenderer: React.FC<{ item: MediaItem, isVisible: boolean }> = ({ item, isVisible }) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    React.useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isVisible && item.iframeReloadInterval && item.iframeReloadInterval > 0) {
            interval = setInterval(() => {
                if (iframeRef.current) {
                    iframeRef.current.src = iframeRef.current.src; // Reload iframe
                }
            }, item.iframeReloadInterval * 60 * 1000);
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isVisible, item.iframeReloadInterval]);

    const src = extractSrcFromIframe(item.src!);

    return (
        <iframe
            ref={iframeRef}
            src={src}
            // Use a dynamic key to force re-render only when `iframeNoReload` is false
            key={item.iframeNoReload ? item.id : `${item.id}-${isVisible}`}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
        />
    );
};


export default function DisplayClient({ deviceId }: { deviceId: string }) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [playlist, setPlaylist] = React.useState<Playlist | null>(null);
  const [appSettings, setAppSettings] = React.useState<AppSettings>({ enableAnalytics: true });
  const [isLoading, setIsLoading] = React.useState(true);

  const carouselPlugins = React.useRef([Fade()]);
  
  React.useEffect(() => {
    if (deviceId && appSettings.enableAnalytics) {
        updateAnalytics();
        const hourlyTimer = setInterval(() => {
             updateAnalytics();
        }, 3600 * 1000); // 1 hora
      
        return () => clearInterval(hourlyTimer);
    }
  }, [deviceId, appSettings.enableAnalytics]);

  React.useEffect(() => {
    const fetchAndSetPlaylist = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_DASHBOARD_DATA' }),
        });
        if (!res.ok) throw new Error('Falha ao buscar dados');
        const allData = await res.json();
        const foundPlaylist = getCombinedPlaylistForDevice(deviceId, allData);
        setPlaylist(foundPlaylist);
        setAppSettings(allData.settings || { enableAnalytics: true });
        
        if (allData.settings?.enableAnalytics && foundPlaylist && foundPlaylist.items.length > 0) {
            trackExposure({ mediaId: foundPlaylist.items[0].id });
        }
      } catch (error) {
        console.error("Falha ao carregar playlist", error);
        setPlaylist(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAndSetPlaylist();
  }, [deviceId]);


  React.useEffect(() => {
    if (!api || !playlist || playlist.items.length === 0) {
      return
    }

    const onSelect = () => {
      const newIndex = api.selectedScrollSnap();
      setCurrent(newIndex);
      // Rastreia a exposição de cada item individualmente na troca.
      if (appSettings.enableAnalytics) {
        trackExposure({ mediaId: playlist.items[newIndex].id });
      }
    }
    
    api.on("select", onSelect)
    
    const currentItem = playlist.items[current]
    const timer = setTimeout(() => {
      if (api.scrollSnapList().length > 0) {
         api.scrollNext()
      }
    }, currentItem.duration * 1000)

    return () => {
      clearTimeout(timer)
      if (api) {
        api.off("select", onSelect)
      }
    }
  }, [api, current, playlist, appSettings.enableAnalytics])

  if (isLoading) {
    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-primary-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p>Carregando dispositivo...</p>
        </div>
    );
  }

  if (!playlist) {
    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-destructive-foreground">
            <h1 className="text-3xl font-bold">Dispositivo não encontrado ou sem playlist</h1>
            <p>O dispositivo com ID '{deviceId}' não foi encontrado ou não está associado a uma playlist.</p>
        </div>
    );
  }
  
  if (playlist.items.length === 0) {
    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-primary-foreground">
            <h1 className="text-3xl font-bold">{playlist.name}</h1>
            <p>Esta playlist não contém itens para exibir.</p>
        </div>
    );
  }


  return (
    <Carousel 
        setApi={setApi} 
        className={cn("w-full h-full", playlist.transition === 'fade' && 'embla embla--fade')} 
        opts={{loop: true}}
        plugins={playlist.transition === 'fade' ? carouselPlugins.current : []}
    >
      <CarouselContent className="embla__container">
        {playlist.items.map((item, index) => (
          <CarouselItem key={`${item.id}-${index}`} className="relative embla__slide">
            <Card className="h-screen w-screen border-0 rounded-none bg-black flex items-center justify-center">
              <CardContent className="flex items-center justify-center p-0 w-full h-full">
                {item.type.startsWith('image/') && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.src!}
                      alt={item.name}
                      className="object-contain w-full h-full"
                      data-ai-hint={item.dataAiHint}
                    />
                )}
                {item.type.startsWith('video/') && (
                  <video
                    key={current === index ? item.id : undefined}
                    src={item.src!}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    loop={playlist.items.length === 1}
                    playsInline
                  />
                )}
                {item.type === 'Iframe' && (
                  <IframeRenderer item={item} isVisible={current === index} />
                )}
                {item.type === 'Text' && (
                   <div 
                     className="flex flex-col items-center justify-center text-center p-8 w-full h-full"
                     style={{ 
                       backgroundColor: item.bgColor,
                       backgroundImage: !item.bgColor ? 'linear-gradient(to bottom right, hsl(var(--primary)), #228B22)' : 'none'
                     }}
                   >
                     <h1 className="text-7xl font-bold text-primary-foreground drop-shadow-lg">
                       {item.content}
                     </h1>
                     <p className="mt-4 text-3xl text-primary-foreground/80 drop-shadow">
                        {item.subContent}
                     </p>
                   </div>
                )}
              </CardContent>
            </Card>
            {item.showFooter && (
              <div className="absolute bottom-0 left-0 right-0 h-28">
                <div
                    className="absolute top-0 left-[5%] px-4 py-2 rounded-md"
                    style={{ 
                      backgroundColor: item.footerBgColor || 'rgba(0, 0, 0, 0.8)',
                      transform: 'translateY(-50%)' 
                    }}
                >
                    <span className="font-bold uppercase text-xl text-white">
                        {item.footerText1}
                    </span>
                </div>
                <div 
                    className="absolute bottom-0 left-0 right-0 p-4 h-24 flex items-center justify-between" 
                    style={{ backgroundColor: item.footerBgColor || 'rgba(0, 0, 0, 0.8)' }}
                >
                    <h2 className="text-4xl lg:text-6xl font-extrabold uppercase tracking-tighter text-white ml-[5%]">
                        {item.footerText2}
                    </h2>
                     {item.footerImageSrc && (
                        <FooterImage src={item.footerImageSrc} />
                    )}
                </div>
              </div>
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
