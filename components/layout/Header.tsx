'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Phone, LogOut } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto max-w-md flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <Phone className="size-5 text-blue-600" />
          <span className="text-xl font-bold text-blue-600">WIGVO</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-gray-500 hover:text-gray-700"
        >
          <LogOut className="size-4" />
          <span className="text-xs">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
