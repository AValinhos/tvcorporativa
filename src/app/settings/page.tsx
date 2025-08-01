
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Upload } from 'lucide-react';
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

export default function SettingsPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) {
        throw new Error('Falha ao exportar os dados.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Exportação Concluída',
        description: 'O arquivo data.json foi baixado com sucesso.',
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
                Faça o download de um backup completo de seus dados (mídias, playlists, etc.) em um arquivo JSON.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                Importe um arquivo de backup JSON para restaurar seus dados. Atenção: isso substituirá todos os dados existentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        Esta ação substituirá permanentemente todos os dados atuais (mídias, playlists, etc.) pelos dados do arquivo de backup. Essa operação não pode ser desfeita.
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
