'use client';

import type { CollectedData } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Phone, Pencil, Plus } from 'lucide-react';

interface CollectionSummaryProps {
  data: CollectedData;
  onConfirm: () => void;
  onEdit: () => void;
  onNewConversation: () => void;
  isLoading?: boolean;
}

export default function CollectionSummary({
  data,
  onConfirm,
  onEdit,
  onNewConversation,
  isLoading = false,
}: CollectionSummaryProps) {
  return (
    <div className="mx-3 mb-1 rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
      {/* 수집된 정보 요약 */}
      <div className="space-y-1.5 text-sm">
        {data.target_name && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="text-gray-700">
              {data.target_name}
              {data.target_phone && ` (${data.target_phone})`}
            </span>
          </div>
        )}
        {data.primary_datetime && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span className="text-gray-700">{data.primary_datetime}</span>
          </div>
        )}
        {data.service && (
          <div className="flex items-center gap-2">
            <span>✂️</span>
            <span className="text-gray-700">{data.service}</span>
          </div>
        )}
        {data.customer_name && (
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span className="text-gray-700">예약자: {data.customer_name}</span>
          </div>
        )}
        {data.party_size && (
          <div className="flex items-center gap-2">
            <span>👥</span>
            <span className="text-gray-700">{data.party_size}명</span>
          </div>
        )}
        {data.special_request && (
          <div className="flex items-center gap-2">
            <span>📝</span>
            <span className="text-gray-700">{data.special_request}</span>
          </div>
        )}
      </div>

      {/* 버튼 그룹 */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 h-11 rounded-xl border-gray-300"
          onClick={onEdit}
          disabled={isLoading}
        >
          <Pencil className="size-4 mr-1" />
          수정하기
        </Button>
        <Button
          className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700"
          onClick={onConfirm}
          disabled={isLoading}
        >
          <Phone className="size-4 mr-1" />
          {isLoading ? '처리 중...' : '전화 걸기'}
        </Button>
      </div>

      {/* 새로운 요청 */}
      <button
        type="button"
        className="w-full text-center text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 pt-1"
        onClick={onNewConversation}
        disabled={isLoading}
      >
        <Plus className="size-3" />
        새로운 요청하기
      </button>
    </div>
  );
}
