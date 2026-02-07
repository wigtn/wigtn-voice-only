# 대시보드 UI 구축 계획서

> **목적**: 로그인 후 채팅만 보이는 단순 UI를 → 사이드바 + 채팅 + 네이버지도 + 장소정보가 통합된 대시보드로 개선
> **작성일**: 2026-02-07
> **예상 작업량**: 중-대규모 (신규 컴포넌트 10+ 개, 레이아웃 전면 개편)

---

## 1. 현재 상태 분석

### 현재 구조
```
로그인 → / (page.tsx) → ChatContainer만 렌더링
         └── max-w-md 컨테이너 (모바일 최적화)
```

### 문제점
1. 로그인 후 바로 채팅만 보여서 서비스 맥락 파악 어려움
2. 지난 대화/예약 기록 접근이 불편 (별도 페이지 이동 필요)
3. 네이버지도 검색 결과가 텍스트로만 표시됨 (시각적 피드백 부족)
4. 장소 정보가 대화 내에 섞여서 확인 어려움

---

## 2. 목표 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Header (기존 유지)                                                        │
├──────────┬──────────────────────────────────────────────────────────────┤
│          │                                                              │
│ Sidebar  │  Main Content Area                                           │
│ (240px)  │  ┌─────────────────────┬─────────────────────┐               │
│          │  │                     │                     │               │
│ ┌──────┐ │  │   Chat Panel        │   Map Panel         │               │
│ │ 메뉴 │ │  │   (50%)             │   (50%)             │               │
│ │      │ │  │                     │                     │               │
│ │ - 새 │ │  │   ┌───────────────┐ │   ┌───────────────┐ │               │
│ │   대화│ │  │   │ ChatContainer│ │   │ NaverMap      │ │               │
│ │      │ │  │   │ (기존 컴포넌트)│ │   │ (50% 상단)    │ │               │
│ │ - 대화│ │  │   │              │ │   │               │ │               │
│ │   기록│ │  │   │              │ │   ├───────────────┤ │               │
│ │      │ │  │   │              │ │   │ PlaceInfo     │ │               │
│ │ - 예약│ │  │   │              │ │   │ (50% 하단)    │ │               │
│ │   기록│ │  │   │              │ │   │               │ │               │
│ │      │ │  │   └───────────────┘ │   └───────────────┘ │               │
│ └──────┘ │  └─────────────────────┴─────────────────────┘               │
│          │                                                              │
└──────────┴──────────────────────────────────────────────────────────────┘
```

### 반응형 동작
- **Desktop (≥1024px)**: 사이드바 + 2컬럼 메인
- **Tablet (768-1023px)**: 사이드바 접힘 + 2컬럼 메인
- **Mobile (<768px)**: 사이드바 드로어 + 탭 기반 전환

---

## 3. 컴포넌트 구조

### 3.1 신규 컴포넌트

```
components/
├── dashboard/                    # 신규 폴더
│   ├── DashboardLayout.tsx       # 전체 대시보드 레이아웃
│   ├── Sidebar.tsx               # 사이드바 컴포넌트
│   ├── SidebarMenu.tsx           # 사이드바 메뉴 아이템
│   ├── ConversationList.tsx      # 지난 대화 목록
│   └── MobileDrawer.tsx          # 모바일용 드로어
│
├── map/                          # 신규 폴더
│   ├── NaverMapContainer.tsx     # 네이버지도 래퍼
│   ├── NaverMapView.tsx          # 지도 렌더링 (Script 로드)
│   └── MapMarker.tsx             # 마커 컴포넌트
│
├── place/                        # 신규 폴더
│   ├── PlaceInfoPanel.tsx        # 장소 정보 패널 (테이블)
│   ├── PlaceCard.tsx             # 개별 장소 카드
│   └── PlaceSearchResults.tsx    # 검색 결과 목록
│
└── chat/                         # 기존 폴더 (수정)
    ├── ChatContainer.tsx         # 수정: 독립적으로 동작하도록
    └── ... (기존 유지)
```

### 3.2 수정 필요 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/layout.tsx` | max-w-md 제거, 전체 너비 사용 |
| `app/page.tsx` | DashboardLayout으로 교체 |
| `components/chat/ChatContainer.tsx` | 높이 조정, 외부에서 크기 제어 가능하도록 |
| `hooks/useChat.ts` | 장소 정보 상태 추가 (selectedPlace) |

---

## 4. 데이터 흐름

### 4.1 장소 맥락 추출 흐름

```
사용자 메시지 입력
       │
       ▼
┌─────────────────────────────────────────┐
│ useChat.sendMessage()                   │
│ - POST /api/chat                        │
│ - LLM이 장소/지역 맥락 추출             │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ API 응답에 place_context 추가 (신규)    │
│ {                                       │
│   message: "...",                       │
│   collected: {...},                     │
│   place_context: {                      │  ← 신규 필드
│     search_query: "강남역 미용실",      │
│     region: "강남역",                   │
│     place_type: "미용실",               │
│     coordinates: { lat, lng } | null    │
│   },                                    │
│   search_results: [...] | null          │  ← 신규 필드
│ }                                       │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Dashboard State 업데이트                │
│ - mapCenter: 지역 좌표로 이동           │
│ - searchResults: 검색 결과 표시         │
│ - selectedPlace: 선택된 장소 정보       │
└─────────────────────────────────────────┘
       │
       ├──────────────────┬───────────────┐
       ▼                  ▼               ▼
   NaverMap           PlaceInfo       ChatMessage
   (지도 이동)        (테이블 표시)   (기존 대화)
```

### 4.2 상태 관리 구조

```typescript
// hooks/useDashboard.ts (신규)
interface DashboardState {
  // 사이드바
  isSidebarOpen: boolean;
  activeMenu: 'chat' | 'conversations' | 'reservations';
  
  // 지도
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;
  markers: MapMarker[];
  
  // 장소 정보
  searchResults: NaverPlaceResult[];
  selectedPlace: NaverPlaceResult | null;
  
  // 대화 목록
  conversations: ConversationSummary[];
  activeConversationId: string | null;
}
```

---

## 5. API 변경 사항

### 5.1 POST /api/chat 응답 확장

**현재 응답:**
```json
{
  "message": "OO미용실에 전화할 전화번호를 알려주세요!",
  "collected": { ... },
  "is_complete": false,
  "conversation_status": "COLLECTING"
}
```

**변경 후 응답:**
```json
{
  "message": "OO미용실에 전화할 전화번호를 알려주세요!",
  "collected": { ... },
  "is_complete": false,
  "conversation_status": "COLLECTING",
  "place_context": {                          // 신규
    "search_query": "강남역 미용실",
    "region": "강남역",
    "place_type": "미용실",
    "should_search": true
  },
  "search_results": [                         // 신규 (검색 실행 시)
    {
      "name": "OO미용실",
      "address": "서울 강남구 강남대로 123",
      "telephone": "02-1234-5678",
      "category": "미용실",
      "mapx": 127.0276,
      "mapy": 37.4979
    }
  ]
}
```

### 5.2 GET /api/conversations (신규)

**목적**: 사이드바 대화 목록 조회

**응답:**
```json
{
  "conversations": [
    {
      "id": "uuid-1",
      "status": "COMPLETED",
      "targetName": "OO미용실",
      "lastMessage": "예약이 완료되었습니다",
      "createdAt": "2026-02-07T10:30:00.000Z"
    }
  ]
}
```

---

## 6. 네이버지도 연동

### 6.1 지도 SDK 로드

```typescript
// components/map/NaverMapView.tsx
'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface Props {
  center: { lat: number; lng: number };
  zoom: number;
  markers: Array<{ lat: number; lng: number; title: string }>;
  onMarkerClick?: (index: number) => void;
}

export default function NaverMapView({ center, zoom, markers, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);

  // 지도 초기화 및 마커 설정 로직
  // ...
}
```

### 6.2 환경변수 추가

```bash
# .env.local
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_map_client_id  # 신규 (지도 표시용)
```

> **주의**: 기존 `NAVER_CLIENT_ID`는 검색 API용, 지도 표시용은 별도 Client ID 필요

### 6.3 지도 좌표 변환

네이버 Local Search API의 `mapx`, `mapy`는 카텍(KATEC) 좌표계 사용.
WGS84(위경도)로 변환 필요:

```typescript
// lib/coordinates.ts
export function katecToWgs84(mapx: number, mapy: number): { lat: number; lng: number } {
  // KATEC → WGS84 변환 로직
  // 또는 네이버 좌표 변환 API 사용
}
```

---

## 7. 구현 순서 (Phase)

### Phase 1: 레이아웃 기반 구축 (1-2시간)

1. **DashboardLayout 컴포넌트 생성**
   - 사이드바 + 메인 콘텐츠 영역 분리
   - 반응형 그리드 설정

2. **Sidebar 컴포넌트 생성**
   - 메뉴 아이템 (새 대화, 대화 기록, 예약 기록)
   - 접기/펼치기 기능

3. **app/layout.tsx 수정**
   - max-w-md 제거
   - 전체 너비 사용

4. **app/page.tsx 수정**
   - DashboardLayout 적용

### Phase 2: 지도 패널 구현 (1-2시간)

1. **NaverMapContainer 컴포넌트 생성**
   - 지도 SDK 로드
   - 기본 지도 표시

2. **MapMarker 컴포넌트 생성**
   - 검색 결과 마커 표시
   - 마커 클릭 이벤트

3. **좌표 변환 유틸리티**
   - KATEC → WGS84 변환

### Phase 3: 장소 정보 패널 구현 (1시간)

1. **PlaceInfoPanel 컴포넌트 생성**
   - 검색 결과 테이블 표시
   - 선택된 장소 상세 정보

2. **PlaceCard 컴포넌트 생성**
   - 개별 장소 카드 UI

### Phase 4: 상태 연동 (1-2시간)

1. **useDashboard 훅 생성**
   - 대시보드 전역 상태 관리
   - 채팅 ↔ 지도 ↔ 장소정보 연동

2. **API 응답 확장**
   - place_context 필드 추가
   - search_results 필드 추가

3. **useChat 훅 수정**
   - 장소 정보 상태 연동

### Phase 5: 사이드바 기능 완성 (1시간)

1. **ConversationList 컴포넌트 생성**
   - 지난 대화 목록 표시
   - 대화 선택 시 복원

2. **GET /api/conversations API 구현**
   - 대화 목록 조회

3. **예약 기록 연동**
   - 기존 /history 페이지 로직 재사용

### Phase 6: 반응형 및 마무리 (1시간)

1. **MobileDrawer 컴포넌트 생성**
   - 모바일 사이드바 드로어

2. **반응형 테스트**
   - Desktop / Tablet / Mobile

3. **UI 폴리싱**
   - 애니메이션, 트랜지션

---

## 8. 파일별 상세 구현 계획

### 8.1 components/dashboard/DashboardLayout.tsx

```typescript
'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatContainer from '@/components/chat/ChatContainer';
import NaverMapContainer from '@/components/map/NaverMapContainer';
import PlaceInfoPanel from '@/components/place/PlaceInfoPanel';
import { useDashboard } from '@/hooks/useDashboard';

export default function DashboardLayout() {
  const { 
    mapCenter, 
    searchResults, 
    selectedPlace,
    setSelectedPlace 
  } = useDashboard();

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        {/* Left: Chat */}
        <div className="h-full">
          <ChatContainer />
        </div>
        
        {/* Right: Map + PlaceInfo */}
        <div className="h-full flex flex-col gap-4">
          {/* Map (50%) */}
          <div className="flex-1">
            <NaverMapContainer 
              center={mapCenter}
              markers={searchResults}
              onMarkerClick={(place) => setSelectedPlace(place)}
            />
          </div>
          
          {/* PlaceInfo (50%) */}
          <div className="flex-1">
            <PlaceInfoPanel 
              results={searchResults}
              selected={selectedPlace}
              onSelect={setSelectedPlace}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 8.2 components/dashboard/Sidebar.tsx

```typescript
'use client';

import { useState } from 'react';
import { MessageSquare, History, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import SidebarMenu from './SidebarMenu';
import ConversationList from './ConversationList';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'chat' | 'conversations' | 'reservations'>('chat');

  return (
    <aside className={`
      bg-white border-r border-gray-200 transition-all duration-300
      ${isCollapsed ? 'w-16' : 'w-60'}
    `}>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 bg-white border rounded-full p-1"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        <SidebarMenu 
          icon={<MessageSquare />} 
          label="새 대화" 
          isCollapsed={isCollapsed}
          isActive={activeMenu === 'chat'}
          onClick={() => setActiveMenu('chat')}
        />
        <SidebarMenu 
          icon={<History />} 
          label="대화 기록" 
          isCollapsed={isCollapsed}
          isActive={activeMenu === 'conversations'}
          onClick={() => setActiveMenu('conversations')}
        />
        <SidebarMenu 
          icon={<Calendar />} 
          label="예약 기록" 
          isCollapsed={isCollapsed}
          isActive={activeMenu === 'reservations'}
          onClick={() => setActiveMenu('reservations')}
        />
      </nav>

      {/* Content based on active menu */}
      {!isCollapsed && activeMenu === 'conversations' && (
        <ConversationList />
      )}
    </aside>
  );
}
```

### 8.3 components/map/NaverMapContainer.tsx

```typescript
'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import type { NaverPlaceResult } from '@/lib/naver-maps';

interface Props {
  center: { lat: number; lng: number } | null;
  markers: NaverPlaceResult[];
  onMarkerClick?: (place: NaverPlaceResult) => void;
}

export default function NaverMapContainer({ center, markers, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);

  // 기본 중심점 (서울 시청)
  const defaultCenter = { lat: 37.5665, lng: 126.9780 };
  const activeCenter = center || defaultCenter;

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // 지도 초기화
    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(activeCenter.lat, activeCenter.lng),
      zoom: 15,
    });
    mapInstanceRef.current = map;

    // 마커 추가
    markers.forEach((place, index) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(place.mapy, place.mapx),
        map,
        title: place.name,
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerClick?.(place);
      });
    });

    return () => {
      map.destroy();
    };
  }, [mapLoaded, activeCenter, markers, onMarkerClick]);

  return (
    <>
      <Script
        src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        onLoad={() => setMapLoaded(true)}
      />
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg border border-gray-200"
      />
    </>
  );
}
```

### 8.4 components/place/PlaceInfoPanel.tsx

```typescript
'use client';

import type { NaverPlaceResult } from '@/lib/naver-maps';
import { MapPin, Phone, Tag } from 'lucide-react';

interface Props {
  results: NaverPlaceResult[];
  selected: NaverPlaceResult | null;
  onSelect: (place: NaverPlaceResult) => void;
}

export default function PlaceInfoPanel({ results, selected, onSelect }: Props) {
  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-400">
          <MapPin className="mx-auto mb-2" size={32} />
          <p>대화에서 장소를 언급하면</p>
          <p>여기에 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-2 text-left">상호명</th>
            <th className="px-4 py-2 text-left">주소</th>
            <th className="px-4 py-2 text-left">전화번호</th>
            <th className="px-4 py-2 text-left">카테고리</th>
          </tr>
        </thead>
        <tbody>
          {results.map((place, index) => (
            <tr 
              key={index}
              onClick={() => onSelect(place)}
              className={`
                cursor-pointer hover:bg-blue-50 transition-colors
                ${selected?.name === place.name ? 'bg-blue-100' : ''}
              `}
            >
              <td className="px-4 py-3 font-medium">{place.name}</td>
              <td className="px-4 py-3 text-gray-600">{place.roadAddress || place.address}</td>
              <td className="px-4 py-3 text-blue-600">{place.telephone || '-'}</td>
              <td className="px-4 py-3 text-gray-500">{place.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 8.5 hooks/useDashboard.ts

```typescript
'use client';

import { create } from 'zustand';
import type { NaverPlaceResult } from '@/lib/naver-maps';

interface ConversationSummary {
  id: string;
  status: string;
  targetName: string | null;
  lastMessage: string;
  createdAt: string;
}

interface DashboardState {
  // 사이드바
  isSidebarOpen: boolean;
  activeMenu: 'chat' | 'conversations' | 'reservations';
  
  // 지도
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;
  
  // 장소 정보
  searchResults: NaverPlaceResult[];
  selectedPlace: NaverPlaceResult | null;
  
  // 대화 목록
  conversations: ConversationSummary[];
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setActiveMenu: (menu: 'chat' | 'conversations' | 'reservations') => void;
  setMapCenter: (center: { lat: number; lng: number } | null) => void;
  setSearchResults: (results: NaverPlaceResult[]) => void;
  setSelectedPlace: (place: NaverPlaceResult | null) => void;
  setConversations: (conversations: ConversationSummary[]) => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  // Initial state
  isSidebarOpen: true,
  activeMenu: 'chat',
  mapCenter: null,
  mapZoom: 15,
  searchResults: [],
  selectedPlace: null,
  conversations: [],
  
  // Actions
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setActiveMenu: (menu) => set({ activeMenu: menu }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSelectedPlace: (place) => set({ selectedPlace: place }),
  setConversations: (conversations) => set({ conversations }),
}));
```

---

## 9. 타입 정의 추가 (shared/types.ts)

```typescript
// -----------------------------------------------------------------------------
// Place Context (대시보드용 - 신규)
// -----------------------------------------------------------------------------
export interface PlaceContext {
  search_query: string | null;
  region: string | null;
  place_type: string | null;
  should_search: boolean;
}

// ChatResponse 확장
export interface ChatResponseV2 extends ChatResponse {
  place_context?: PlaceContext;
  search_results?: NaverPlaceResult[];
}

// 대화 요약 (사이드바용)
export interface ConversationSummary {
  id: string;
  status: ConversationStatus;
  targetName: string | null;
  lastMessage: string;
  createdAt: string;
}
```

---

## 10. 환경변수 추가

```bash
# .env.local 추가 항목
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_map_client_id  # 지도 표시용 (Web Dynamic Map)
```

### 네이버 클라우드 플랫폼 설정
1. Application에 "Maps" 서비스 추가
2. Web Dynamic Map 사용 신청
3. 허용 도메인에 `localhost:3000`, 배포 도메인 추가

---

## 11. 의존성 추가

```bash
npm install zustand  # 상태 관리 (이미 있을 수 있음)
```

---

## 12. 리스크 및 고려사항

### 12.1 기술적 리스크

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| 네이버지도 SDK 로드 실패 | 중 | 폴백 UI 표시 (지도 없이 테이블만) |
| KATEC→WGS84 좌표 변환 오차 | 낮 | 네이버 좌표 변환 API 사용 |
| 모바일 레이아웃 복잡도 | 중 | 탭 기반 전환으로 단순화 |

### 12.2 UX 고려사항

1. **초기 로딩**: 지도 SDK 로드 시간 → 스켈레톤 UI 표시
2. **빈 상태**: 검색 결과 없을 때 → 안내 메시지 표시
3. **선택 피드백**: 장소 선택 시 → 지도 마커 하이라이트 + 테이블 행 강조

### 12.3 팀 역할 분담 (기존 규칙 기반)

| 컴포넌트 | 담당 | 근거 |
|----------|------|------|
| DashboardLayout, Sidebar | FE1 | layout 관련 |
| NaverMapContainer | FE1 | 새 UI 컴포넌트 |
| PlaceInfoPanel | FE1 | 새 UI 컴포넌트 |
| useDashboard | FE1 | hooks |
| API 응답 확장 (place_context) | BE1 | api/chat |
| GET /api/conversations | BE1 | api 라우트 |

---

## 13. 테스트 체크리스트

### Phase 1 완료 조건
- [ ] 사이드바가 표시되고 접기/펼치기 동작
- [ ] 메인 영역이 2컬럼으로 분할됨
- [ ] 기존 채팅 기능이 정상 동작

### Phase 2 완료 조건
- [ ] 네이버지도가 로드되고 표시됨
- [ ] 기본 위치(서울 시청)가 표시됨

### Phase 3 완료 조건
- [ ] 장소 정보 테이블이 표시됨
- [ ] 빈 상태 UI가 표시됨

### Phase 4 완료 조건
- [ ] 채팅에서 장소 언급 시 지도가 이동함
- [ ] 검색 결과가 테이블에 표시됨
- [ ] 테이블 행 클릭 시 지도 마커 선택됨

### Phase 5 완료 조건
- [ ] 사이드바에서 대화 기록 목록 표시
- [ ] 대화 선택 시 해당 대화로 전환
- [ ] 예약 기록 목록 표시

### Phase 6 완료 조건
- [ ] 모바일에서 드로어 동작
- [ ] 태블릿에서 레이아웃 정상
- [ ] 데스크톱에서 전체 기능 동작

---

## 14. 예상 결과물

### Before (현재)
```
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│                     │
│   ChatContainer     │
│   (max-w-md)        │
│                     │
└─────────────────────┘
```

### After (목표)
```
┌─────────────────────────────────────────────────┐
│ Header                                          │
├────────┬────────────────────────────────────────┤
│        │                                        │
│ Side   │  Chat (50%)    │  Map (50%)            │
│ bar    │                │  ┌──────────────────┐ │
│        │                │  │ 네이버지도       │ │
│ - 새   │  ┌──────────┐  │  │                  │ │
│   대화 │  │ 채팅     │  │  └──────────────────┘ │
│        │  │ 메시지   │  │  ┌──────────────────┐ │
│ - 대화 │  │          │  │  │ 장소 정보 테이블 │ │
│   기록 │  └──────────┘  │  │                  │ │
│        │  [입력창]      │  └──────────────────┘ │
│ - 예약 │                │                       │
│   기록 │                │                       │
└────────┴────────────────┴───────────────────────┘
```

---

## 15. 다음 단계

이 계획서를 검토한 후:

1. **승인 시**: Phase 1부터 순차적으로 구현 시작
2. **수정 필요 시**: 피드백 반영 후 계획 업데이트
3. **우선순위 변경 시**: Phase 순서 조정

---

> **작성자**: AI Assistant
> **검토 필요**: 프로젝트 리더
> **예상 총 작업 시간**: 6-10시간 (1인 기준)
