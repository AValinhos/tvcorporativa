
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CircleUser, Menu, Tv } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  const navItems = [
    { href: '/', label: 'Painel' },
    { href: '/settings', label: 'Configurações' },
  ];


  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
          <Tv className="h-6 w-6 text-primary" />
          <span className="sr-only">Corporate TV</span>
        </Link>
        {navItems.map((item) => (
           <Link 
              key={item.href}
              href={item.href} 
              className={cn(
                "transition-colors hover:text-foreground",
                pathname === item.href ? "text-foreground font-bold" : "text-muted-foreground"
              )}
            >
            {item.label}
          </Link>
        ))}
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Alternar menu de navegação</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <Tv className="h-6 w-6 text-primary" />
              <span className="sr-only">Corporate TV</span>
            </Link>
             {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={cn(
                    "hover:text-foreground",
                    pathname === item.href ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 justify-end">
        <Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Alternar menu de usuário</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings"><DropdownMenuItem>Configurações</DropdownMenuItem></Link>
               <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Suporte</DropdownMenuItem>
                </DialogTrigger>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suporte Técnico</DialogTitle>
              <DialogDescription>
                Para obter ajuda, por favor, abra um chamado para a tecnologia da informação. Eles irão auxiliá-lo com qualquer problema ou dúvida que você tenha.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

      </div>
    </header>
  )
}
