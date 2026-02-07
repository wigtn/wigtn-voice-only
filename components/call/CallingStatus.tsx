'use client';

import { type Call } from '@/hooks/useCallPolling';
import { Phone, Bot, Check, X } from 'lucide-react';

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
      return '통화 중...';
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
    <div className="flex flex-col items-center gap-8 py-8">
      {/* 애니메이션 영역 */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {!isTerminal && (
          <>
            <span
              className="absolute inset-0 rounded-full bg-[#0F172A]/5 animate-ping"
              style={{ animationDuration: '2s' }}
            />
            <span
              className="absolute inset-3 rounded-full bg-[#0F172A]/5 animate-ping"
              style={{ animationDuration: '2.5s', animationDelay: '0.4s' }}
            />
          </>
        )}

        <div
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 ${
            isTerminal
              ? isFailed
                ? 'border-red-200 bg-red-50'
                : 'border-teal-200 bg-teal-50'
              : 'border-[#E2E8F0] bg-[#F1F5F9]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot className={`size-6 ${isTerminal ? (isFailed ? 'text-red-500' : 'text-teal-600') : 'text-[#0F172A] animate-pulse'}`} />
            <Phone className={`size-5 ${isTerminal ? (isFailed ? 'text-red-400' : 'text-teal-500') : 'text-[#64748B] animate-pulse'}`} />
          </div>
        </div>
      </div>

      {/* 제목 + 전화번호 */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{getTitle(call)}</h1>
        {call?.targetPhone && (
          <p className="mt-1.5 font-mono text-sm text-[#94A3B8]">{call.targetPhone}</p>
        )}
      </div>

      {/* 경과 시간 */}
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] px-8 py-4">
        <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
          경과 시간
        </span>
        <span className="font-mono text-4xl font-bold tabular-nums tracking-tight text-[#0F172A]">
          {formatElapsed(elapsed)}
        </span>
      </div>

      {/* 타임라인 */}
      <div className="w-full max-w-xs">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    step.active
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : step.completed
                        ? step.failed
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-teal-500 bg-teal-500 text-white'
                        : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  {step.completed && !step.active ? (
                    step.failed ? <X className="size-3.5" /> : <Check className="size-3.5" />
                  ) : null}
                  {step.active && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#0F172A]/20" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 min-h-6 flex-1 transition-colors ${
                      step.completed
                        ? step.failed ? 'bg-red-200' : 'bg-teal-200'
                        : 'bg-[#E2E8F0]'
                    }`}
                  />
                )}
              </div>

              <div
                className={`pb-5 pt-1 text-sm transition-colors ${
                  step.active
                    ? 'font-semibold text-[#0F172A]'
                    : step.completed
                      ? step.failed ? 'text-red-600' : 'text-[#334155]'
                      : 'text-[#CBD5E1]'
                }`}
              >
                {step.label}
                {step.active && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#0F172A] align-middle" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
