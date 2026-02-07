'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageSquarePlus, History, Calendar, ChevronLeft, ChevronRight, Zap, LogOut } from 'lucide-react';
import SidebarMenu from './SidebarMenu';
import ConversationList from './ConversationList';
import { useDashboard } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
}

export default function Sidebar({ onNewConversation, onSelectConversation }: SidebarProps) {
  const router = useRouter();
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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem('currentConversationId');
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'relative h-full bg-white border-r border-[#E2E8F0] transition-all duration-300 flex flex-col',
        isSidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* 로고 */}
      <div className={cn(
        'h-14 flex items-center border-b border-[#E2E8F0] px-4',
        isSidebarCollapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 rounded-xl bg-[#F1F5F9] flex items-center justify-center shrink-0 glow-accent">
          <Zap className="size-4 text-[#0F172A]" />
        </div>
        {!isSidebarCollapsed && (
          <span className="ml-2.5 text-[15px] font-bold tracking-tight text-[#0F172A]">
            WIGVO
          </span>
        )}
      </div>

      {/* 접기/펼치기 */}
      <button
        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute -right-3 top-16 z-10 bg-white border border-[#E2E8F0] rounded-full p-1 shadow-sm hover:bg-[#F8FAFC] transition-colors"
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="size-3.5 text-[#94A3B8]" />
        ) : (
          <ChevronLeft className="size-3.5 text-[#94A3B8]" />
        )}
      </button>

      {/* 메뉴 */}
      <nav className="px-2 pt-4">
        {!isSidebarCollapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
            메뉴
          </p>
        )}
        <div className="space-y-0.5">
          <SidebarMenu
            icon={<MessageSquarePlus className="size-[18px]" />}
            label="새 대화"
            isCollapsed={isSidebarCollapsed}
            isActive={activeMenu === 'chat'}
            onClick={() => handleMenuClick('chat')}
          />
          <SidebarMenu
            icon={<History className="size-[18px]" />}
            label="대화 기록"
            isCollapsed={isSidebarCollapsed}
            isActive={activeMenu === 'conversations'}
            onClick={() => handleMenuClick('conversations')}
          />
          <SidebarMenu
            icon={<Calendar className="size-[18px]" />}
            label="예약 기록"
            isCollapsed={isSidebarCollapsed}
            isActive={activeMenu === 'reservations'}
            onClick={() => handleMenuClick('reservations')}
          />
        </div>
      </nav>

      {/* 구분선 */}
      {!isSidebarCollapsed && <div className="mx-3 mt-3 border-t border-[#E2E8F0]" />}

      {/* 대화 기록 */}
      {!isSidebarCollapsed && activeMenu === 'conversations' && (
        <div className="flex-1 overflow-hidden">
          <div className="px-3 py-2.5">
            <h3 className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
              최근 대화
            </h3>
          </div>
          <ConversationList
            onSelect={onSelectConversation}
            activeId={activeConversationId}
          />
        </div>
      )}

      {/* 예약 기록 */}
      {!isSidebarCollapsed && activeMenu === 'reservations' && (
        <div className="flex-1 px-3 py-4">
          <a
            href="/history"
            className="block text-center py-3 bg-[#F1F5F9] rounded-xl text-sm text-[#64748B] hover:bg-[#E2E8F0] transition-colors font-medium"
          >
            전체 예약 기록 보기
          </a>
        </div>
      )}

      <div className="flex-1" />

      {/* 로그아웃 */}
      <div className="px-2 pb-4">
        <div className="mx-1 mb-3 border-t border-[#E2E8F0]" />
        <button
          onClick={handleSignOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[#94A3B8] hover:text-red-500 hover:bg-red-50/50 transition-all',
            isSidebarCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="size-[18px] shrink-0" />
          {!isSidebarCollapsed && <span>로그아웃</span>}
        </button>
      </div>
    </aside>
  );
}
