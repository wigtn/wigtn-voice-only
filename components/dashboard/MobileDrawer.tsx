'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X, MessageSquarePlus, History, Calendar } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import SidebarMenu from './SidebarMenu';
import ConversationList from './ConversationList';
import { cn } from '@/lib/utils';

interface MobileDrawerProps {
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
}

export default function MobileDrawer({
  onNewConversation,
  onSelectConversation,
}: MobileDrawerProps) {
  const {
    isSidebarOpen,
    setSidebarOpen,
    activeMenu,
    setActiveMenu,
    activeConversationId,
  } = useDashboard();

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener('keydown', handleEsc);
      // 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen, setSidebarOpen]);

  const handleMenuClick = (menu: 'chat' | 'conversations' | 'reservations') => {
    if (menu === 'chat') {
      onNewConversation();
      setSidebarOpen(false);
    }
    setActiveMenu(menu);
  };

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* 오버레이 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/70 z-40 transition-opacity duration-300 lg:hidden',
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* 드로어 */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 shadow-xl transition-transform duration-300 lg:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* 헤더 */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="WIGVO"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              WIGVO
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* 메뉴 */}
        <nav className="p-2 space-y-1">
          <SidebarMenu
            icon={<MessageSquarePlus className="size-5" />}
            label="새 대화"
            isCollapsed={false}
            isActive={activeMenu === 'chat'}
            onClick={() => handleMenuClick('chat')}
          />
          <SidebarMenu
            icon={<History className="size-5" />}
            label="대화 기록"
            isCollapsed={false}
            isActive={activeMenu === 'conversations'}
            onClick={() => handleMenuClick('conversations')}
          />
          <SidebarMenu
            icon={<Calendar className="size-5" />}
            label="예약 기록"
            isCollapsed={false}
            isActive={activeMenu === 'reservations'}
            onClick={() => handleMenuClick('reservations')}
          />
        </nav>

        {/* 구분선 */}
        <div className="mx-3 border-t border-gray-700" />

        {/* 대화 기록 목록 */}
        {activeMenu === 'conversations' && (
          <div className="flex-1 overflow-hidden">
            <div className="px-3 py-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                최근 대화
              </h3>
            </div>
            <ConversationList
              onSelect={handleSelectConversation}
              activeId={activeConversationId}
            />
          </div>
        )}

        {/* 예약 기록 */}
        {activeMenu === 'reservations' && (
          <div className="flex-1 px-3 py-4">
            <a
              href="/history"
              className="block text-center py-3 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              📋 전체 예약 기록 보기
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
