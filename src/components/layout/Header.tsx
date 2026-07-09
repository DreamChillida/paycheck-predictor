'use client';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LogOut, Calculator, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold min-w-0">
          <Calculator className="h-5 w-5 shrink-0" />
          <span className="truncate">Paycheck Predictor</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
