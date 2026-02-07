'use client';

import { useRouter } from 'next/navigation';
import { type Call } from '@/hooks/useCallPolling';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ResultCardProps {
  call: Call;
}

function getFailureMessage(result: string | null): string {
  switch (result) {
    case 'NO_ANSWER':
      return '상대방이 전화를 받지 않았습니다.';
    case 'REJECTED':
      return '요청이 거절되었습니다.';
    case 'ERROR':
      return '통화 중 오류가 발생했습니다.';
    default:
      return '알 수 없는 오류가 발생했습니다.';
  }
}

function getFailureHint(result: string | null): string {
  switch (result) {
    case 'NO_ANSWER':
      return '잠시 후 다시 시도해보세요.';
    case 'REJECTED':
      return '다른 일정이나 조건으로 다시 시도해보세요.';
    case 'ERROR':
      return '네트워크 상태를 확인하고 다시 시도해보세요.';
    default:
      return '다시 시도해보세요.';
  }
}

/**
 * Parse date string safely to avoid timezone issues.
 * API returns dates as "2026-02-07" (YYYY-MM-DD).
 * new Date("2026-02-07") parses as UTC midnight which can cause
 * day offset issues depending on local timezone.
 * We parse manually to guarantee correct local date.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      // Create with local timezone to get correct day-of-week
      const date = new Date(year, month - 1, day);
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = days[date.getDay()];
      return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
    }
    // Fallback for ISO datetime strings (e.g. "2026-02-07T10:30:00.000Z")
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '-';
  try {
    // Handle both "15:00" and "3:00" formats
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours % 12 || 12;
    return minutes > 0
      ? `${period} ${displayHours}시 ${minutes}분`
      : `${period} ${displayHours}시`;
  } catch {
    return timeStr;
  }
}

export default function ResultCard({ call }: ResultCardProps) {
  const router = useRouter();
  const isSuccess = call.result === 'SUCCESS';

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Result Icon + Header */}
      <div
        className={`flex w-full flex-col items-center gap-3 rounded-2xl px-6 py-8 ${
          isSuccess
            ? 'bg-green-50 dark:bg-green-950/20'
            : 'bg-red-50 dark:bg-red-950/20'
        }`}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            isSuccess
              ? 'bg-green-100 dark:bg-green-900/40'
              : 'bg-red-100 dark:bg-red-900/40'
          }`}
        >
          <span className="text-3xl">{isSuccess ? '✅' : '❌'}</span>
        </div>
        <h1 className="text-xl font-bold">
          {isSuccess ? '예약이 완료되었습니다!' : '통화에 실패했습니다'}
        </h1>
        {!isSuccess && (
          <div className="text-center">
            <p className="text-sm font-medium text-destructive">
              {getFailureMessage(call.result)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {getFailureHint(call.result)}
            </p>
          </div>
        )}
      </div>

      {/* Reservation Detail Card */}
      {isSuccess && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">예약 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              <div className="flex items-center gap-3 py-3 first:pt-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-base">
                  📍
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">장소</p>
                  <p className="font-medium">{call.targetName}</p>
                </div>
              </div>
              {call.parsedDate && (
                <div className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-base">
                    📆
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">날짜</p>
                    <p className="font-medium">{formatDate(call.parsedDate)}</p>
                  </div>
                </div>
              )}
              {call.parsedTime && (
                <div className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-base">
                    ⏰
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">시간</p>
                    <p className="font-medium">{formatTime(call.parsedTime)}</p>
                  </div>
                </div>
              )}
              {call.parsedService && (
                <div className="flex items-center gap-3 py-3 last:pb-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-base">
                    ✂️
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">서비스</p>
                    <p className="font-medium">{call.parsedService}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {call.summary && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">📝 AI 통화 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {call.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex w-full flex-col gap-2.5 pt-2">
        {!isSuccess && (
          <Button
            variant="default"
            className="w-full"
            onClick={() => router.push('/')}
          >
            🔄 다시 시도하기
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/history')}
        >
          📋 기록 보기
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => router.push('/')}
        >
          🏠 홈으로
        </Button>
      </div>
    </div>
  );
}
