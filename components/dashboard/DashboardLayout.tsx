'use client';

import { useCallback, useState } from 'react';
import { Menu, Map, MessageSquare } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import ChatContainer from '@/components/chat/ChatContainer';
import NaverMapContainer from '@/components/map/NaverMapContainer';
import PlaceInfoPanel from '@/components/place/PlaceInfoPanel';
import { useDashboard } from '@/hooks/useDashboard';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

export default function DashboardLayout() {
  const {
    mapCenter,
    mapZoom,
    searchResults,
    selectedPlace,
    setSelectedPlace,
    isSearching,
    setActiveConversationId,
    setSidebarOpen,
    resetDashboard,
  } = useDashboard();

  const {
    handleNewConversation,
  } = useChat();

  const [mobileTab, setMobileTab] = useState<'chat' | 'map'>('chat');

  const onNewConversation = useCallback(async () => {
    resetDashboard();
    await handleNewConversation();
  }, [resetDashboard, handleNewConversation]);

  const onSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, [setActiveConversationId]);

  return (
    <div className="flex h-full bg-[#F8FAFC]">
      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:block">
        <Sidebar
          onNewConversation={onNewConversation}
          onSelectConversation={onSelectConversation}
        />
      </div>

      {/* 모바일 드로어 */}
      <MobileDrawer
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-4 p-0 lg:p-4 overflow-hidden">
        {/* 모바일 헤더 (탭 전환) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-[#E2E8F0]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <Menu className="size-5 text-[#64748B]" />
          </button>

          <div className="flex bg-[#F1F5F9] rounded-xl p-1">
            <button
              onClick={() => setMobileTab('chat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                mobileTab === 'chat'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#94A3B8]'
              )}
            >
              <MessageSquare className="size-4" />
              채팅
            </button>
            <button
              onClick={() => setMobileTab('map')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                mobileTab === 'map'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#94A3B8]'
              )}
            >
              <Map className="size-4" />
              지도
            </button>
          </div>

          <div className="w-10" />
        </div>

        {/* 좌측: 채팅 카드 */}
        <div className={cn(
          'lg:w-1/2 h-full',
          mobileTab === 'chat' ? 'flex-1' : 'hidden lg:block'
        )}>
          <div className="h-full bg-white lg:rounded-2xl lg:border lg:border-[#E2E8F0] lg:shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <ChatContainer />
          </div>
        </div>

        {/* 우측: 지도 + 장소 정보 카드 */}
        <div className={cn(
          'lg:w-1/2 h-full flex flex-col gap-2 lg:gap-4 p-2 lg:p-0',
          mobileTab === 'map' ? 'flex-1' : 'hidden lg:flex'
        )}>
          <div className="flex-1 min-h-0">
            <NaverMapContainer
              center={mapCenter}
              zoom={mapZoom}
              markers={searchResults}
              selectedPlace={selectedPlace}
              onMarkerClick={setSelectedPlace}
            />
          </div>

          <div className="flex-1 min-h-0">
            <PlaceInfoPanel
              results={searchResults}
              selected={selectedPlace}
              onSelect={setSelectedPlace}
              isSearching={isSearching}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
