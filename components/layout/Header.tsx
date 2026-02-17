'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-12 items-center border-b bg-background px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" strokeWidth={1.5} />
            <span className="sr-only">メニューを開く</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <Sidebar onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="ml-2 flex items-center gap-1.5">
        <span className="text-base font-semibold tracking-tight">結</span>
        <span className="text-[11px] text-muted-foreground">むすび</span>
      </div>
    </header>
  );
}
