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
  // 검색 중
  if (isSearching) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center text-gray-400">
          <div className="animate-pulse flex flex-col items-center">
            <MapPin className="size-8 mb-2" />
            <p className="text-sm">장소를 검색하는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 검색 결과 없음
  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-400 p-4">
          <MapPin className="mx-auto size-8 mb-2" />
          <p className="text-sm">대화에서 장소를 언급하면</p>
          <p className="text-sm">여기에 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">
          검색 결과 ({results.length}개)
        </h3>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">상호명</th>
              <th className="px-4 py-2 font-medium">주소</th>
              <th className="px-4 py-2 font-medium">전화번호</th>
              <th className="px-4 py-2 font-medium">카테고리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((place, index) => (
              <tr
                key={`${place.name}-${index}`}
                onClick={() => onSelect(place)}
                className={cn(
                  'cursor-pointer transition-colors',
                  'hover:bg-blue-50',
                  selected?.name === place.name && selected?.address === place.address
                    ? 'bg-blue-100'
                    : ''
                )}
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{place.name}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                  {place.roadAddress || place.address || '-'}
                </td>
                <td className="px-4 py-3">
                  {place.telephone ? (
                    <a
                      href={`tel:${place.telephone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="size-3" />
                      {place.telephone}
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Tag className="size-3" />
                    {place.category || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 선택된 장소 상세 정보 */}
      {selected && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-blue-900">{selected.name}</h4>
              <p className="text-sm text-blue-700 mt-0.5">
                {selected.roadAddress || selected.address}
              </p>
              {selected.telephone && (
                <p className="text-sm text-blue-600 mt-1">
                  📞 {selected.telephone}
                </p>
              )}
            </div>
            <a
              href={`https://map.naver.com/v5/search/${encodeURIComponent(selected.name + ' ' + (selected.address || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              네이버지도에서 보기
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
