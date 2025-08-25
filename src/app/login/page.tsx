
'use client';

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tv, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login();
        router.push('/');
      } else {
        toast({
          variant: "destructive",
          title: "Falha no Login",
          description: data.message || "Usuário ou senha inválidos.",
        });
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor. Tente novamente.",
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <div className="rounded-lg bg-primary p-3 text-primary-foreground">
                    <Tv className="h-8 w-8" />
                </div>
            </div>
          <CardTitle className="text-2xl">Login do Admin</CardTitle>
          <CardDescription>
            Entre com suas credenciais para gerenciar o conteúdo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="user">Usuário</Label>
                <Input
                  id="user"
                  type="text"
                  placeholder="admin"
                  required
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Senha</Label>
                  <a href="#" className="ml-auto inline-block text-sm underline">
                    Esqueceu sua senha?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Login com Single Sign-On
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
