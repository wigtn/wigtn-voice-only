'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // 로그인 페이지에서는 Header 숨김
  if (pathname === '/login') {
    return null;
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem('currentConversationId');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="WIGVO Logo"
            width={36}
            height={36}
            className="rounded-full"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            WIGVO
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <LogOut className="size-4" />
          <span className="text-xs">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
