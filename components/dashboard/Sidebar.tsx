'use client';

import Image from 'next/image';
import { MessageSquarePlus, History, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import SidebarMenu from './SidebarMenu';
import ConversationList from './ConversationList';
import { useDashboard } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
}

export default function Sidebar({ onNewConversation, onSelectConversation }: SidebarProps) {
  const {
    isSidebarCollapsed,
    setSidebarCollapsed,
    activeMenu,
    setActiveMenu,
    activeConversationId,
  } = useDashboard();

  const handleMenuClick = (menu: 'chat' | 'conversations' | 'reservations') => {
    if (menu === 'chat') {
      onNewConversation();
    }
    setActiveMenu(menu);
  };

  return (
    <aside
      className={cn(
        'relative bg-gray-900 border-r border-gray-700 transition-all duration-300 flex flex-col',
        isSidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* 로고/타이틀 */}
      <div className={cn(
        'h-14 flex items-center border-b border-gray-800 px-4',
        isSidebarCollapsed && 'justify-center px-2'
      )}>
        <Image
          src="/logo.png"
          alt="WIGVO"
          width={32}
          height={32}
          className="rounded-full flex-shrink-0"
        />
        {!isSidebarCollapsed && (
          <span className="ml-2 font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            WIGVO
          </span>
        )}
      </div>

      {/* 접기/펼치기 버튼 */}
      <button
        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute -right-3 top-16 z-10 bg-gray-800 border border-gray-600 rounded-full p-1 shadow-sm hover:bg-gray-700 transition-colors"
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="size-4 text-gray-400" />
        ) : (
          <ChevronLeft className="size-4 text-gray-400" />
        )}
      </button>

      {/* 메뉴 */}
      <nav className="p-2 space-y-1">
        <SidebarMenu
          icon={<MessageSquarePlus className="size-5" />}
          label="새 대화"
          isCollapsed={isSidebarCollapsed}
          isActive={activeMenu === 'chat'}
          onClick={() => handleMenuClick('chat')}
        />
        <SidebarMenu
          icon={<History className="size-5" />}
          label="대화 기록"
          isCollapsed={isSidebarCollapsed}
          isActive={activeMenu === 'conversations'}
          onClick={() => handleMenuClick('conversations')}
        />
        <SidebarMenu
          icon={<Calendar className="size-5" />}
          label="예약 기록"
          isCollapsed={isSidebarCollapsed}
          isActive={activeMenu === 'reservations'}
          onClick={() => handleMenuClick('reservations')}
        />
      </nav>

      {/* 구분선 */}
      {!isSidebarCollapsed && <div className="mx-3 border-t border-gray-700" />}

      {/* 대화 기록 목록 */}
      {!isSidebarCollapsed && activeMenu === 'conversations' && (
        <div className="flex-1 overflow-hidden">
          <div className="px-3 py-2">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              최근 대화
            </h3>
          </div>
          <ConversationList
            onSelect={onSelectConversation}
            activeId={activeConversationId}
          />
        </div>
      )}

      {/* 예약 기록 (간단한 링크) */}
      {!isSidebarCollapsed && activeMenu === 'reservations' && (
        <div className="flex-1 px-3 py-4">
          <a
            href="/history"
            className="block text-center py-3 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            📋 전체 예약 기록 보기
          </a>
        </div>
      )}

      {/* 하단 여백 */}
      <div className="flex-1" />
    </aside>
  );
}
