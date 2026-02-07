'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import ResultCard from '@/components/call/ResultCard';
import { Button } from '@/components/ui/button';
import type { Call } from '@/hooks/useCallPolling';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchCall() {
      try {
        const res = await fetch(`/api/calls/${id}`);

        if (res.status === 401) {
          router.push('/login');
          return;
        }

        if (res.status === 404) {
          setError('통화 기록을 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError('데이터를 불러오는 데 실패했습니다.');
          setLoading(false);
          return;
        }

        const data: Call = await res.json();
        setCall(data);
        setLoading(false);
      } catch {
        setError('네트워크 오류가 발생했습니다.');
        setLoading(false);
      }
    }

    fetchCall();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span
              className="absolute inset-0 animate-ping rounded-full bg-primary/20"
              style={{ animationDuration: '1.5s' }}
            />
            <span className="relative text-2xl">📋</span>
          </div>
          <p className="text-muted-foreground">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">오류 발생</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error || '알 수 없는 오류가 발생했습니다.'}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => {
                fetchedRef.current = false;
                setLoading(true);
                setError(null);
                window.location.reload();
              }}
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
        <ResultCard call={call} />
      </div>
    </div>
  );
}
