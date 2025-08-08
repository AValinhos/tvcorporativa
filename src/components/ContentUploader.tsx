
'use client'

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Link, Type, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

type ContentType = 'image_video' | 'iframe' | 'text';

interface ContentUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onContentSaved: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};


export default function ContentUploader({ onContentSaved, className }: ContentUploaderProps) {
  const [activeTab, setActiveTab] = useState<ContentType>('image_video');
  const [contentName, setContentName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [iframeUrl, setIframeUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textSubContent, setTextSubContent] = useState('');
  const [textBgColor, setTextBgColor] = useState('#228B22');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setContentName('');
    setFile(null);
    setIframeUrl('');
    setTextContent('');
    setTextSubContent('');
    setTextBgColor('#228B22');
    const fileInput = document.getElementById('media-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSaveContent = async () => {
    if (!contentName) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do conteúdo é obrigatório.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const newId = String(Date.now());
      const newMediaItem: any = {
        id: newId,
        name: contentName,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      };

      switch (activeTab) {
        case 'image_video':
          if (!file) {
            toast({ variant: "destructive", title: "Erro", description: "Nenhum arquivo de mídia selecionado." });
            setIsLoading(false);
            return;
          }
          newMediaItem.type = file.type;
          newMediaItem.src = await fileToBase64(file);
          newMediaItem.dataAiHint = "user uploaded";
          break;
        case 'iframe':
           if (!iframeUrl) {
            toast({ variant: "destructive", title: "Erro", description: "A URL do Iframe é obrigatória." });
            setIsLoading(false);
            return;
          }
          newMediaItem.type = 'Iframe';
          newMediaItem.src = iframeUrl;
          break;
        case 'text':
           if (!textContent) {
            toast({ variant: "destructive", title: "Erro", description: "O conteúdo do texto é obrigatório." });
            setIsLoading(false);
            return;
          }
          newMediaItem.type = 'Text';
          newMediaItem.content = textContent;
          newMediaItem.subContent = textSubContent;
          newMediaItem.bgColor = textBgColor;
          break;
      }
      
      const updateRes = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'CREATE_MEDIA', payload: newMediaItem }),
      });

      if (!updateRes.ok) {
        throw new Error('Falha ao salvar conteúdo');
      }

      toast({
        title: "Sucesso!",
        description: "Seu conteúdo foi salvo e adicionado à biblioteca.",
      });
      resetForm();
      onContentSaved(); // Notify parent to refresh data

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Falha ao Salvar",
        description: error.message || "Ocorreu um erro ao salvar seu conteúdo.",
      })
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Uploader de Conteúdo</CardTitle>
        <CardDescription>Adicione novas mídias, iframes ou texto à sua biblioteca.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="image_video"><Upload className="mr-2 h-4 w-4" />Mídia</TabsTrigger>
            <TabsTrigger value="iframe"><Link className="mr-2 h-4 w-4" />Iframe</TabsTrigger>
            <TabsTrigger value="text"><Type className="mr-2 h-4 w-4" />Texto</TabsTrigger>
          </TabsList>
          <div className="pt-6">
            <div className="grid gap-2 mb-4">
              <Label htmlFor="content-name">Nome do Conteúdo</Label>
              <Input 
                id="content-name" 
                placeholder="Ex: 'Vídeo de Boas-vindas' ou 'Dashboard Semanal'" 
                value={contentName}
                onChange={(e) => setContentName(e.target.value)}
              />
            </div>
            <TabsContent value="image_video">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="media-file">Arquivo de Mídia</Label>
                    <Input 
                      id="media-file" 
                      type="file" 
                      accept="image/*,video/*"
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    />
                    <p className="text-sm text-muted-foreground">Envie arquivos de imagem (JPG, PNG, GIF, etc.) ou vídeo (MP4, WebM, etc.).</p>
                </div>
            </TabsContent>
            <TabsContent value="iframe">
              <div className="grid gap-2">
                <Label htmlFor="iframe-url">URL do Iframe</Label>
                <Input 
                  id="iframe-url" 
                  placeholder="https://example.com/dashboard" 
                  value={iframeUrl}
                  onChange={(e) => setIframeUrl(e.target.value)}
                />
              </div>
            </TabsContent>
            <TabsContent value="text">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="text-content">Conteúdo do Texto</Label>
                  <Textarea 
                    id="text-content" 
                    placeholder="Digite seu anúncio ou mensagem principal aqui." 
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                </div>
                 <div className="grid gap-2">
                  <Label htmlFor="text-subcontent">Subconteúdo</Label>
                  <Textarea 
                    id="text-subcontent" 
                    placeholder="Digite o texto secundário (opcional)." 
                    value={textSubContent}
                    onChange={(e) => setTextSubContent(e.target.value)}
                    rows={2}
                  />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="text-bgcolor">Cor de Fundo</Label>
                    <Input 
                      id="text-bgcolor" 
                      type="color" 
                      value={textBgColor} 
                      onChange={(e) => setTextBgColor(e.target.value)} 
                      className="p-1 h-8 w-24"
                    />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button onClick={handleSaveContent} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Salvando...' : 'Salvar Conteúdo'}
        </Button>
      </CardFooter>
    </Card>
  );
}
