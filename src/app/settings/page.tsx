
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

export default function SettingsPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportType, setExportType] = useState<BackupType>('content');
  const [importType, setImportType] = useState<BackupType>('content');

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

          // Recarregar a página para refletir as mudanças
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

  return (
      <main className="flex-1 p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Configurações</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Backup</CardTitle>
              <CardDescription>
                Faça o download de um backup de seus dados em um arquivo JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Select value={exportType} onValueChange={(v) => setExportType(v as BackupType)}>
                  <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Selecione o tipo de backup" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="content">Conteúdo (Mídias e Playlists)</SelectItem>
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
                        <Label htmlFor="r1">Conteúdo (Mídias e Playlists)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="visualization" id="r2" />
                        <Label htmlFor="r2">Dados de Visualização</Label>
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
      </main>
  );
}
