'use client';

import { useState, useEffect, useRef } from 'react';
import { useCallPolling } from '@/hooks/useCallPolling';
import { useDashboard } from '@/hooks/useDashboard';
import CallingStatus from './CallingStatus';
import ResultCard from './ResultCard';
import { Loader2 } from 'lucide-react';

/**
 * CallingPanel - 대시보드 오른쪽에 맵 대신 표시되는 통화 패널
 * useCallPolling으로 내부 폴링하며, 통화 중 → 결과 표시를 인라인으로 처리
 */
export default function CallingPanel() {
  const { callingCallId } = useDashboard();
  const { call, loading, error } = useCallPolling(callingCallId ?? '');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTerminalRef = useRef(false);

  // 경과 시간 카운터
  useEffect(() => {
    setElapsed(0);
    isTerminalRef.current = false;

    timerRef.current = setInterval(() => {
      if (!isTerminalRef.current) {
        setElapsed((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callingCallId]);

  // 종료 상태 감지
  useEffect(() => {
    if (!call) return;
    const isTerminal = call.status === 'COMPLETED' || call.status === 'FAILED';
    if (isTerminal) {
      isTerminalRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [call]);

  const isTerminal = call?.status === 'COMPLETED' || call?.status === 'FAILED';

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-6">
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-[#64748B] hover:text-[#334155] underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (loading && !call) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="size-6 text-[#0F172A] animate-spin" />
        <p className="text-sm text-[#94A3B8]">통화 정보를 불러오는 중...</p>
      </div>
    );
  }

  // 통화 완료/실패 → 결과 카드
  if (isTerminal && call) {
    return (
      <div className="h-full overflow-y-auto styled-scrollbar px-4 py-6">
        <ResultCard call={call} />
      </div>
    );
  }

  // 통화 중 → CallingStatus (Orb 포함)
  return (
    <div className="flex items-center justify-center h-full">
      <CallingStatus call={call} elapsed={elapsed} />
    </div>
  );
}
