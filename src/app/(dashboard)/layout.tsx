
'use client';

import { useState } from 'react';
import Header from '@/components/Header';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
     <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        {children}
      </div>
  )
}
