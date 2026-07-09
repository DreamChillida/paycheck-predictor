'use client';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <Calculator className="h-5 w-5" />
          <span>Paycheck Predictor</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
