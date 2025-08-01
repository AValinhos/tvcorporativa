
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Upload, PlusCircle, MoreVertical, Edit, Trash2, ShieldX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AnalyticsChart from '@/components/AnalyticsChart';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"

type BackupType = 'content' | 'visualization';

interface Device {
    id: string;
    name: string;
    playlistId: string;
}

interface Playlist {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportType, setExportType] = useState<BackupType>('content');
  const [importType, setImportType] = useState<BackupType>('content');
  
  // Device Management State
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [isProcessingDevice, setIsProcessingDevice] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [devicePlaylistId, setDevicePlaylistId] = useState('');
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);


  const fetchPageData = async () => {
    setIsLoading(true);
    try {
        // Only fetching device and playlist data now.
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_DASHBOARD_DATA' }),
        });
        if (!res.ok) throw new Error('Falha ao buscar dados');
        const data = await res.json();
        setDevices(data.devices || []);
        setPlaylists(data.playlists || []);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/backup?type=${exportType}`);
      if (!response.ok) {
        throw new Error('Falha ao exportar os dados.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}-backup.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Exportação Concluída',
        description: `O arquivo ${exportType}-backup.json foi baixado.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Exportação',
        description: error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else {
      toast({
        variant: 'destructive',
        title: 'Arquivo Inválido',
        description: 'Por favor, selecione um arquivo .json.',
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    if (selectedFile) {
      setIsAlertDialogOpen(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Nenhum Arquivo Selecionado',
        description: 'Por favor, selecione um arquivo para importar.',
      });
    }
  };
  
  const handleConfirmImport = async () => {
      if (!selectedFile) return;

      setIsImporting(true);
      setIsAlertDialogOpen(false);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);


      try {
          const response = await fetch('/api/backup', {
              method: 'POST',
              body: formData,
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Falha ao importar os dados.');
          }
          
          toast({
              title: 'Importação Concluída',
              description: 'Dados importados com sucesso. A página será recarregada.',
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);


      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Erro na Importação',
              description: error.message,
          });
      } finally {
          setIsImporting(false);
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
      }
  };

    const handleClearVisualizationData = async () => {
        setIsClearingData(true);
        try {
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CLEAR_VISUALIZATION_DATA' }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao limpar os dados.');
            }
            toast({
                title: 'Sucesso!',
                description: 'Os dados de visualização foram limpos. A página será recarregada.',
            });
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message,
            });
        } finally {
            setIsClearingData(false);
            setIsClearDataDialogOpen(false);
        }
    };


  const handleOpenDeviceDialog = (device: Device | null) => {
    setEditingDevice(device);
    setDeviceName(device?.name || '');
    setDevicePlaylistId(device?.playlistId || '');
    setIsDeviceDialogOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!deviceName || !devicePlaylistId) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Nome do dispositivo e playlist são obrigatórios.' });
        return;
    }

    setIsProcessingDevice(true);
    const action = editingDevice ? 'UPDATE_DEVICE' : 'CREATE_DEVICE';
    const payload = editingDevice 
        ? { id: editingDevice.id, updates: { name: deviceName, playlistId: devicePlaylistId } }
        : { name: deviceName, playlistId: devicePlaylistId };
    
    try {
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload }),
        });
        if (!res.ok) throw new Error(`Falha ao ${editingDevice ? 'atualizar' : 'criar'} dispositivo`);
        toast({ title: 'Sucesso', description: `Dispositivo ${editingDevice ? 'atualizado' : 'criado'}.` });
        fetchPageData();
        setIsDeviceDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
        setIsProcessingDevice(false);
    }
  };
  
  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    setIsProcessingDevice(true);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_DEVICE', payload: { id: deviceToDelete.id } }),
      });
      toast({ title: 'Sucesso', description: 'Dispositivo deletado.' });
      fetchPageData();
      setDeviceToDelete(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsProcessingDevice(false);
    }
  }

  return (
      <main className="flex-1 p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Configurações</h1>

        <div className="grid gap-6 mb-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gerenciamento de Dispositivos (Telas)</CardTitle>
                            <CardDescription>Crie e gerencie os dispositivos onde suas playlists serão exibidas.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDeviceDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Dispositivo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                     ): (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome do Dispositivo</TableHead>
                                    <TableHead>Playlist Associada</TableHead>
                                    <TableHead>URL de Exibição</TableHead>
                                    <TableHead><span className="sr-only">Ações</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.map(device => (
                                    <TableRow key={device.id}>
                                        <TableCell className="font-medium">{device.name}</TableCell>
                                        <TableCell>{playlists.find(p => p.id === device.playlistId)?.name || 'Nenhuma'}</TableCell>
                                        <TableCell>
                                            <a href={`/display/${device.id}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                                /display/{device.id}
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => handleOpenDeviceDialog(device)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onSelect={() => setDeviceToDelete(device)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Deletar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     )}
                </CardContent>
            </Card>
        </div>


        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Backup</CardTitle>
              <CardDescription>
                Faça o download de um backup de seus dados em um arquivo JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Select value={exportType} onValueChange={(v) => setExportType(v as BackupType)}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                      <SelectValue placeholder="Selecione o tipo de backup" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="content">Conteúdo (Mídias, Playlists, Dispositivos)</SelectItem>
                      <SelectItem value="visualization">Dados de Visualização</SelectItem>
                  </SelectContent>
              </Select>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isExporting ? 'Exportando...' : 'Exportar Dados'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Importar Backup</CardTitle>
              <CardDescription>
                Importe um arquivo de backup JSON para restaurar seus dados. Atenção: isso substituirá os dados existentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Tipo de Backup a Importar</Label>
                <RadioGroup defaultValue="content" value={importType} onValueChange={(v) => setImportType(v as BackupType)}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="content" id="r1" />
                        <Label htmlFor="r1">Conteúdo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="visualization" id="r2" />
                        <Label htmlFor="r2">Visualização</Label>
                    </div>
                </RadioGroup>
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="backup-file">Arquivo de Backup (.json)</Label>
                <Input id="backup-file" type="file" accept=".json" onChange={handleFileChange} ref={fileInputRef} />
              </div>
              <Button onClick={handleImportClick} disabled={isImporting || !selectedFile}>
                 {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                 {isImporting ? 'Importando...' : 'Importar Dados'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mb-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Dados</CardTitle>
                    <CardDescription>Ações perigosas relacionadas aos dados da aplicação.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={() => setIsClearDataDialogOpen(true)}>
                        <ShieldX className="mr-2 h-4 w-4" /> Limpar Dados de Visualização
                    </Button>
                     <p className="text-sm text-muted-foreground mt-2">
                        Isso irá apagar permanentemente todos os dados de analytics e de exposição de mídia. Use com cuidado.
                    </p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6">
            <AnalyticsChart />
        </div>

        <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="device-name">Nome do Dispositivo</Label>
                        <Input id="device-name" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Ex: TV da Recepção"/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="device-playlist">Playlist</Label>
                        <Select value={devicePlaylistId} onValueChange={setDevicePlaylistId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma playlist" />
                            </SelectTrigger>
                            <SelectContent>
                                {playlists.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSaveDevice} disabled={isProcessingDevice}>
                        {isProcessingDevice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação substituirá permanentemente os dados de {importType === 'content' ? 'Conteúdo' : 'Visualização'} pelos dados do arquivo. Essa operação não pode ser desfeita.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmImport}>
                        Confirmar Importação
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Limpeza de Dados?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Todos os dados de analytics e exposição de mídia serão apagados permanentemente. Tem certeza de que deseja continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearVisualizationData} disabled={isClearingData} className="bg-destructive hover:bg-destructive/90">
                       {isClearingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4"/>}
                       Limpar Dados
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deviceToDelete} onOpenChange={(open) => !open && setDeviceToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O dispositivo "{deviceToDelete?.name}" será removido permanentemente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeviceToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteDevice} disabled={isProcessingDevice} className="bg-destructive hover:bg-destructive/90">
                       {isProcessingDevice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deletar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
  );
}
