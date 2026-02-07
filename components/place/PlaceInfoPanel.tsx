'use client';

import { MapPin, Phone, Tag, ExternalLink } from 'lucide-react';
import type { NaverPlaceResult } from '@/lib/naver-maps';
import { cn } from '@/lib/utils';

interface PlaceInfoPanelProps {
  results: NaverPlaceResult[];
  selected: NaverPlaceResult | null;
  onSelect: (place: NaverPlaceResult) => void;
  isSearching?: boolean;
}

export default function PlaceInfoPanel({
  results,
  selected,
  onSelect,
  isSearching = false,
}: PlaceInfoPanelProps) {
  if (isSearching) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="text-center text-[#94A3B8]">
          <div className="animate-pulse flex flex-col items-center">
            <MapPin className="size-8 mb-2 text-[#CBD5E1]" />
            <p className="text-sm">장소를 검색하는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
        <div className="text-center text-[#94A3B8] p-4">
          <MapPin className="mx-auto size-8 mb-2 text-[#CBD5E1]" />
          <p className="text-sm">대화에서 장소를 언급하면</p>
          <p className="text-sm">여기에 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-2.5 border-b border-[#E2E8F0]">
        <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
          검색 결과 <span className="text-[#94A3B8] font-normal">({results.length}개)</span>
        </h3>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto styled-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] sticky top-0">
            <tr className="text-left text-[10px] text-[#94A3B8] uppercase tracking-wider">
              <th className="px-4 py-2 font-semibold">#</th>
              <th className="px-4 py-2 font-semibold">상호명</th>
              <th className="px-4 py-2 font-semibold">주소</th>
              <th className="px-4 py-2 font-semibold">전화번호</th>
              <th className="px-4 py-2 font-semibold">카테고리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {results.map((place, index) => (
              <tr
                key={`${place.name}-${index}`}
                onClick={() => onSelect(place)}
                className={cn(
                  'cursor-pointer transition-colors',
                  'hover:bg-[#F8FAFC]',
                  selected?.name === place.name && selected?.address === place.address
                    ? 'bg-[#F1F5F9]'
                    : ''
                )}
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-[#0F172A] text-white rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-[#0F172A]">{place.name}</span>
                </td>
                <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">
                  {place.roadAddress || place.address || '-'}
                </td>
                <td className="px-4 py-3">
                  {place.telephone ? (
                    <a
                      href={`tel:${place.telephone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0F172A] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Phone className="size-3" />
                      {place.telephone}
                    </a>
                  ) : (
                    <span className="text-[#CBD5E1]">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[#94A3B8]">
                    <Tag className="size-3" />
                    {place.category || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 선택된 장소 상세 */}
      {selected && (
        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-[#0F172A]">{selected.name}</h4>
              <p className="text-sm text-[#64748B] mt-0.5">
                {selected.roadAddress || selected.address}
              </p>
              {selected.telephone && (
                <p className="text-sm text-[#334155] mt-1 font-medium flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {selected.telephone}
                </p>
              )}
            </div>
            <a
              href={`https://map.naver.com/v5/search/${encodeURIComponent(selected.name + ' ' + (selected.address || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              네이버지도
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
