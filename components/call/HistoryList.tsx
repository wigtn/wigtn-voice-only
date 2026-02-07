'use client';

import { useRouter } from 'next/navigation';
import { type Call, type CallStatus } from '@/hooks/useCallPolling';

interface HistoryListProps {
  calls: Call[];
}

interface StatusBadge {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
}

function getStatusBadge(
  status: CallStatus,
  result: string | null
): StatusBadge {
  if (status === 'COMPLETED') {
    return result === 'SUCCESS'
      ? {
          label: '성공',
          dotColor: 'bg-green-500',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          textColor: 'text-green-700 dark:text-green-400',
        }
      : {
          label: '실패',
          dotColor: 'bg-red-500',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          textColor: 'text-red-700 dark:text-red-400',
        };
  }
  if (status === 'FAILED') {
    return {
      label: '실패',
      dotColor: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      textColor: 'text-red-700 dark:text-red-400',
    };
  }
  if (status === 'CALLING' || status === 'IN_PROGRESS') {
    return {
      label: '통화중',
      dotColor: 'bg-blue-500 animate-pulse',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-700 dark:text-blue-400',
    };
  }
  return {
    label: '대기',
    dotColor: 'bg-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  };
}

function getRequestTypeLabel(type: string): string {
  switch (type) {
    case 'RESERVATION':
      return '예약';
    case 'INQUIRY':
      return '문의';
    case 'CONFIRMATION':
      return '확인';
    default:
      return type;
  }
}

function getRequestTypeIcon(type: string): string {
  switch (type) {
    case 'RESERVATION':
      return '📅';
    case 'INQUIRY':
      return '❓';
    case 'CONFIRMATION':
      return '🔍';
    default:
      return '📞';
  }
}

function formatCreatedAt(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function getNavigationTarget(call: Call): string {
  if (call.status === 'COMPLETED' || call.status === 'FAILED') {
    return `/result/${call.id}`;
  }
  return `/calling/${call.id}`;
}

export default function HistoryList({ calls }: HistoryListProps) {
  const router = useRouter();

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <span className="text-5xl">📭</span>
        <p className="font-medium text-muted-foreground">
          아직 통화 기록이 없습니다.
        </p>
        <p className="text-sm text-muted-foreground/60">
          채팅에서 전화를 요청해보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {calls.map((call) => {
        const badge = getStatusBadge(call.status, call.result);
        const icon = getRequestTypeIcon(call.requestType);
        return (
          <button
            key={call.id}
            onClick={() => router.push(getNavigationTarget(call))}
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:bg-accent/50 active:scale-[0.98]"
          >
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
              {icon}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium">{call.targetName}</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{getRequestTypeLabel(call.requestType)}</span>
                <span>·</span>
                <span>{formatCreatedAt(call.createdAt)}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ${badge.bgColor}`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${badge.dotColor}`}
              />
              <span className={`text-xs font-medium ${badge.textColor}`}>
                {badge.label}
              </span>
            </div>

            {/* Chevron */}
            <svg
              className="h-4 w-4 shrink-0 text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
