'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import CollectionSummary from './CollectionSummary';
import ScenarioSelector from './ScenarioSelector';
import { Phone, Loader2 } from 'lucide-react';

export default function ChatContainer() {
  const {
    messages,
    collectedData,
    isComplete,
    isLoading,
    isInitializing,
    // v4: 시나리오 선택 관련
    scenarioSelected,
    handleScenarioSelect,
    sendMessage,
    handleConfirm,
    handleEdit,
    handleNewConversation,
    error,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤: 새 메시지 추가 시 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── 초기화 중 로딩 ────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="size-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-400">대화를 불러오는 중...</p>
      </div>
    );
  }

  // ── v4: 시나리오 선택 화면 ────────────────────────────────
  if (!scenarioSelected) {
    return (
      <div className="flex flex-col h-full bg-white">
        <ScenarioSelector 
          onSelect={handleScenarioSelect} 
          disabled={isLoading}
        />
        {/* 에러 메시지 */}
        {error && (
          <div className="mx-4 mb-4 text-center">
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}
        {/* 로딩 표시 */}
        {isLoading && (
          <div className="flex justify-center pb-4">
            <Loader2 className="size-6 text-blue-600 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {/* 안내 헤더 */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <Phone className="size-3" />
            AI가 전화를 대신 걸어드립니다
          </div>
        </div>

        {/* 메시지 목록 */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Phone className="size-10 mb-3 text-gray-300" />
            <p className="text-sm">대화를 시작해주세요</p>
            <p className="text-xs mt-1">예: &quot;내일 미용실 예약해줘&quot;</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* 로딩 중 "입력 중..." 표시 */}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-400 font-medium mb-1">🤖 AI 비서</div>
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                <span className="ml-1">입력 중</span>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-auto max-w-[80%] mb-3 text-center">
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 수집 완료 시 요약 카드 */}
      {isComplete && collectedData && (
        <CollectionSummary
          data={collectedData}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          onNewConversation={handleNewConversation}
          isLoading={isLoading}
        />
      )}

      {/* 입력창 (수집 완료 시에도 보이되, 완료 시 비활성화) */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading || isComplete}
        placeholder={
          isComplete
            ? '전화 걸기 또는 수정하기를 선택해주세요'
            : '메시지를 입력하세요...'
        }
      />
    </div>
  );
}
