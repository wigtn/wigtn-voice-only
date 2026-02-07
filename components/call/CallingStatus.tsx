'use client';

import { type Call } from '@/hooks/useCallPolling';

interface CallingStatusProps {
  call: Call | null;
  elapsed: number;
}

function formatElapsed(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function getTitle(call: Call | null): string {
  if (!call) return '전화 준비 중...';
  switch (call.status) {
    case 'PENDING':
    case 'CALLING':
      return `${call.targetName}에 전화하는 중...`;
    case 'IN_PROGRESS':
      return `${call.targetName}과 통화 중...`;
    case 'COMPLETED':
      return '통화가 완료되었습니다';
    case 'FAILED':
      return '통화에 실패했습니다';
    default:
      return '📞 통화 중...';
  }
}

interface Step {
  label: string;
  active: boolean;
  completed: boolean;
  failed?: boolean;
}

function getSteps(status: string | undefined): Step[] {
  const s = status || 'PENDING';
  const isFailed = s === 'FAILED';
  return [
    {
      label: '전화 연결 중...',
      active: s === 'PENDING' || s === 'CALLING',
      completed: s === 'IN_PROGRESS' || s === 'COMPLETED' || isFailed,
    },
    {
      label: '용건 전달 중...',
      active: s === 'IN_PROGRESS',
      completed: s === 'COMPLETED' || isFailed,
    },
    {
      label: isFailed ? '통화 실패' : '통화 완료',
      active: false,
      completed: s === 'COMPLETED' || isFailed,
      failed: isFailed,
    },
  ];
}

export default function CallingStatus({ call, elapsed }: CallingStatusProps) {
  const steps = getSteps(call?.status);
  const isTerminal = call?.status === 'COMPLETED' || call?.status === 'FAILED';
  const isFailed = call?.status === 'FAILED';

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Animation Area */}
      <div className="relative flex h-36 w-36 items-center justify-center">
        {/* Pulsing rings - only when active */}
        {!isTerminal && (
          <>
            <span
              className="absolute inset-0 rounded-full bg-primary/10 animate-ping"
              style={{ animationDuration: '2s' }}
            />
            <span
              className="absolute inset-3 rounded-full bg-primary/10 animate-ping"
              style={{ animationDuration: '2.5s', animationDelay: '0.4s' }}
            />
          </>
        )}

        {/* Center circle with icons */}
        <div
          className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 ${
            isTerminal
              ? isFailed
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-primary/30 bg-primary/5'
              : 'border-primary/40 bg-primary/10'
          }`}
        >
          <div className="flex items-center gap-1.5 text-3xl">
            <span className={isTerminal ? '' : 'animate-pulse'}>🤖</span>
            <span className="text-base text-muted-foreground">↔️</span>
            <span className={isTerminal ? '' : 'animate-pulse'}>📱</span>
          </div>
        </div>
      </div>

      {/* Title + Phone */}
      <div className="text-center">
        <h1 className="text-xl font-bold">{getTitle(call)}</h1>
        {call?.targetPhone && (
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {call.targetPhone}
          </p>
        )}
      </div>

      {/* Elapsed Timer */}
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted/50 px-8 py-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          경과 시간
        </span>
        <span className="font-mono text-4xl font-bold tabular-nums tracking-tight">
          {formatElapsed(elapsed)}
        </span>
      </div>

      {/* Vertical Timeline */}
      <div className="w-full max-w-xs">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex gap-3">
              {/* Timeline column: dot + line */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    step.active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : step.completed
                        ? step.failed
                          ? 'border-destructive bg-destructive text-white'
                          : 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/25 bg-background'
                  }`}
                >
                  {step.completed && !step.active
                    ? step.failed
                      ? '✕'
                      : '✓'
                    : step.active
                      ? ''
                      : ''}
                  {/* Active pulse ring */}
                  {step.active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                  )}
                </div>
                {/* Connecting line */}
                {!isLast && (
                  <div
                    className={`w-0.5 min-h-6 flex-1 transition-colors ${
                      step.completed
                        ? step.failed
                          ? 'bg-destructive/25'
                          : 'bg-primary/25'
                        : 'bg-muted-foreground/10'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div
                className={`pb-5 pt-1 text-sm transition-colors ${
                  step.active
                    ? 'font-semibold text-primary'
                    : step.completed
                      ? step.failed
                        ? 'text-destructive'
                        : 'text-foreground'
                      : 'text-muted-foreground/40'
                }`}
              >
                {step.label}
                {step.active && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary align-middle" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
