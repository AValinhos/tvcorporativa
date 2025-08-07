
'use client'
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { PlusCircle, XCircle, GripVertical, Loader2, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { MediaItem, Playlist as PlaylistData, Device } from '@/app/page';
import { cn } from '@/lib/utils';


interface FullPlaylistItem {
  mediaId: string;
  duration: number;
  name: string; 
}

interface Playlist extends PlaylistData {
  items: FullPlaylistItem[];
  transition?: 'slide' | 'fade';
}

interface PlaylistManagerProps extends React.HTMLAttributes<HTMLDivElement> {
    mediaItems: MediaItem[];
    playlists: PlaylistData[];
    devices: Device[];
    onPlaylistUpdate: () => void;
    isLoading: boolean;
}

export default function PlaylistManager({ mediaItems, playlists, devices, onPlaylistUpdate, isLoading, className }: PlaylistManagerProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [currentPlaylists, setCurrentPlaylists] = useState<Playlist[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedPlaylistName, setEditedPlaylistName] = useState('');
  
  const [openDeviceSelector, setOpenDeviceSelector] = useState(false);


  const { toast } = useToast();
  
  useEffect(() => {
    if (!isLoading && playlists.length > 0) {
        const fullPlaylists = playlists.map(p => ({
            ...p,
            deviceIds: p.deviceIds || [],
            transition: p.transition || 'slide',
            items: p.items.map(item => {
                const media = mediaItems.find(m => m.id === item.mediaId);
                return {
                    ...item,
                    name: media ? media.name : 'Mídia Desconhecida'
                };
            })
        }));
        setCurrentPlaylists(fullPlaylists);
      
      if ((!selectedPlaylistId || !fullPlaylists.find(p => p.id === selectedPlaylistId)) && fullPlaylists.length > 0) {
          setSelectedPlaylistId(fullPlaylists[0].id);
      } else if (playlists.length === 0) {
        setSelectedPlaylistId('');
      }
    } else if (!isLoading && playlists.length === 0) {
      setCurrentPlaylists([]);
      setSelectedPlaylistId('');
    }
  }, [playlists, mediaItems, isLoading, selectedPlaylistId]);

  const selectedPlaylist = currentPlaylists.find(p => p.id === selectedPlaylistId);

  useEffect(() => {
    if(selectedPlaylist){
        setEditedPlaylistName(selectedPlaylist.name);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    if (selectedPlaylistId && playlists.length > 0 && !playlists.find(p => p.id === selectedPlaylistId)) {
      setSelectedPlaylistId(playlists[0]?.id || '');
    }
  }, [playlists, selectedPlaylistId]);

  const handleAddToPlaylist = (mediaId: string) => {
    if (!selectedPlaylist) return;

    const media = mediaItems.find(m => m.id === mediaId);
    if (!media) return;

    const newPlaylistItem: FullPlaylistItem = { mediaId, duration: 10, name: media.name };
    const updatedPlaylist = { ...selectedPlaylist, items: [...selectedPlaylist.items, newPlaylistItem] };
    updatePlaylistInState(updatedPlaylist);
  };

  const handleRemoveFromPlaylist = (index: number) => {
    if (!selectedPlaylist) return;
    const updatedItems = selectedPlaylist.items.filter((_, i) => i !== index);
    const updatedPlaylist = { ...selectedPlaylist, items: updatedItems };
    updatePlaylistInState(updatedPlaylist);
  };

  const handleDurationChange = (index: number, newDuration: number) => {
    if (!selectedPlaylist) return;
    const updatedItems = [...selectedPlaylist.items];
    updatedItems[index].duration = newDuration > 0 ? newDuration : 1;
    const updatedPlaylist = { ...selectedPlaylist, items: updatedItems };
    updatePlaylistInState(updatedPlaylist);
  };
  
  const handleDeviceSelection = (deviceId: string) => {
    if (!selectedPlaylistId) return;
    
    // Allows associating a device with multiple playlists
    const newPlaylists = currentPlaylists.map(playlist => {
        if (playlist.id === selectedPlaylistId) {
            const deviceIds = playlist.deviceIds || [];
            const newDeviceIds = deviceIds.includes(deviceId)
                ? deviceIds.filter(id => id !== deviceId) // Toggle: remove
                : [...deviceIds, deviceId]; // Toggle: add
            return { ...playlist, deviceIds: newDeviceIds };
        }
        return playlist;
    });

    setCurrentPlaylists(newPlaylists);
  };

  const handleTransitionChange = (value: 'slide' | 'fade') => {
    if (!selectedPlaylist) return;
    const updatedPlaylist = { ...selectedPlaylist, transition: value };
    updatePlaylistInState(updatedPlaylist);
  };


  const updatePlaylistInState = (updatedPlaylist: Playlist) => {
      const updatedPlaylists = currentPlaylists.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p);
      setCurrentPlaylists(updatedPlaylists);
  }

  const handleSaveChanges = async () => {
      if(!selectedPlaylist) return;
      setIsSaving(true);
      
      const playlistToSave = {
          ...selectedPlaylist,
          items: selectedPlaylist.items.map(({mediaId, duration}) => ({mediaId, duration}))
      };

      try {
          const res = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'UPDATE_PLAYLIST', payload: { id: selectedPlaylist.id, updates: playlistToSave } })
          });
          if (!res.ok) throw new Error('Falha ao salvar alterações');
          
          toast({ title: "Sucesso!", description: "Playlist salva com sucesso." });
          onPlaylistUpdate();
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar a playlist.' });
      } finally {
          setIsSaving(false);
      }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
        toast({ variant: 'destructive', title: 'Erro', description: 'O nome da playlist não pode ser vazio.' });
        return;
    }
    setIsProcessing(true);
    try {
        const newPlaylistPayload = { name: newPlaylistName, items: [], deviceIds: [], transition: 'slide' };
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'CREATE_PLAYLIST', payload: newPlaylistPayload })
        });
        if (!res.ok) throw new Error('Falha ao criar playlist');
        const result = await res.json();
        const createdPlaylist = result.data.playlists.find((p:PlaylistData) => p.name === newPlaylistName);
        toast({ title: "Sucesso!", description: "Playlist criada." });
        setNewPlaylistName('');
        setIsCreateDialogOpen(false);
        onPlaylistUpdate();
        if(createdPlaylist) {
            setSelectedPlaylistId(createdPlaylist.id);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleEditPlaylistName = async () => {
    if (!editedPlaylistName.trim() || !selectedPlaylist) {
        toast({ variant: 'destructive', title: 'Erro', description: 'O nome da playlist não pode ser vazio.' });
        return;
    }
    setIsProcessing(true);
    try {
        const updatedPlaylist = { ...selectedPlaylist, name: editedPlaylistName, items: selectedPlaylist.items.map(i => ({mediaId: i.mediaId, duration: i.duration})) };
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'UPDATE_PLAYLIST', payload: { id: selectedPlaylist.id, updates: updatedPlaylist } })
        });
        if (!res.ok) throw new Error('Falha ao atualizar playlist');
        toast({ title: "Sucesso!", description: "Nome da playlist atualizado." });
        onPlaylistUpdate();
        setIsEditDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  }
  
  const handleDeletePlaylist = async () => {
      if (!selectedPlaylist) return;
      setIsProcessing(true);
      try {
          const res = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'DELETE_PLAYLIST', payload: { id: selectedPlaylist.id } })
          });
          if (!res.ok) throw new Error('Falha ao deletar playlist');
          toast({ title: "Sucesso!", description: "Playlist deletada." });
          setSelectedPlaylistId(''); 
          onPlaylistUpdate();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Erro', description: error.message });
      } finally {
          setIsProcessing(false);
      }
  }


  if (isLoading) {
    return (
      <Card className={cn("flex items-center justify-center h-96", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const availableMedia = mediaItems.filter(
    media => !selectedPlaylist?.items.some(item => item.mediaId === media.id)
  ) || [];
  
  const devicesForSelectedPlaylist = selectedPlaylist?.deviceIds || [];

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Editor de Playlist</CardTitle>
        <CardDescription>
            Selecione uma playlist para editar seus conteúdos e associar a dispositivos.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId} disabled={playlists.length === 0}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Selecione uma playlist" />
                </SelectTrigger>
                <SelectContent>
                    {playlists.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Popover open={openDeviceSelector} onOpenChange={setOpenDeviceSelector}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDeviceSelector}
                        className="w-full sm:w-[280px] justify-between"
                        disabled={!selectedPlaylist}
                    >
                        <span className="flex-1 text-left">
                           {devicesForSelectedPlaylist.length > 0
                            ? `${devicesForSelectedPlaylist.length} dispositivo(s) selecionado(s)`
                            : "Associar a Dispositivos"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0">
                   <Command>
                       <CommandInput placeholder="Buscar dispositivo..." />
                       <CommandEmpty>Nenhum dispositivo encontrado.</CommandEmpty>
                       <CommandGroup>
                           {devices.map(device => (
                               <CommandItem
                                key={device.id}
                                onSelect={() => handleDeviceSelection(device.id)}
                               >
                                  <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        devicesForSelectedPlaylist.includes(device.id) ? "opacity-100" : "opacity-0"
                                    )}
                                   />
                                   {device.name}
                               </CommandItem>
                           ))}
                       </CommandGroup>
                   </Command>
                </PopoverContent>
            </Popover>

            <Select 
                value={selectedPlaylist?.transition || 'slide'} 
                onValueChange={(value: 'slide' | 'fade') => handleTransitionChange(value)}
                disabled={!selectedPlaylist}
            >
                <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Tipo de Transição" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                </SelectContent>
            </Select>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                    <Button>Criar Nova</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="playlist-name">Nome da Playlist</Label>
                        <Input id="playlist-name" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleCreatePlaylist} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={!selectedPlaylist}>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar Nome
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" /> Deletar Playlist
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Isso irá deletar permanentemente a playlist.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeletePlaylist} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deletar"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>

        </div>
        
        {selectedPlaylist && (
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <h3 className="text-sm font-medium mb-2">Mídias Disponíveis</h3>
                    <ScrollArea className="h-48 rounded-md border p-2">
                        {availableMedia.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                <span className="text-sm">{item.name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddToPlaylist(item.id)}>
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {availableMedia.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Todas as mídias já estão na playlist.</p>}
                    </ScrollArea>
                </div>
                <div>
                    <h3 className="text-sm font-medium mb-2">Itens da Playlist</h3>
                    <ScrollArea className="h-48 rounded-md border p-2">
                        {selectedPlaylist?.items.map((item, index) => (
                            <div key={`${item.mediaId}-${index}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted group">
                                <div className="flex items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab group-hover:opacity-100 opacity-0" />
                                    <span className="text-sm">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        value={item.duration} 
                                        onChange={(e) => handleDurationChange(index, parseInt(e.target.value))}
                                        className="w-16 h-8 text-sm" 
                                    />
                                    <span className="text-xs text-muted-foreground">seg</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFromPlaylist(index)}>
                                        <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {selectedPlaylist?.items.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Playlist vazia.</p>}
                    </ScrollArea>
                </div>
            </div>
        )}
      </CardContent>
       <CardFooter className="border-t px-6 py-4 flex items-center justify-between flex-wrap gap-2">
        <Button onClick={handleSaveChanges} disabled={isSaving || !selectedPlaylist}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar Playlist
        </Button>
        {devicesForSelectedPlaylist.length > 0 && selectedPlaylist && (
            <Link href={`/display/${devicesForSelectedPlaylist[0]}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                URL de Exibição: /display/{devicesForSelectedPlaylist[0]}
            </Link>
        )}
      </CardFooter>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Editar Nome da Playlist</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <Label htmlFor="playlist-name-edit">Nome da Playlist</Label>
                  <Input id="playlist-name-edit" value={editedPlaylistName} onChange={(e) => setEditedPlaylistName(e.target.value)} />
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                  <Button onClick={handleEditPlaylistName} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
