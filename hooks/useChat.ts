'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createConversation,
  getConversation,
  sendChatMessage,
  createCall,
  startCall,
} from '@/lib/api';
import { validateMessage } from '@/lib/validation';
import type {
  Message,
  CollectedData,
  ConversationStatus,
  ScenarioType,
  ScenarioSubType,
} from '@/shared/types';
import { createEmptyCollectedData } from '@/shared/types';
import { useDashboard } from '@/hooks/useDashboard';

const STORAGE_KEY = 'currentConversationId';

interface UseChatReturn {
  conversationId: string | null;
  messages: Message[];
  collectedData: CollectedData | null;
  isComplete: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  conversationStatus: ConversationStatus;
  // v4: 시나리오 선택 관련
  scenarioSelected: boolean;
  selectedScenario: ScenarioType | null;
  selectedSubType: ScenarioSubType | null;
  handleScenarioSelect: (scenarioType: ScenarioType, subType: ScenarioSubType) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  handleConfirm: () => Promise<void>;
  handleEdit: () => void;
  handleNewConversation: () => Promise<void>;
  error: string | null;
}

export function useChat(): UseChatReturn {
  const router = useRouter();

  // ── Dashboard State ─────────────────────────────────────────
  const { setSearchResults, setMapCenter, setMapZoom, setIsSearching } = useDashboard();

  // ── State ───────────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('COLLECTING');
  const [error, setError] = useState<string | null>(null);
  
  // v4: 시나리오 선택 상태
  const [scenarioSelected, setScenarioSelected] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<ScenarioSubType | null>(null);

  // ── Refs (StrictMode 이중 초기화 방지) ─────────────────────
  const initializedRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helper: 에러 설정 (5초 후 자동 디스미스) ───────────────
  const setErrorWithAutoDismiss = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
  }, []);

  // ── Helper: 401 에러 처리 ──────────────────────────────────
  const handle401 = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    router.push('/login');
  }, [router]);

  // ── startConversation (v4: 시나리오 타입 지원) ─────────────
  const startConversation = useCallback(async (
    scenarioType?: ScenarioType,
    subType?: ScenarioSubType
  ) => {
    try {
      const data = await createConversation(scenarioType, subType);
      setConversationId(data.id);
      setConversationStatus(data.status);
      setCollectedData(data.collectedData ?? createEmptyCollectedData());
      setIsComplete(false);

      // v4: 시나리오 선택 상태 업데이트
      if (scenarioType && subType) {
        setScenarioSelected(true);
        setSelectedScenario(scenarioType);
        setSelectedSubType(subType);
      }

      // greeting 메시지 추가
      if (data.greeting) {
        setMessages([
          {
            id: `greeting-${data.id}`,
            role: 'assistant',
            content: data.greeting,
            createdAt: data.createdAt,
          },
        ]);
      }

      localStorage.setItem(STORAGE_KEY, data.id);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handle401();
        return;
      }
      setErrorWithAutoDismiss('대화를 시작하지 못했습니다. 새로고침 해주세요.');
    }
  }, [handle401, setErrorWithAutoDismiss]);

  // ── resumeConversation (v4: 시나리오 상태 복원) ────────────
  const resumeConversation = useCallback(
    async (id: string) => {
      try {
        const data = await getConversation(id);

        // 이미 완료된 대화면 새로 시작 (시나리오 선택 화면으로)
        if (data.status === 'COMPLETED' || data.status === 'CALLING') {
          localStorage.removeItem(STORAGE_KEY);
          // v4: 시나리오 선택 화면으로 돌아감
          setScenarioSelected(false);
          setSelectedScenario(null);
          setSelectedSubType(null);
          setIsInitializing(false);
          return;
        }

        setConversationId(data.id);
        setConversationStatus(data.status);
        setCollectedData(data.collectedData ?? createEmptyCollectedData());
        setIsComplete(data.status === 'READY');
        setMessages(data.messages ?? []);
        
        // v4: 시나리오 상태 복원
        if (data.collectedData?.scenario_type && data.collectedData?.scenario_sub_type) {
          setScenarioSelected(true);
          setSelectedScenario(data.collectedData.scenario_type);
          setSelectedSubType(data.collectedData.scenario_sub_type);
        } else {
          // 시나리오가 없으면 시나리오 선택 화면으로
          setScenarioSelected(false);
          setSelectedScenario(null);
          setSelectedSubType(null);
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'Unauthorized') {
          handle401();
          return;
        }
        // 404 또는 기타 에러: localStorage 삭제 후 시나리오 선택 화면으로
        localStorage.removeItem(STORAGE_KEY);
        setScenarioSelected(false);
        setSelectedScenario(null);
        setSelectedSubType(null);
      }
    },
    [handle401]
  );

  // ── 초기화 (v4: 시나리오 선택 화면부터 시작) ────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      setIsInitializing(true);
      const savedId = localStorage.getItem(STORAGE_KEY);

      if (savedId) {
        // 기존 대화 복원 시도
        await resumeConversation(savedId);
      } else {
        // v4: 새 대화는 시나리오 선택 화면부터 시작
        setScenarioSelected(false);
        setSelectedScenario(null);
        setSelectedSubType(null);
      }

      setIsInitializing(false);
    };

    init();
  }, [resumeConversation]);
  
  // ── handleScenarioSelect (v4: 시나리오 선택 후 대화 시작) ───
  const handleScenarioSelect = useCallback(async (
    scenarioType: ScenarioType,
    subType: ScenarioSubType
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await startConversation(scenarioType, subType);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handle401();
        return;
      }
      setErrorWithAutoDismiss('대화를 시작하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [startConversation, handle401, setErrorWithAutoDismiss]);

  // ── sendMessage (Optimistic update + rollback) ─────────────
  const sendMessage = useCallback(
    async (content: string) => {
      // 유효성 검사
      const validation = validateMessage(content);
      if (!validation.valid) {
        setErrorWithAutoDismiss(validation.error ?? '입력이 올바르지 않습니다.');
        return;
      }

      if (!conversationId) {
        setErrorWithAutoDismiss('대화가 시작되지 않았습니다.');
        return;
      }

      setError(null);

      // 1. Optimistic: 사용자 메시지 즉시 추가
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setIsLoading(true);

      try {
        // 2. API 호출
        setIsSearching(true);
        const data = await sendChatMessage(conversationId, content.trim());
        setIsSearching(false);

        // 3. 성공: assistant 메시지 추가 + collected 데이터 업데이트
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setCollectedData(data.collected);
        setIsComplete(data.is_complete);
        setConversationStatus(data.conversation_status);

        // 4. 대시보드 상태 업데이트 (검색 결과가 있으면)
        if (data.search_results && data.search_results.length > 0) {
          setSearchResults(data.search_results);
        }
        if (data.map_center) {
          setMapCenter(data.map_center);
        }
        
        // 5. 위치 컨텍스트 업데이트 (검색 결과 없을 때 위치 감지)
        if (data.location_context?.coordinates) {
          setMapCenter(data.location_context.coordinates);
          // 줌 레벨도 업데이트 (상세해질수록 확대)
          if (data.location_context.zoom_level) {
            setMapZoom(data.location_context.zoom_level);
          }
        }
      } catch (err) {
        setIsSearching(false);
        // 4. 실패: rollback — optimistic 메시지 제거
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));

        if (err instanceof Error && err.message === 'Unauthorized') {
          handle401();
          return;
        }
        setErrorWithAutoDismiss('메시지 전송에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, handle401, setErrorWithAutoDismiss]
  );

  // ── handleConfirm: 전화 걸기 (더블클릭 방지 포함) ─────────
  const confirmingRef = useRef(false);
  const handleConfirm = useCallback(async () => {
    if (!conversationId || confirmingRef.current) return;
    confirmingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Call 생성
      const call = await createCall(conversationId);

      // 2. Call 시작
      await startCall(call.id);

      // 3. localStorage 정리 후 calling 페이지로 이동
      localStorage.removeItem(STORAGE_KEY);
      router.push(`/calling/${call.id}`);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handle401();
        return;
      }
      setErrorWithAutoDismiss('전화 걸기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
      confirmingRef.current = false;
    }
  }, [conversationId, handle401, router, setErrorWithAutoDismiss]);

  // ── handleEdit: 수정하기 ──────────────────────────────────
  const handleEdit = useCallback(() => {
    setIsComplete(false);
    setConversationStatus('COLLECTING');

    const editMsg: Message = {
      id: `system-edit-${Date.now()}`,
      role: 'assistant',
      content: '수정할 내용을 말씀해주세요 😊',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, editMsg]);
  }, []);

  // ── handleNewConversation: 새 대화 시작 (v4: 시나리오 선택 화면으로) ─
  const handleNewConversation = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setCollectedData(null);
    setIsComplete(false);
    setConversationStatus('COLLECTING');
    setConversationId(null);
    setError(null);
    // v4: 시나리오 선택 화면으로 돌아감
    setScenarioSelected(false);
    setSelectedScenario(null);
    setSelectedSubType(null);
  }, []);

  return {
    conversationId,
    messages,
    collectedData,
    isComplete,
    isLoading,
    isInitializing,
    conversationStatus,
    // v4: 시나리오 선택 관련
    scenarioSelected,
    selectedScenario,
    selectedSubType,
    handleScenarioSelect,
    sendMessage,
    handleConfirm,
    handleEdit,
    handleNewConversation,
    error,
  };
}
