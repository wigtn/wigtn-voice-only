'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HistoryList from '@/components/call/HistoryList';
import { Button } from '@/components/ui/button';
import type { Call } from '@/hooks/useCallPolling';

export default function HistoryPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchCalls() {
      try {
        const res = await fetch('/api/calls');

        if (res.status === 401) {
          router.push('/login');
          return;
        }

        if (!res.ok) {
          setError('기록을 불러오는 데 실패했습니다.');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setCalls(data.calls || []);
        setLoading(false);
      } catch {
        setError('네트워크 오류가 발생했습니다.');
        setLoading(false);
      }
    }

    fetchCalls();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">📋 통화 기록</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            🏠 홈
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <span
                className="absolute inset-0 animate-ping rounded-full bg-primary/20"
                style={{ animationDuration: '1.5s' }}
              />
              <span className="relative text-2xl">📋</span>
            </div>
            <p className="text-muted-foreground">기록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="text-center">
              <p className="font-medium text-destructive">{error}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                인터넷 연결을 확인해주세요.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              🔄 새로고침
            </Button>
          </div>
        ) : (
          <HistoryList calls={calls} />
        )}
      </div>
    </div>
  );
}
