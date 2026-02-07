// =============================================================================
// WIGVO Naver Maps Integration (v3)
// =============================================================================
// BE1 소유 - 네이버지도 API를 통한 장소 검색
// Phase 3: 캐싱 통합으로 API 할당량 절약
// =============================================================================

import {
  getCachedSearchResults,
  saveSearchResultsToCache,
} from '@/lib/supabase/cache';

/**
 * 네이버지도 검색 결과
 */
export interface NaverPlaceResult {
  name: string;
  address: string;
  roadAddress: string;
  telephone: string;
  category: string;
  mapx: number;
  mapy: number;
}

/**
 * 네이버지도 장소 검색 (캐싱 적용)
 * 
 * @param query - 검색어 (예: "강남역 미용실")
 * @param location - 사용자 위치 (선택적, 있으면 거리순 정렬)
 * @param useCache - 캐시 사용 여부 (기본값: true)
 * @returns 검색 결과 목록 (최대 5개)
 */
export async function searchNaverPlaces(
  query: string,
  location?: { lat: number; lng: number },
  useCache: boolean = true
): Promise<NaverPlaceResult[]> {
  // 1. 캐시 확인 (위치 정보 없는 경우에만 캐시 사용)
  if (useCache && !location) {
    try {
      const cachedResults = await getCachedSearchResults(query);
      if (cachedResults && cachedResults.length > 0) {
        console.log(`[Naver Maps] Cache hit for query: "${query}"`);
        return cachedResults;
      }
    } catch (cacheError) {
      // 캐시 조회 실패해도 계속 진행
      console.warn('[Naver Maps] Cache lookup failed:', cacheError);
    }
  }

  // 2. API 키 확인
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('Naver API credentials not configured. Skipping place search.');
    return [];
  }

  // 3. API 호출
  try {
    const params = new URLSearchParams({
      query,
      display: '5', // 최대 5개 결과
      sort: location ? 'distance' : 'random', // 위치가 있으면 거리순, 없으면 랜덤
    });

    if (location) {
      params.append('lat', String(location.lat));
      params.append('lng', String(location.lng));
    }

    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?${params}`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );

    if (!response.ok) {
      console.error(`Naver API error: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    const results: NaverPlaceResult[] = (data.items || []).map((item: any) => ({
      name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      address: item.address || '',
      roadAddress: item.roadAddress || '',
      telephone: item.telephone || '',
      category: item.category || '',
      mapx: parseFloat(item.mapx) || 0,
      mapy: parseFloat(item.mapy) || 0,
    }));

    // 4. 결과 캐싱 (위치 정보 없는 경우에만)
    if (useCache && !location && results.length > 0) {
      try {
        await saveSearchResultsToCache(query, results);
        console.log(`[Naver Maps] Cached ${results.length} results for query: "${query}"`);
      } catch (cacheError) {
        // 캐싱 실패해도 결과는 반환
        console.warn('[Naver Maps] Failed to cache results:', cacheError);
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to search Naver places:', error);
    return [];
  }
}

/**
 * 사용자 메시지에서 장소 검색 필요 여부 판단
 * 
 * @param message - 사용자 메시지
 * @param hasPhoneNumber - 이미 전화번호가 수집되었는지
 * @returns 검색 필요 여부
 */
export function shouldSearchPlaces(message: string, hasPhoneNumber: boolean): boolean {
  // 이미 전화번호가 있으면 검색 불필요
  if (hasPhoneNumber) {
    return false;
  }

  // 검색 키워드
  const searchKeywords = [
    '근처',
    '주변',
    '찾아',
    '검색',
    '어디',
    '직방',
    '네이버',
    '다음',
    '카카오맵',
    '지도',
    '알려줘',
    '알려',
  ];

  // 장소명 패턴 (예: "OO미용실", "XX식당")
  const placeNamePattern = /[가-힣]{2,10}(미용실|식당|병원|카페|마트|센터|매장|점|상가)/;

  // 전화번호 패턴 (없어야 검색 필요)
  const phonePattern = /\d{2,3}-\d{3,4}-\d{4}/;

  const hasKeyword = searchKeywords.some((kw) => message.includes(kw));
  const hasPlaceName = placeNamePattern.test(message);
  const hasNoPhone = !phonePattern.test(message);

  return hasKeyword || (hasPlaceName && hasNoPhone);
}

/**
 * 사용자 메시지에서 검색어 추출
 * 
 * @param message - 사용자 메시지
 * @returns 추출된 검색어
 */
export function extractSearchQuery(message: string): string {
  // "강남역 근처 미용실" → "강남역 미용실"
  // "직방에서 본 빌라" → "직방 빌라"
  
  // 불필요한 단어 제거
  const stopWords = ['근처', '주변', '에서', '본', '알려줘', '알려', '찾아'];
  
  let query = message;
  stopWords.forEach((word) => {
    query = query.replace(new RegExp(word, 'g'), '');
  });
  
  // 공백 정리
  query = query.trim().replace(/\s+/g, ' ');
  
  return query;
}
