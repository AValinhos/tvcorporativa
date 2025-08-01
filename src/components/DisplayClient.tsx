
'use client'

import * as React from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Loader2 } from 'lucide-react'

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
}

interface PlaylistItemData {
  mediaId: string;
  duration: number;
}

interface Playlist {
  id: string;
  name: string;
  items: (MediaItem & { duration: number })[];
}

const getPlaylistById = (id: string, allData: { mediaItems: MediaItem[], playlists: { id: string, name: string, items: PlaylistItemData[] }[] }): Playlist | null => {
  const playlistData = allData.playlists.find(p => p.id === id);
  if (!playlistData) return null;

  const items = playlistData.items.map(item => {
    const media = allData.mediaItems.find(m => m.id === item.mediaId);
    if (!media) return null;
    return {
      ...media,
      duration: item.duration,
    }
  }).filter((item): item is MediaItem & { duration: number } => item !== null);

  return { ...playlistData, items };
}

const trackExposure = async (mediaId?: string, mediaIds?: string[]) => {
    try {
        await fetch('/api/exposure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId, mediaIds }),
        });
    } catch (error) {
        console.error("Failed to track exposure:", error);
    }
};

const extractSrcFromIframe = (iframeString: string): string => {
    let urlString = iframeString;

    if (iframeString.includes('<iframe')) {
        const match = iframeString.match(/src="([^"]*)"/);
        if (match) {
            urlString = match[1];
        } else {
            return ''; // No src found in iframe tag
        }
    }

    try {
        const url = new URL(urlString);
        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
            // Parâmetros para uma experiência de TV corporativa
            url.searchParams.set('autoplay', '1');
            url.searchParams.set('mute', '1');
            url.searchParams.set('loop', '1');
            // A API de loop do YouTube requer que o ID do vídeo seja especificado na playlist
            const videoId = url.pathname.split('/').pop();
            if (videoId) {
                url.searchParams.set('playlist', videoId);
            }
            // Parâmetros para customização da interface
            url.searchParams.set('modestbranding', '1'); // Remove logo do YouTube
            url.searchParams.set('rel', '0'); // Não mostra vídeos relacionados
            url.searchParams.set('controls', '0'); // Oculta controles
            url.searchParams.set('disablekb', '1'); // Desativa teclado
            return url.toString();
        }
        if (url.hostname.includes('vimeo.com')) {
             url.searchParams.set('autoplay', '1');
             url.searchParams.set('muted', '1'); // Vimeo usa 'muted'
             url.searchParams.set('loop', '1');
             return url.toString();
        }
        return url.toString();
    } catch (error) {
        // Se a criação da URL falhar, pode não ser uma URL válida. Retorne o original.
        return urlString;
    }
};

const FooterImage: React.FC<{ src: string }> = ({ src }) => {
    const [error, setError] = React.useState(false);

    if (error || !src) {
        return <span className="text-white font-bold text-lg mr-[5%]">crash</span>;
    }

    return (
        <Image
            src={src}
            alt="Footer Image"
            width={80}
            height={80}
            className="object-contain h-20 w-20 mr-[5%]"
            onError={() => setError(true)}
        />
    );
};


export default function DisplayClient({ playlistId }: { playlistId: string }) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [playlist, setPlaylist] = React.useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Track exposure on initial load
  React.useEffect(() => {
    if (playlist && playlist.items.length > 0) {
      trackExposure(playlist.items[0].id); // Track first item
      
      const hourlyTimer = setInterval(() => {
        const allItemIds = playlist.items.map(item => item.id);
        trackExposure(undefined, allItemIds);
      }, 3600 * 1000); // 1 hour

      return () => clearInterval(hourlyTimer);
    }
  }, [playlist]);

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
        const foundPlaylist = getPlaylistById(playlistId, allData);
        setPlaylist(foundPlaylist);
      } catch (error) {
        console.error("Falha ao carregar playlist", error);
        setPlaylist(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAndSetPlaylist();
  }, [playlistId]);


  React.useEffect(() => {
    if (!api || !playlist || playlist.items.length === 0) {
      return
    }

    const onSelect = () => {
      const newIndex = api.selectedScrollSnap();
      setCurrent(newIndex);
      // Track exposure when slide changes
      trackExposure(playlist.items[newIndex].id);
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
  }, [api, current, playlist])

  if (isLoading) {
    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-primary-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p>Carregando playlist...</p>
        </div>
    );
  }

  if (!playlist) {
    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-destructive-foreground">
            <h1 className="text-3xl font-bold">Playlist não encontrada</h1>
            <p>A playlist com o ID '{playlistId}' não pôde ser carregada.</p>
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
    <Carousel setApi={setApi} className="w-full h-full" opts={{loop: true}}>
      <CarouselContent>
        {playlist.items.map((item, index) => (
          <CarouselItem key={`${item.id}-${index}`} className="relative">
            <Card className="h-screen w-screen border-0 rounded-none bg-black flex items-center justify-center">
              <CardContent className="flex items-center justify-center p-0 w-full h-full">
                {item.type.startsWith('image/') && item.type.includes('gif') && (
                    <img
                      src={item.src!}
                      alt={item.name}
                      className="object-contain w-full h-full"
                      data-ai-hint={item.dataAiHint}
                    />
                )}
                {item.type.startsWith('image/') && !item.type.includes('gif') &&(
                    <Image
                      src={item.src!}
                      alt={item.name}
                      width={1920}
                      height={1080}
                      className="object-contain w-full h-full"
                      data-ai-hint={item.dataAiHint}
                    />
                )}
                {item.type.startsWith('video/') && (
                  <video
                    src={item.src!}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    loop={playlist.items.length === 1}
                    playsInline
                    key={current === index ? item.src : undefined}
                  />
                )}
                {item.type === 'Iframe' && (
                  <iframe
                    src={extractSrcFromIframe(item.src!)}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture"
                    key={`${item.id}-${current === index}`}
                  />
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
                      transform: 'translateY(-50%)' // Move a tag para cima
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
