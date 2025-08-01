
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
import { Tv } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import data from '@/lib/data.json';
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = data.users.find(u => u.user === user && u.password === password);

    if (foundUser) {
      login();
      router.push('/');
    } else {
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: "Usuário ou senha inválidos.",
      })
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
                />
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
              <Button variant="outline" className="w-full">
                Login com Single Sign-On
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
