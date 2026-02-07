"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useChat } from "@/hooks/useChat";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ScenarioSelector from "./ScenarioSelector";
import { Phone, Loader2, Zap, ArrowRight, Scissors, Calendar, HelpCircle, Wrench, X } from "lucide-react";

// 샘플 카드 데이터
const SAMPLE_CARDS = [
  {
    title: "미용실 예약",
    example: "내일 오후 3시에 커트 예약해줘",
    prompt: "내일 오후 3시에 미용실 커트 예약해줘",
    icon: <Scissors className="size-4 text-[#64748B]" />,
  },
  {
    title: "식당 예약",
    example: "오늘 저녁 7시 4명 예약",
    prompt: "오늘 저녁 7시에 4명 식당 예약해줘",
    icon: <Calendar className="size-4 text-[#64748B]" />,
  },
  {
    title: "영업시간 문의",
    example: "주말에도 영업하나요?",
    prompt: "주말 영업시간 문의해줘",
    icon: <HelpCircle className="size-4 text-[#64748B]" />,
  },
  {
    title: "AS 접수",
    example: "에어컨 수리 접수해줘",
    prompt: "에어컨 AS 접수해줘",
    icon: <Wrench className="size-4 text-[#64748B]" />,
  },
];

export default function ChatContainer() {
  const t = useTranslations('chat');
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
    handleNewConversation,
    error,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="size-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-400">{t('loadingConversation')}</p>
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
      <div className="flex-1 overflow-y-auto styled-scrollbar px-5 pt-4 pb-2">
        {/* 빈 상태 — 샘플 카드 UI */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col h-full">
            {/* 히어로 */}
            <div className="text-center pt-8 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-5 glow-accent">
                <Zap className="size-5 text-[#0F172A]" />
              </div>
              <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1.5">
                {t('heroTitle')}
              </h2>
              <p className="text-sm text-[#64748B] max-w-xs mx-auto leading-relaxed">
                {t('heroSubtitle')}
              </p>
            </div>

            {/* 샘플 카드 그리드 */}
            <div className="grid grid-cols-2 gap-3 pb-4">
              {SAMPLE_CARDS.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => sendMessage(card.prompt)}
                  className="group relative flex flex-col text-left p-4 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-3">
                    {card.icon}
                  </div>
                  <span className="text-[13px] font-semibold text-[#0F172A] mb-1">
                    {card.title}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] leading-relaxed line-clamp-2">
                    &ldquo;{card.example}&rdquo;
                  </span>
                  <ArrowRight className="absolute top-4 right-4 size-3.5 text-[#CBD5E1] group-hover:text-[#94A3B8] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.length > 0 && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 bg-[#F1F5F9] text-[#0F172A] text-xs font-medium px-3 py-1.5 rounded-full border border-[#E2E8F0]">
              <Phone className="size-3" />
              {t('header')}
            </div>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
            {/* 수집 완료 시 마지막 AI 메시지 바로 아래에 액션 버튼 표시 */}
            {isComplete && 
             collectedData && 
             msg.role === 'assistant' && 
             index === messages.length - 1 && (
              <div className="flex justify-start mb-4 -mt-2">
                <div className="flex gap-2 ml-1">
                  <button
                    onClick={handleNewConversation}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-all disabled:opacity-40"
                  >
                    <X className="size-3.5" />
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium bg-[#0F172A] text-white hover:bg-[#1E293B] transition-all disabled:opacity-40 shadow-sm"
                  >
                    <Phone className="size-3.5" />
                    {isLoading ? t('processing') : t('call')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 로딩 */}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-400 font-medium mb-1">
                🤖 {t('aiAssistant')}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0ms" }}
                >
                  .
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "150ms" }}
                >
                  .
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "300ms" }}
                >
                  .
                </span>
                <span className="ml-1">{t('typing')}</span>
              </div>
            </div>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="mb-3 text-center">
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block">
              {error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 - 수집 완료 시 숨김 */}
      {!isComplete && (
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          placeholder={t('placeholder')}
        />
      )}
    </div>
  );
}
