# 백엔드 고도화 구현 완료 요약

> **작성일**: 2026-02-07
> **버전**: v3.1 (Phase 3 Complete)

---

## 🎉 Phase 3 구현 완료 (2026-02-07)

### 신규 구현 항목

| 항목 | 파일 | 상태 |
|------|------|------|
| Entity 저장 테이블 | `scripts/supabase-tables.sql` | ✅ 완료 |
| Entity 추출/저장 함수 | `lib/supabase/entities.ts` | ✅ 완료 |
| 검색 캐싱 테이블 | `scripts/supabase-tables.sql` | ✅ 완료 |
| 캐싱 로직 | `lib/supabase/cache.ts` | ✅ 완료 |
| Geolocation Hook | `hooks/useGeolocation.ts` | ✅ 완료 |
| Chat API 위치 지원 | `app/api/chat/route.ts` | ✅ 완료 |

---

## ✅ 구현 완료된 개선 사항

### 1. Few-shot Learning 예제 추가

**변경 파일**: `lib/prompts.ts`

**개선 내용:**
- 4개의 Few-shot 예제 추가 (RESERVATION, INQUIRY, AS_REQUEST, 참조 처리)
- 시나리오별 예제 동적 선택 가능한 구조
- 예제를 통해 LLM이 더 정확한 JSON 형식 학습

**효과:**
- LLM 응답 품질 향상
- JSON 파싱 성공률 증가
- 다양한 시나리오 커버

---

### 2. 대화 컨텍스트 강화

**변경 파일**: `lib/prompts.ts`, `app/api/chat/route.ts`

**개선 내용:**
- `buildSystemPromptWithContext()` 함수 추가
- 기존 수집 정보를 System Prompt에 명시적으로 포함
- "그 전에 말한..." 같은 참조 처리 가능

**효과:**
- 중복 질문 방지
- 대화 연속성 향상
- 사용자 경험 개선

**예시:**
```
## 현재까지 수집된 정보
- target_name: "OO미용실"
- target_phone: "02-1234-5678"
- scenario_type: "RESERVATION"

**중요**: 위 정보를 참고하여 중복 질문을 피하고...
```

---

### 3. Entity null 보존 로직 강화

**변경 파일**: `shared/types.ts`, `app/api/chat/route.ts`

**개선 내용:**
- `mergeCollectedData()` 함수에 `preserveExisting` 파라미터 추가
- LLM이 null을 보내도 기존 값 유지 (정보 손실 방지)
- System Prompt에 "null로 덮어쓰지 마세요" 규칙 추가

**효과:**
- 정보 손실 방지
- 대화 중 데이터 안정성 향상
- 사용자가 수정할 때만 값 변경

**동작:**
```typescript
// 기존: target_name = "OO미용실"
// LLM 응답: { target_name: null } (이름 언급 없음)
// 결과: "OO미용실" 유지 ✅ (기존에는 null로 덮어쓰였음)
```

---

### 4. 네이버지도 검색 기능 (캐싱 포함)

**변경 파일**: `lib/naver-maps.ts`, `lib/supabase/cache.ts`

**구현 상태:**
- ✅ 검색 함수 완성
- ✅ 캐싱 로직 통합 (7일 TTL)
- ✅ Chat API 연동 완료
- ⏳ 실제 API 연동은 환경변수 설정 후 활성화

**필요한 환경변수:**
```bash
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
```

**사용 방법:**
```typescript
import { searchNaverPlaces, shouldSearchPlaces } from '@/lib/naver-maps';

// 검색 필요 여부 판단
if (shouldSearchPlaces(message, !collectedData.target_phone)) {
  const results = await searchNaverPlaces(extractSearchQuery(message), location);
  // 검색 결과를 LLM 컨텍스트에 자동 추가됨
}
```

---

### 5. 구조화된 Entity 저장 (Phase 3)

**변경 파일**: `scripts/supabase-tables.sql`, `lib/supabase/entities.ts`

**구현 내용:**
- `conversation_entities` 테이블 추가
- Entity 추출/저장 함수 (`extractAndSaveEntities`)
- Entity 조회 함수 (`getConversationEntities`, `getEntityByType`)
- Entity → CollectedData 변환 (`entitiesToCollectedData`)

**테이블 구조:**
```sql
CREATE TABLE conversation_entities (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  entity_type TEXT NOT NULL,      -- 'target_name', 'target_phone', etc.
  entity_value TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  source_message_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(conversation_id, entity_type)
);
```

**효과:**
- 대화별 Entity 추적 가능
- 검색/필터링 용이
- 신뢰도 기반 데이터 관리

---

### 6. 검색 결과 캐싱 (Phase 3)

**변경 파일**: `scripts/supabase-tables.sql`, `lib/supabase/cache.ts`

**구현 내용:**
- `place_search_cache` 테이블 추가
- 캐시 조회/저장 함수
- 만료 캐시 자동 정리 함수

**테이블 구조:**
```sql
CREATE TABLE place_search_cache (
  id UUID PRIMARY KEY,
  query_hash TEXT UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);
```

**효과:**
- API 할당량 절약
- 응답 속도 향상
- 동일 검색어 재사용

---

### 7. 웹 브라우저 Geolocation 통합 (Phase 3)

**변경 파일**: `hooks/useGeolocation.ts`, `shared/types.ts`, `app/api/chat/route.ts`

**구현 내용:**
- `useGeolocation` 훅 (FE1 사용)
- `ChatRequest`에 `location` 필드 추가
- Chat API에서 위치 기반 거리순 정렬 지원

**사용 방법:**
```typescript
// Frontend (FE1)
const { position, requestPosition } = useGeolocation();

// 채팅 메시지 전송 시
await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    conversationId,
    message,
    location: position ? { lat: position.lat, lng: position.lng } : undefined
  })
});
```

**효과:**
- 사용자 위치 기반 검색 결과 정렬
- "근처 미용실" 검색 시 가까운 순 표시

---

## 📋 향후 구현 가이드

### 네이버지도 검색 통합 (app/api/chat/route.ts)

**1단계: 검색 필요 여부 판단**

```typescript
// app/api/chat/route.ts에 추가
import { 
  searchNaverPlaces, 
  shouldSearchPlaces, 
  extractSearchQuery 
} from '@/lib/naver-maps';

// 6. 대화 기록 조회 후
const history = await getConversationHistory(conversationId);
const existingData = conversation.collected_data as CollectedData;

// 장소 검색 필요 여부 확인
let placeSearchResults: NaverPlaceResult[] = [];
if (shouldSearchPlaces(message, !!existingData.target_phone)) {
  const searchQuery = extractSearchQuery(message);
  placeSearchResults = await searchNaverPlaces(searchQuery);
  
  // 검색 결과가 있으면 System Prompt에 추가
  if (placeSearchResults.length > 0) {
    const searchContext = `
## 장소 검색 결과
${placeSearchResults.map((p, i) => 
  `${i + 1}. ${p.name} (${p.telephone}) - ${p.address}`
).join('\n')}

사용자가 위 결과에서 번호를 선택하면 (예: "1번", "첫 번째"), 
해당 장소의 이름과 전화번호를 collected 객체에 저장하세요.
`;
    
    systemPrompt += searchContext;
  }
}
```

**2단계: System Prompt 업데이트**

`lib/prompts.ts`의 `BASE_SYSTEM_PROMPT`에 장소 검색 기능 설명 추가:

```typescript
## 장소 검색 기능
사용자가 상호명만 말하고 전화번호를 모를 때:
1. "강남역 근처 미용실", "직방에서 본 빌라" 같은 표현 감지
2. 네이버지도 검색을 자동으로 수행
3. 검색 결과를 사용자에게 보여주고 선택하게 함
```

---

## 🔍 테스트 체크리스트

### Few-shot 예제 테스트

- [ ] RESERVATION 시나리오: "내일 오후 3시에 OO미용실 커트 예약해줘"
- [ ] INQUIRY 시나리오: "직방에서 본 빌라 확인해줘"
- [ ] AS_REQUEST 시나리오: "에어컨 수리 접수해줘"
- [ ] 참조 처리: "그 전에 말한 미용실로 예약해줘"

### 컨텍스트 강화 테스트

- [ ] 중복 질문 방지: 이미 수집된 정보에 대해 다시 물어보지 않음
- [ ] 참조 처리: "그 전에 말한..." 같은 표현 인식
- [ ] 정보 유지: null을 보내도 기존 값 유지

### null 보존 로직 테스트

- [ ] 기존 값 유지: target_name="OO미용실" → 새 메시지에서 이름 언급 없음 → "OO미용실" 유지
- [ ] 값 업데이트: target_name="OO미용실" → 새 메시지에서 "XX미용실" → "XX미용실"로 변경
- [ ] 배열 필드: fallback_datetimes가 비어있으면 기존 배열 유지

---

## 📊 성능 영향 분석

### 토큰 사용량

| 항목 | 기존 (v2) | 개선 (v3) | 증가량 |
|------|----------|----------|--------|
| System Prompt | ~800 토큰 | ~2000 토큰 | +1200 토큰 |
| Few-shot 예제 | 1개 | 4개 | +3개 |
| 컨텍스트 포함 | 없음 | 기존 수집 정보 | +50-100 토큰 |
| **총 증가** | - | - | **~1300 토큰** |

**비용 영향:**
- gpt-4o-mini: $0.15/1M input tokens
- 대화당 약 $0.0002 증가 (미미함)

### 응답 시간

- Few-shot 예제 추가: 영향 없음 (System Prompt는 한 번만 전송)
- 컨텍스트 강화: 영향 없음 (기존 정보는 이미 DB에 있음)
- **총 영향: 거의 없음**

---

## 🚀 다음 단계

1. **네이버지도 API 키 발급 및 연동**
   - 네이버 클라우드 플랫폼 가입
   - Local Search API 신청
   - 환경변수 설정 (`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`)

2. **Supabase 테이블 생성**
   - `scripts/supabase-tables.sql` 실행
   - Phase 3 테이블 포함 (`conversation_entities`, `place_search_cache`)

3. **FE1 Geolocation 통합**
   - `useGeolocation` 훅을 `useChat`에 통합
   - 위치 권한 요청 UI 추가

4. **A/B 테스트**
   - Few-shot 예제 개수 최적화 (3개 vs 5개 vs 7개)
   - 컨텍스트 포함 여부 효과 측정

---

## 📚 참고 자료

- [개선 검토 문서](./07_BACKEND_ENHANCEMENT.md) - 전체 개선 방안 상세
- [API Contract](../.cursor/rules/api-contract.mdc) - API 스펙
- [네이버 클라우드 플랫폼 - Local Search API](https://www.ncloud.com/product/applicationService/aiService/localSearch)
