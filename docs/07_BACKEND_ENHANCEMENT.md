# 백엔드 비즈니스 로직 고도화 검토 (v2 → v3)

> **목적**: BE1 개발 완료 후 추가 개선 사항 검토
> **작성일**: 2026-02-07

---

## 1. Entities 효율적 저장 및 대화 연속성 개선

### 현재 문제점

1. **단순 JSONB 저장**: `collected_data`가 단일 JSONB 필드에 모든 정보를 저장
   - 구조화된 검색/인덱싱 불가
   - 부분 업데이트 시 전체 덮어쓰기
   - 타입 안정성 부족

2. **대화 컨텍스트 손실**: 
   - LLM에 전체 대화 기록만 전달 (최근 20개)
   - 이전 대화에서 수집한 정보가 명시적으로 전달되지 않음
   - 사용자가 "그 전에 말한 미용실" 같은 참조를 하면 인식 어려움

3. **Entity 추출 불완전**:
   - LLM이 매 턴마다 전체 `collected` 객체를 반환하지만, 이전 값이 null로 덮어쓰일 위험
   - 병합 로직이 있지만, LLM이 명시적으로 null을 보내면 기존 값이 사라짐

### 개선 방안

#### 1.1 구조화된 Entity 저장 (Supabase 테이블 분리)

**새 테이블: `conversation_entities`**

```sql
CREATE TABLE conversation_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- 'target_name', 'target_phone', 'service', etc.
  entity_value TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,  -- LLM이 확신하는 정도 (0.0-1.0)
  source_message_id UUID REFERENCES messages(id),  -- 어느 메시지에서 추출했는지
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, entity_type)  -- 같은 타입은 하나만
);

CREATE INDEX idx_entities_conversation ON conversation_entities(conversation_id);
CREATE INDEX idx_entities_type ON conversation_entities(entity_type);
```

**장점:**
- 각 Entity를 독립적으로 업데이트 가능
- 검색/필터링 용이 (예: "target_phone이 있는 모든 대화")
- 히스토리 추적 가능 (어느 메시지에서 추출했는지)
- Confidence 점수로 신뢰도 관리

**단점:**
- DB 스키마 변경 필요
- 기존 `collected_data` JSONB와 병행 운영 필요 (마이그레이션)

#### 1.2 대화 컨텍스트 강화 (Few-shot + Entity Context)

**개선된 System Prompt 구조:**

```typescript
export function buildSystemPrompt(
  existingEntities: ConversationEntity[],
  conversationHistory: Message[]
): string {
  const entityContext = existingEntities
    .map((e) => `- ${e.entity_type}: ${e.entity_value}`)
    .join('\n');

  return `
당신은 WIGVO의 AI 비서입니다.

## 현재까지 수집된 정보
${entityContext || '(아직 없음)'}

## 대화 규칙
1. 위 정보를 참고하여 중복 질문을 피하세요
2. 사용자가 "그 전에 말한 미용실" 같은 참조를 하면 위 정보를 활용하세요
3. 새로운 정보가 들어오면 기존 정보와 비교하여 업데이트하세요
...
`;
}
```

**LLM 메시지 구성 개선:**

```typescript
const llmMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { 
    role: 'system', 
    content: buildSystemPrompt(existingEntities, history) 
  },
  // 최근 대화만 포함 (전체가 아닌)
  ...history.slice(-10).map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  })),
];
```

#### 1.3 Entity 추출 및 저장 로직 개선

**새 함수: `extractAndSaveEntities`**

```typescript
async function extractAndSaveEntities(
  conversationId: string,
  messageId: string,
  parsedResponse: ParsedLLMResponse
) {
  const entities: Array<{
    entity_type: string;
    entity_value: string;
    confidence: number;
  }> = [];

  // collected 객체를 개별 entity로 변환
  Object.entries(parsedResponse.collected).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        // 배열은 각 항목을 별도 entity로 (예: fallback_datetimes)
        value.forEach((item) => {
          entities.push({
            entity_type: key,
            entity_value: String(item),
            confidence: 0.9, // 배열은 약간 낮은 신뢰도
          });
        });
      } else {
        entities.push({
          entity_type: key,
          entity_value: String(value),
          confidence: 1.0, // 명시적 추출은 높은 신뢰도
        });
      }
    }
  });

  // DB에 저장 (upsert)
  for (const entity of entities) {
    await supabase
      .from('conversation_entities')
      .upsert({
        conversation_id: conversationId,
        entity_type: entity.entity_type,
        entity_value: entity.entity_value,
        confidence: entity.confidence,
        source_message_id: messageId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id,entity_type',
      });
  }
}
```

**병합 로직 개선:**

```typescript
export function mergeCollectedData(
  existing: CollectedData,
  incoming: Partial<CollectedData>,
  // 새 파라미터: null을 명시적으로 보낸 경우 기존 값 유지
  preserveExisting: boolean = true
): CollectedData {
  return {
    // preserveExisting이 true면 null이어도 기존 값 유지
    target_name: preserveExisting 
      ? (incoming.target_name ?? existing.target_name)
      : (incoming.target_name !== undefined ? incoming.target_name : existing.target_name),
    // ... 나머지 필드도 동일
  };
}
```

---

## 2. SYSTEM_PROMPT 예제 (Few-shot Learning) 최적화

### 현재 상태

- 예제가 1개만 있음 (미용실 예약)
- 다양한 시나리오 커버 부족

### 개선 방안

#### 2.1 시나리오별 Few-shot 예제 추가

**예제 개수 권장:**
- **최소 3개**: RESERVATION, INQUIRY, AS_REQUEST 각 1개씩
- **권장 5-7개**: 각 시나리오별로 1-2개 + 엣지 케이스 1-2개
- **최대 10개**: 토큰 비용 고려 (gpt-4o-mini는 컨텍스트가 작음)

**예제 구조:**

```typescript
const FEW_SHOT_EXAMPLES = `
## 예시 대화 1: 미용실 예약 (RESERVATION)
사용자: "내일 오후 3시에 강남역 OO미용실 커트 예약해줘"
AI: "OO미용실에 전화할 전화번호를 알려주세요!"
사용자: "02-1234-5678"
AI: "좋아요! 정리해볼게요:\n\n📍 OO미용실 (02-1234-5678)\n📅 내일 오후 3시\n✂️ 커트\n\n맞으시면 전화 걸어볼게요!"
JSON: { "collected": { "target_name": "OO미용실", "target_phone": "02-1234-5678", "scenario_type": "RESERVATION", "primary_datetime": "내일 오후 3시", "service": "커트" }, "is_complete": true }

## 예시 대화 2: 매물 문의 (INQUIRY)
사용자: "직방에서 본 강남역 근처 빌라 201호 확인해줘"
AI: "해당 매물의 중개사 전화번호를 알려주세요."
사용자: "010-9876-5432"
AI: "알겠습니다! 매물 정보를 확인해볼게요."
JSON: { "collected": { "target_name": "중개사", "target_phone": "010-9876-5432", "scenario_type": "INQUIRY", "primary_datetime": null, "service": "매물 확인" }, "is_complete": true }

## 예시 대화 3: AS 요청 (AS_REQUEST)
사용자: "에어컨 고장났는데 수리 접수해줘"
AI: "어느 업체에 수리 요청하시나요?"
사용자: "삼성서비스센터 강남점"
AI: "전화번호를 알려주세요."
사용자: "1588-3366"
AI: "방문 가능한 날짜와 시간을 알려주세요."
사용자: "내일 오전 10시"
JSON: { "collected": { "target_name": "삼성서비스센터 강남점", "target_phone": "1588-3366", "scenario_type": "AS_REQUEST", "primary_datetime": "내일 오전 10시", "service": "에어컨 수리" }, "is_complete": true }
`;
```

**동적 예제 선택 (시나리오 감지 시):**

```typescript
export function buildSystemPromptWithExamples(
  detectedScenario?: ScenarioType
): string {
  let examples = '';
  
  if (detectedScenario === 'RESERVATION') {
    examples = RESERVATION_EXAMPLES; // 예약 관련 예제만
  } else if (detectedScenario === 'INQUIRY') {
    examples = INQUIRY_EXAMPLES;
  } else {
    examples = ALL_EXAMPLES; // 모든 예제
  }
  
  return `${BASE_PROMPT}\n\n${examples}`;
}
```

**토큰 비용 고려:**

| 모델 | 컨텍스트 | 예제 개수 권장 | 예상 토큰 |
|------|---------|--------------|----------|
| gpt-4o-mini | 128K | 5-7개 | ~2000-3000 |
| gpt-4o | 128K | 7-10개 | ~3000-4000 |

**권장:**
- 초기에는 3-5개 예제로 시작
- A/B 테스트로 예제 개수 최적화
- 시나리오별로 다른 예제 세트 사용 (동적 선택)

---

## 3. 네이버지도 검색 연동 (상호명/연락처 자동 수집)

### 현재 문제점

- 사용자가 직접 상호명과 전화번호를 입력해야 함
- "강남역 근처 미용실" 같은 모호한 표현 처리 불가

### 개선 방안

#### 3.1 네이버지도 API 연동

**필요한 것:**
- 네이버 클라우드 플랫폼 API 키
- Places API (장소 검색)

**구현 단계:**

**1단계: 장소 검색 함수**

```typescript
// lib/naver-maps.ts
interface NaverPlaceResult {
  name: string;
  address: string;
  roadAddress: string;
  telephone: string;
  category: string;
  mapx: number;
  mapy: number;
}

export async function searchNaverPlaces(
  query: string,
  location?: { lat: number; lng: number }
): Promise<NaverPlaceResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Naver API credentials not configured');
  }

  const params = new URLSearchParams({
    query,
    display: '5', // 최대 5개 결과
    sort: 'random', // 랜덤 정렬 (다양성)
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
    throw new Error(`Naver API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.items.map((item: any) => ({
    name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
    address: item.address,
    roadAddress: item.roadAddress,
    telephone: item.telephone,
    category: item.category,
    mapx: parseFloat(item.mapx),
    mapy: parseFloat(item.mapy),
  }));
}
```

**2단계: LLM이 장소 검색 필요 여부 판단**

**System Prompt에 추가:**

```
## 장소 검색 기능
사용자가 상호명만 말하고 전화번호를 모를 때:
1. "강남역 근처 미용실", "직방에서 본 빌라" 같은 표현 감지
2. 네이버지도 검색을 제안하거나 자동으로 검색
3. 검색 결과를 사용자에게 보여주고 선택하게 함

예시:
사용자: "강남역 근처 미용실 예약해줘"
AI: "강남역 근처 미용실을 검색해볼게요! 몇 개 찾았어요:
1. OO미용실 (02-1234-5678) - 강남대로 123
2. XX미용실 (02-2345-6789) - 테헤란로 456
어느 곳으로 예약할까요?"
```

**3단계: API Route에 검색 로직 통합**

```typescript
// app/api/chat/route.ts 수정

export async function POST(request: NextRequest) {
  // ... 기존 코드 ...

  // 6. LLM 메시지 구성 전에 장소 검색 필요 여부 확인
  const needsPlaceSearch = await detectPlaceSearchNeed(message, history);
  
  let placeSearchResults: NaverPlaceResult[] = [];
  if (needsPlaceSearch) {
    placeSearchResults = await searchNaverPlaces(
      extractSearchQuery(message),
      getUserLocation() // 브라우저 geolocation 또는 IP 기반
    );
    
    // 검색 결과를 LLM 컨텍스트에 추가
    llmMessages.push({
      role: 'system',
      content: `장소 검색 결과:\n${placeSearchResults.map((p, i) => 
        `${i + 1}. ${p.name} (${p.telephone}) - ${p.address}`
      ).join('\n')}`,
    });
  }

  // ... 나머지 코드 ...
}

async function detectPlaceSearchNeed(
  message: string,
  history: Message[]
): Promise<boolean> {
  // 키워드 기반 간단한 판단
  const searchKeywords = [
    '근처', '주변', '찾아', '검색', '어디', '직방', '네이버',
    '다음', '카카오맵', '지도'
  ];
  
  const hasKeyword = searchKeywords.some(kw => message.includes(kw));
  const hasNoPhone = !/\d{2,3}-\d{3,4}-\d{4}/.test(message);
  const hasPlaceName = /[가-힣]{2,10}(미용실|식당|병원|카페|마트|센터)/.test(message);
  
  return hasKeyword || (hasPlaceName && hasNoPhone);
}
```

**4단계: 사용자 선택 처리**

```typescript
// 사용자가 "1번" 또는 "OO미용실" 선택 시
// LLM이 선택을 인식하고 해당 장소 정보를 collected_data에 저장

// System Prompt 추가:
"사용자가 검색 결과에서 번호를 선택하면 (예: '1번', '첫 번째'), 
해당 장소의 이름과 전화번호를 collected 객체에 저장하세요."
```

#### 3.2 대안: Google Places API

**장점:**
- 더 많은 데이터 (전 세계)
- 더 정확한 전화번호

**단점:**
- 비용 발생 (요청당 과금)
- 한국 데이터가 네이버보다 부족할 수 있음

**권장:**
- 초기에는 네이버지도 API 사용 (무료 할당량)
- 필요시 Google Places API 병행

#### 3.3 캐싱 전략

**검색 결과 캐싱:**

```typescript
// Supabase에 검색 결과 캐시 테이블
CREATE TABLE place_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,  -- query의 해시값
  query_text TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

// 검색 전에 캐시 확인
async function searchPlacesWithCache(query: string) {
  const queryHash = hashQuery(query);
  
  const cached = await supabase
    .from('place_search_cache')
    .select('*')
    .eq('query_hash', queryHash)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (cached) {
    return cached.results;
  }
  
  // 캐시 없으면 API 호출
  const results = await searchNaverPlaces(query);
  
  // 캐시 저장
  await supabase.from('place_search_cache').insert({
    query_hash: queryHash,
    query_text: query,
    results,
  });
  
  return results;
}
```

---

## 4. 종합 개선 로드맵

### Phase 1: 즉시 적용 가능 (1-2일)

1. ✅ **Few-shot 예제 추가** (3-5개)
   - System Prompt에 예제 추가
   - 시나리오별 예제 동적 선택

2. ✅ **Entity 추출 로직 개선**
   - `mergeCollectedData`에서 null 보존 로직 강화
   - LLM이 명시적으로 null을 보내지 않도록 프롬프트 수정

### Phase 2: 중기 개선 (3-5일)

3. ✅ **대화 컨텍스트 강화**
   - System Prompt에 기존 수집 정보 명시적 전달
   - "그 전에 말한..." 같은 참조 처리

4. ✅ **네이버지도 검색 연동**
   - API 키 발급 및 연동
   - 검색 필요 여부 자동 감지
   - 사용자 선택 처리

### Phase 3: 장기 개선 (1-2주)

5. ✅ **구조화된 Entity 저장**
   - `conversation_entities` 테이블 생성
   - 기존 `collected_data` JSONB와 병행 운영
   - 점진적 마이그레이션

6. ✅ **고급 기능**
   - Confidence 점수 기반 Entity 업데이트
   - 히스토리 추적 (어느 메시지에서 추출했는지)
   - Entity 검색/필터링 API

---

## 5. 구현 우선순위 추천

| 우선순위 | 기능 | 예상 효과 | 구현 난이도 |
|---------|------|----------|-----------|
| 🔥 **P0** | Few-shot 예제 추가 (3-5개) | LLM 응답 품질 향상 | ⭐ 쉬움 |
| 🔥 **P0** | Entity null 보존 로직 강화 | 정보 손실 방지 | ⭐ 쉬움 |
| ⚡ **P1** | 대화 컨텍스트 강화 | 참조 처리 개선 | ⭐⭐ 보통 |
| ⚡ **P1** | 네이버지도 검색 연동 | 사용자 편의성 향상 | ⭐⭐⭐ 어려움 |
| 📊 **P2** | 구조화된 Entity 저장 | 확장성 향상 | ⭐⭐⭐⭐ 매우 어려움 |

**권장:**
- 해커톤 후 즉시 P0 적용
- P1은 MVP 완성 후 적용
- P2는 사용자 증가 후 적용

---

## 6. 참고 자료

- [네이버 클라우드 플랫폼 - Local Search API](https://www.ncloud.com/product/applicationService/aiService/localSearch)
- [OpenAI Few-shot Learning 가이드](https://platform.openai.com/docs/guides/few-shot-learning)
- [Supabase JSONB 인덱싱](https://supabase.com/docs/guides/database/extensions/pg_trgm)
