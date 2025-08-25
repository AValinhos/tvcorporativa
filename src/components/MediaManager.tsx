
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileUp, Loader2, Edit, Trash2, Link, Upload, RefreshCw, Search, ArrowUpDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { MediaItem } from '@/app/page';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface MediaManagerProps {
  mediaItems: MediaItem[];
  onMediaUpdate: () => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

type SortKey = 'name' | 'type' | 'date';
type SortDirection = 'asc' | 'desc';


export default function MediaManager({ mediaItems, onMediaUpdate, isLoading, searchQuery, setSearchQuery }: MediaManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  
  // State for edited fields
  const [editedName, setEditedName] = useState('');
  const [editedSrc, setEditedSrc] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedSubContent, setEditedSubContent] = useState('');
  const [editedBgColor, setEditedBgColor] = useState('#228B22');

  // Footer state
  const [showFooter, setShowFooter] = useState(false);
  const [footerText1, setFooterText1] = useState('');
  const [footerText2, setFooterText2] = useState('');
  const [footerBgColor, setFooterBgColor] = useState('#dc2626');
  const [footerImageSrc, setFooterImageSrc] = useState('');

  // Iframe specific state
  const [iframeNoReload, setIframeNoReload] = useState(false);
  const [iframeReloadInterval, setIframeReloadInterval] = useState(0);


  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const ITEMS_PER_PAGE = 10;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const sortedItems = useMemo(() => {
    return [...mediaItems].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [mediaItems, sortKey, sortDirection]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter(item => {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(query);

        if (filterType === 'all') return nameMatch;
        if (filterType === 'image') return item.type.startsWith('image/') && nameMatch;
        if (filterType === 'video') return item.type.startsWith('video/') && nameMatch;
        if (filterType === 'iframe') return item.type === 'Iframe' && nameMatch;
        if (filterType === 'text') return item.type === 'Text' && nameMatch;
        return nameMatch;
    });
  }, [sortedItems, filterType, searchQuery]);
  
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, endIndex);
  }, [currentPage, filteredItems]);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setSelectedItems([]);
    setCurrentPage(1);
  }, [filterType, mediaItems, searchQuery]);
  
  const handleDelete = async (itemId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_MEDIA', payload: { id: itemId } }),
      });
      if (!res.ok) throw new Error('Falha ao deletar item');
      toast({ title: "Sucesso!", description: "Item de mídia deletado." });
      onMediaUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'BULK_DELETE_MEDIA', payload: { ids: selectedItems } }),
        });
        if (!res.ok) throw new Error('Falha ao deletar itens');
        toast({ title: "Sucesso!", description: `${selectedItems.length} itens de mídia deletados.` });
        setSelectedItems([]);
        onMediaUpdate();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
        setIsProcessing(false);
        setIsBulkDeleteDialogOpen(false);
    }
  };

  const handleEditClick = (item: MediaItem) => {
    setEditingItem(item);
    setEditedName(item.name);
    // General fields
    setEditedSrc(item.src || '');
    setEditedContent(item.content || '');
    setEditedSubContent(item.subContent || '');
    setEditedBgColor(item.bgColor || '#228B22');
    // Footer fields
    setShowFooter(item.showFooter || false);
    setFooterText1(item.footerText1 || '');
    setFooterText2(item.footerText2 || '');
    setFooterBgColor(item.footerBgColor || '#dc2626');
    setFooterImageSrc(item.footerImageSrc || '');
    // Iframe fields
    setIframeNoReload(item.iframeNoReload || false);
    setIframeReloadInterval(item.iframeReloadInterval || 0);

    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editedName.trim()) {
        toast({ variant: "destructive", title: "Erro", description: "O nome não pode ser vazio." });
        return;
    }
    setIsProcessing(true);

    const updates: Partial<MediaItem> = { 
        name: editedName,
        src: editedSrc,
        content: editedContent,
        subContent: editedSubContent,
        bgColor: editedBgColor,
        showFooter: showFooter,
        footerText1: footerText1,
        footerText2: footerText2,
        footerBgColor: footerBgColor,
        footerImageSrc: footerImageSrc,
        iframeNoReload: iframeNoReload,
        iframeReloadInterval: Number(iframeReloadInterval) || 0,
    };

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'UPDATE_MEDIA', 
            payload: { id: editingItem.id, updates } 
        }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar item');
      toast({ title: "Sucesso!", description: "Item de mídia atualizado." });
      onMediaUpdate();
      setIsEditDialogOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleFooterImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFooterImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getBadgeText = (type: string) => {
    if (type.startsWith('image/')) return 'Imagem';
    if (type.startsWith('video/')) return 'Vídeo';
    if (type === 'Iframe') return 'Iframe';
    if (type === 'Text') return 'Texto';
    return type;
  }
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedItems(paginatedItems.map(item => item.id));
    } else {
        setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
        setSelectedItems(prev => [...prev, id]);
    } else {
        setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchQuery(localSearchQuery);
  };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle>Biblioteca de Mídia</CardTitle>
                <CardDescription>Gerencie seu conteúdo enviado.</CardDescription>
            </div>
            <div className='flex items-center gap-2 flex-wrap'>
                <form className="flex-1 sm:flex-initial" onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <Input
                      type="search"
                      placeholder="Buscar conteúdo..."
                      className="pr-10 sm:w-[200px] md:w-[200px] lg:w-[300px]"
                      value={localSearchQuery}
                      onChange={(e) => setLocalSearchQuery(e.target.value)}
                    />
                    <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Buscar</span>
                    </Button>
                  </div>
                </form>
                {selectedItems.length > 0 && (
                     <Button 
                        size="sm" 
                        variant="destructive" 
                        className="gap-1" 
                        onClick={() => setIsBulkDeleteDialogOpen(true)}
                        disabled={isProcessing}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Deletar ({selectedItems.length})
                    </Button>
                )}
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Tipos</SelectItem>
                        <SelectItem value="image">Imagem</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="iframe">Iframe</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                    </SelectContent>
                </Select>
                 <Button size="sm" variant="outline" className="gap-1" disabled>
                    <FileUp className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Exportar
                    </span>
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && mediaItems.length === 0 ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                    <Checkbox
                        checked={selectedItems.length > 0 && selectedItems.length === paginatedItems.length && paginatedItems.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Selecionar todos"
                        disabled={paginatedItems.length === 0}
                    />
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('name')}>
                        Nome
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('type')}>
                        Tipo
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('date')}>
                        Data Adicionada
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow key={item.id} data-state={selectedItems.includes(item.id) && "selected"}>
                   <TableCell>
                        <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                            aria-label={`Selecionar ${item.name}`}
                        />
                   </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === 'Iframe' || item.type === 'Text' ? 'secondary' : 'outline'}>
                      {getBadgeText(item.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isProcessing}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Alternar menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                         <DropdownMenuItem onClick={() => handleEditClick(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Deletar
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Isso irá deletar permanentemente o item de mídia e removê-lo de todas as playlists.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90">
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Deletar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
           <strong>{selectedItems.length}</strong> de{" "}
           <strong>{filteredItems.length}</strong> item(s) selecionado(s).
        </div>
        {totalPages > 1 && (
            <div className="flex items-center space-x-2 ml-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Anterior
                </Button>
                 <span className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    Próxima
                </Button>
            </div>
        )}
      </CardFooter>
    </Card>

    <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso irá deletar permanentemente os {selectedItems.length} itens de mídia selecionados e removê-los de todas as playlists.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deletar Selecionados"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Editar Mídia</DialogTitle>
                <DialogDescription>
                    Altere os detalhes do seu item de mídia aqui. Clique em salvar quando terminar.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
                    <Input id="name" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="col-span-3" />
                </div>
                
                {editingItem?.type === 'Text' ? (
                  <>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="content" className="text-right pt-2">Conteúdo</Label>
                        <Textarea id="content" value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="subcontent" className="text-right pt-2">Subconteúdo</Label>
                        <Textarea id="subcontent" value={editedSubContent} onChange={(e) => setEditedSubContent(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="text-bgcolor-edit" className="text-right">Cor Fundo</Label>
                        <Input id="text-bgcolor-edit" type="color" value={editedBgColor} onChange={(e) => setEditedBgColor(e.target.value)} className="col-span-3 p-1 h-10"/>
                    </div>
                  </>
                ) : (
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="src" className="text-right pt-2">URL/Origem</Label>
                        <Textarea id="src" value={editedSrc} onChange={(e) => setEditedSrc(e.target.value)} className="col-span-3" />
                    </div>
                )}
                
                {editingItem?.type === 'Iframe' && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Não recarregar a cada ciclo</Label>
                            <DialogDescription>Ideal para dashboards ou conteúdo estático.</DialogDescription>
                        </div>
                        <Switch checked={iframeNoReload} onCheckedChange={setIframeNoReload} />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4 pt-2">
                        <Label htmlFor="iframe-reload" className="text-right col-span-2">Intervalo de atualização (minutos)</Label>
                        <Input id="iframe-reload" type="number" value={iframeReloadInterval || ''} onChange={(e) => setIframeReloadInterval(parseInt(e.target.value))} className="col-span-2" placeholder="0 para desativar"/>
                    </div>
                  </>
                )}


                <Separator className="my-4" />

                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Mostrar Rodapé</Label>
                            <DialogDescription>Ative para exibir um rodapé sobre este item.</DialogDescription>
                        </div>
                        <Switch checked={showFooter} onCheckedChange={setShowFooter} />
                    </div>

                    {showFooter && (
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="footer-text1" className="text-right">Texto 1</Label>
                                <Input id="footer-text1" value={footerText1} onChange={(e) => setFooterText1(e.target.value)} className="col-span-3" placeholder="Ex: URGENTE"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="footer-text2" className="text-right">Texto 2</Label>
                                <Input id="footer-text2" value={footerText2} onChange={(e) => setFooterText2(e.target.value)} className="col-span-3" placeholder="Ex: NOTÍCIA DE ÚLTIMA HORA"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="footer-bgcolor" className="text-right">Cor de Fundo</Label>
                                <Input id="footer-bgcolor" type="color" value={footerBgColor} onChange={(e) => setFooterBgColor(e.target.value)} className="col-span-3 p-1 h-10"/>
                            </div>
                            
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="footer-image-tabs" className="text-right pt-2">Imagem</Label>
                                <Tabs defaultValue="url" className="col-span-3">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="url"><Link className="mr-2 h-4 w-4"/>URL</TabsTrigger>
                                        <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4"/>Upload</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="url" className='pt-2'>
                                        <Input id="footer-image" value={footerImageSrc} onChange={(e) => setFooterImageSrc(e.target.value)} placeholder="https://example.com/logo.png"/>
                                    </TabsContent>
                                    <TabsContent value="upload" className='pt-2'>
                                        <Input id="footer-image-file" type="file" accept="image/*" onChange={handleFooterImageFileChange} />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    )}
                </div>

            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSaveEdit} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar alterações"}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
