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

  // 모바일 탭 상태
  const [mobileTab, setMobileTab] = useState<'chat' | 'map'>('chat');

  // 새 대화 시작
  const onNewConversation = useCallback(async () => {
    resetDashboard();
    await handleNewConversation();
  }, [resetDashboard, handleNewConversation]);

  // 대화 선택 (TODO: 대화 복원 로직 연결)
  const onSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    // TODO: 해당 대화 복원
  }, [setActiveConversationId]);

  return (
    <div className="flex h-[calc(100vh-56px)] bg-gray-50">
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
        <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="size-5 text-gray-600" />
          </button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMobileTab('chat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                mobileTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
              )}
            >
              <MessageSquare className="size-4" />
              채팅
            </button>
            <button
              onClick={() => setMobileTab('map')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                mobileTab === 'map'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
              )}
            >
              <Map className="size-4" />
              지도
            </button>
          </div>

          <div className="w-10" /> {/* 균형을 위한 빈 공간 */}
        </div>

        {/* 데스크톱: 2컬럼 레이아웃 */}
        {/* 좌측: 채팅 (50%) */}
        <div className={cn(
          'lg:w-1/2 h-full',
          // 모바일에서는 탭에 따라 표시/숨김
          mobileTab === 'chat' ? 'flex-1' : 'hidden lg:block'
        )}>
          <div className="h-full bg-white lg:rounded-xl lg:shadow-sm lg:border lg:border-gray-200 overflow-hidden">
            <ChatContainer />
          </div>
        </div>

        {/* 우측: 지도 + 장소 정보 (50%) */}
        <div className={cn(
          'lg:w-1/2 h-full flex flex-col gap-2 lg:gap-4 p-2 lg:p-0',
          // 모바일에서는 탭에 따라 표시/숨김
          mobileTab === 'map' ? 'flex-1' : 'hidden lg:flex'
        )}>
          {/* 지도 (50%) */}
          <div className="flex-1 min-h-0">
            <NaverMapContainer
              center={mapCenter}
              markers={searchResults}
              selectedPlace={selectedPlace}
              onMarkerClick={setSelectedPlace}
            />
          </div>

          {/* 장소 정보 (50%) */}
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
