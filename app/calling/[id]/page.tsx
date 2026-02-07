'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useCallPolling } from '@/hooks/useCallPolling';
import CallingStatus from '@/components/call/CallingStatus';
import { Button } from '@/components/ui/button';

export default function CallingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { call, loading, error } = useCallPolling(id);
  const [elapsed, setElapsed] = useState(0);
  const hasNavigatedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTerminalRef = useRef(false);

  // Elapsed time counter
  useEffect(() => {
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
  }, []);

  // Auto-navigate on terminal status
  useEffect(() => {
    if (!call) return;
    if (hasNavigatedRef.current) return;

    const isTerminal = call.status === 'COMPLETED' || call.status === 'FAILED';
    if (isTerminal) {
      isTerminalRef.current = true;
      hasNavigatedRef.current = true;

      // Stop elapsed timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Navigate after 1s delay so user can see the final state
      setTimeout(() => {
        router.push(`/result/${id}`);
      }, 1000);
    }
  }, [call, id, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">연결 오류</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              🔄 다시 시도
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/')}
            >
              🏠 홈으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md px-4">
        {loading && !call ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span
                className="absolute inset-0 animate-ping rounded-full bg-primary/20"
                style={{ animationDuration: '1.5s' }}
              />
              <span className="relative text-3xl">📞</span>
            </div>
            <p className="text-muted-foreground">통화 정보를 불러오는 중...</p>
          </div>
        ) : (
          <CallingStatus call={call} elapsed={elapsed} />
        )}
      </div>
    </div>
  );
}
