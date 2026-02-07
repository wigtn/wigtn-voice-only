# Tech Spec: 채팅 기반 정보 수집 아키텍처

> 채팅으로 정보 수집 → 구조화된 데이터 추출 → Dynamic System Prompt 생성

---

## 0. DB 연동 전략

### 비교: 실시간 저장 vs 최종 저장

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Option A: 실시간 DB 저장                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User ──→ API ──→ Supabase 저장 ──→ LLM (DB 컨텍스트 포함)             │
│                        │                     │                          │
│                        ▼                     ▼                          │
│                   messages 테이블      최신 대화 기록 조회               │
│                                                                         │
│  장점:                                                                  │
│  • 새로고침/재접속해도 대화 유지                                         │
│  • 다른 디바이스에서 이어서 대화 가능                                     │
│  • 서버 재시작해도 데이터 유지                                           │
│  • 대화 기록 분석/통계 가능                                              │
│                                                                         │
│  단점:                                                                  │
│  • 매 메시지마다 DB I/O 발생                                            │
│  • 약간의 레이턴시 추가                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Option B: 메모리 유지 + 최종 저장                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User ──→ API ──→ 메모리/세션 유지 ──→ 완료 시 DB 저장                  │
│                        │                     │                          │
│                        ▼                     ▼                          │
│                  서버 메모리         conversations 테이블               │
│                  (또는 Redis)        (최종 결과만)                       │
│                                                                         │
│  장점:                                                                  │
│  • 빠름 (DB I/O 최소화)                                                 │
│  • 구현 단순                                                            │
│                                                                         │
│  단점:                                                                  │
│  • 새로고침하면 대화 손실                                                │
│  • 서버리스 환경에서 세션 유지 어려움 (Vercel 등)                        │
│  • 중간 대화 기록 없음                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 권장: Option A (실시간 DB 저장)

**이유:**
1. Next.js on Vercel = Serverless → 메모리 세션 유지 불가
2. Supabase Realtime 활용 가능
3. 대화 중간에 이탈해도 복구 가능
4. 해커톤 데모 중 새로고침해도 안전

---

### DB 스키마 설계

다음 테이블들을 Supabase SQL로 생성합니다:

- **conversations**: 대화 세션 테이블
  - `id` UUID PK (gen_random_uuid)
  - `user_id` UUID FK → auth.users(id)
  - `status` TEXT (기본값: 'COLLECTING') — 가능한 값: COLLECTING, READY, CALLING, COMPLETED, CANCELLED
  - `collected_data` JSONB (기본값: '{}') — 수집된 정보 최신 상태
  - `created_at`, `updated_at` TIMESTAMPTZ

- **messages**: 대화 메시지 테이블
  - `id` UUID PK (gen_random_uuid)
  - `conversation_id` UUID FK → conversations(id) ON DELETE CASCADE
  - `role` TEXT ('user' | 'assistant')
  - `content` TEXT
  - `metadata` JSONB (기본값: '{}') — 파싱된 데이터 등
  - `created_at` TIMESTAMPTZ

- **인덱스**: conversation_id, user_id, status 별 인덱스 생성
- **RLS**: 본인 대화만 접근 가능하도록 Row Level Security 정책 설정

> 이 스키마에 맞는 SQL DDL을 구현합니다.

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        실시간 DB 저장 흐름                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. 대화 시작                                                           │
│     ─────────────                                                       │
│     POST /api/conversations                                             │
│         │                                                               │
│         ├── conversations 테이블에 새 레코드 생성                        │
│         │   { id, user_id, status: 'COLLECTING', collected_data: {} }  │
│         │                                                               │
│         └── 초기 인사 메시지 저장                                        │
│             messages { role: 'assistant', content: '안녕하세요!' }      │
│                                                                         │
│  2. 메시지 전송                                                          │
│     ─────────────                                                       │
│     POST /api/chat                                                      │
│         │                                                               │
│         ├── ① 사용자 메시지 DB 저장                                     │
│         │   messages { role: 'user', content: '...' }                  │
│         │                                                               │
│         ├── ② DB에서 최근 메시지 조회 (최대 20개)                        │
│         │   SELECT * FROM messages                                      │
│         │   WHERE conversation_id = ? ORDER BY created_at              │
│         │                                                               │
│         ├── ③ LLM 호출 (조회된 대화 기록 포함)                           │
│         │                                                               │
│         ├── ④ Assistant 응답 파싱                                       │
│         │   { message, collected_data, is_complete }                   │
│         │                                                               │
│         ├── ⑤ Assistant 메시지 DB 저장                                  │
│         │   messages { role: 'assistant', content: '...' }             │
│         │                                                               │
│         └── ⑥ 수집 데이터 업데이트                                       │
│             UPDATE conversations                                        │
│             SET collected_data = ?,                                     │
│                 status = ?,                                             │
│                 updated_at = NOW()                                      │
│                                                                         │
│  3. 전화 시작                                                           │
│     ─────────────                                                       │
│     POST /api/calls                                                     │
│         │                                                               │
│         ├── conversations.collected_data 조회                           │
│         │                                                               │
│         ├── calls 테이블에 레코드 생성                                   │
│         │                                                               │
│         └── conversations.status = 'CALLING'                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 구현 코드

`lib/supabase/chat.ts` 파일에 다음 함수들을 구현합니다:

- **createConversation(userId)**: 대화 세션 생성 + 초기 인사 메시지 저장
- **getConversationHistory(conversationId)**: 대화 기록 조회 (LLM 컨텍스트용, 최근 20개, created_at 오름차순)
- **saveMessage(conversationId, role, content, metadata?)**: 메시지 저장
- **updateCollectedData(conversationId, collectedData, status?)**: 수집 데이터 및 상태 업데이트
- **getConversation(conversationId)**: 대화 세션 + 메시지 전체 조회 (복구용)

**메시지 정렬 요구사항:**
Supabase `select('*, messages(*)')` 사용 시 중첩 relation의 정렬이 **보장되지 않습니다**. 반드시 `created_at` 오름차순 정렬을 명시하거나, 조회 후 클라이언트에서 정렬하세요.

> 위 스펙에 맞는 Supabase CRUD 함수들을 구현합니다.

### API Route 수정

`app/api/chat/route.ts`에 POST 핸들러를 구현합니다:

1. 사용자 메시지 DB 저장
2. DB에서 대화 기록 조회
3. System Prompt + 대화 기록으로 LLM 메시지 배열 구성
4. OpenAI API 호출 (gpt-4o-mini, temperature: 0.7)
5. 응답 파싱 (message, collected, is_complete 추출)
6. Assistant 메시지 DB 저장 (metadata에 collected, is_complete 포함)
7. 수집 데이터 업데이트 (is_complete 시 상태를 'READY'로)
8. 응답 반환: { message, collected, is_complete }

> 위 스펙에 맞는 API Route를 구현합니다.

---

### 대화 복구 (새로고침 시)

`hooks/useChat.ts`에 대화 복구 로직을 구현합니다:

- **resumeConversation(conversationId)**: `/api/conversations/{id}`에서 대화 데이터를 가져와 메시지 목록, 수집 데이터, 완료 상태를 복원
- **페이지 로드 시**: localStorage에서 currentConversationId 확인 → 있으면 resumeConversation, 없으면 startConversation

> 위 스펙에 맞는 복구 로직을 구현합니다.

---

### 요약 생성 방식

DB에 대화가 저장되어 있으므로, 요약은 두 가지 방식 가능:

#### 방식 1: 실시간 추적 (권장)

매 턴마다 LLM이 `collected_data`를 업데이트 → 최종 상태가 곧 요약

(이미 위 API Route에서 구현되는 방식입니다.)

#### 방식 2: 사후 요약 (필요 시)

대화 완료 후 전체 기록으로 요약 생성

`lib/summarizer.ts`에 summarizeConversation(conversationId) 함수를 구현합니다:
- 대화 기록 전체를 조회
- 수집된 정보를 JSON으로 요약하라는 프롬프트와 함께 GPT 호출 (temperature: 0)
- 파싱된 JSON 반환

> 위 스펙에 맞는 요약 함수를 구현합니다.

**권장: 방식 1** (실시간 추적)
- 추가 API 호출 불필요
- 항상 최신 상태 유지
- is_complete 판단도 동시에 가능

---

## 1. 아키텍처 선택

### 비교 분석

| 접근법 | 복잡도 | 의존성 | 해커톤 적합 |
|--------|--------|--------|------------|
| LangChain SummaryMemory | 높음 | langchain | ❌ 목적 불일치 (요약 vs 추출) |
| LangChain BufferMemory + StructuredOutput | 중간 | langchain, zod | ⚠️ 과한 복잡도 |
| **직접 구현 (Stateful Chat)** | 낮음 | openai만 | ✅ 권장 |

### 선택: 직접 구현

**이유:**
1. 대화 길이가 짧음 (5-10턴) → SummaryMemory 불필요
2. LangChain 러닝커브 → 해커톤 시간 낭비
3. 완전한 제어 가능 → 디버깅 용이
4. Next.js API Routes와 자연스러운 통합

---

## 2. 핵심 설계

### 2.1 State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Conversation State Machine                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    정보 부족     ┌──────────┐    정보 충분           │
│  │ INITIAL  │ ──────────────→ │COLLECTING│ ──────────────→ READY  │
│  └──────────┘                 └──────────┘                         │
│       │                            │                                │
│       │         사용자 취소         │                                │
│       └─────────────────────────→ CANCELLED                        │
│                                                                     │
│  State 전이 조건:                                                   │
│  - INITIAL → COLLECTING: 첫 메시지 수신                             │
│  - COLLECTING → READY: 필수 정보 모두 수집 완료                      │
│  - READY → CALLING: [전화 걸기] 클릭                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 구조

`types/chat.ts`에 다음 타입들을 정의합니다:

- **Message**: id(string), role('user'|'assistant'), content(string), timestamp(Date)

- **CollectedData**:
  - 필수: target_name(string|null), target_phone(string|null), scenario_type('RESERVATION'|'INQUIRY'|'AS_REQUEST'|null), primary_datetime(string|null, ISO 8601)
  - 선택: service(string|null), fallback_datetimes(string[]), fallback_action('ask_available'|'next_day'|'cancel'|null), customer_name(string|null), party_size(number|null), special_request(string|null)

- **ConversationState**: id(string), status('INITIAL'|'COLLECTING'|'READY'|'CALLING'|'COMPLETED'|'CANCELLED'), messages(Message[]), collectedData(CollectedData), missingFields(string[]), createdAt(Date), updatedAt(Date)

> 위 스펙에 맞는 TypeScript 타입/인터페이스를 구현합니다.

### 2.3 CollectedData 병합 규칙

매 턴마다 LLM이 반환하는 collected 객체를 기존 데이터와 병합할 때:

| 필드 타입 | 규칙 | 예시 |
|----------|------|------|
| string 필드 | 새 값이 null이 아니면 덮어쓰기, null이면 기존 유지 | target_name: "OO" → 유지 |
| 배열 필드 (fallback_datetimes) | 새 배열이 비어있지 않을 때만 교체 | [] → 기존 유지, ["4시"] → 교체 |
| number 필드 (party_size) | null이 아닌 값만 덮어쓰기 | null → 기존 유지 |

### 2.4 수집 완료 판단 로직

`lib/collection-checker.ts`에 checkCollectionStatus 함수를 구현합니다:

- **필수 필드**: target_name, target_phone, scenario_type, primary_datetime
- **권장 필드**: fallback_datetimes (최소 1개), fallback_action

판정 로직:
- 필수 필드 중 null/undefined인 것을 missingRequired로 수집
- 권장 필드 중 빈 것을 missingRecommended로 수집
- isComplete = (missingRequired 길이 === 0)

반환값: { isComplete, missingRequired, missingRecommended }

> 위 스펙에 맞는 판단 함수를 구현합니다.

---

## 3. LLM 프롬프트 설계

### 3.1 System Prompt (정보 수집 에이전트)

`lib/prompts.ts`에 COLLECTION_SYSTEM_PROMPT 상수를 정의합니다. 내용:

**역할**: WIGVO의 AI 비서. 사용자의 전화 예약/문의 요청에 필요한 정보를 대화로 수집.

**수집할 정보 (필수):**
1. target_name: 전화할 곳 이름 (예: "OO미용실")
2. target_phone: 전화번호 (예: "010-1234-5678")
3. scenario_type: 용건 유형 — RESERVATION / INQUIRY / AS_REQUEST
4. primary_datetime: 희망 일시 (예: "내일 오후 3시")

**수집할 정보 (권장):**
5. service: 구체적 서비스 (예: "남자 커트")
6. fallback_datetimes: 대안 시간
7. fallback_action: 불가 시 대응 (ask_available / next_day / cancel)
8. customer_name: 예약자 이름
9. party_size: 인원수
10. special_request: 특별 요청

**대화 규칙:**
1. 한 번에 1-2개 질문만
2. 자연스러운 해요체 사용
3. 모호한 답변은 명확히 재확인
4. 정보가 충분하면 요약 후 확인 요청

**출력 형식:** 매 응답마다 마크다운 JSON 코드블록 포함:
```json
{
  "collected": {
    "target_name": "OO미용실",
    "target_phone": null,
    "scenario_type": "RESERVATION",
    "primary_datetime": null,
    "service": "남자 커트",
    "fallback_datetimes": [],
    "fallback_action": null,
    "customer_name": null,
    "party_size": null,
    "special_request": null
  },
  "is_complete": false,
  "next_question": "target_phone"
}
```

**완료 시:** 모든 필수 정보 + 최소 1개 대안 정보 수집 완료 시 → 수집 정보 요약 + "맞으시면 전화 걸어볼게요!" + is_complete: true

> 위 내용을 System Prompt 문자열 상수로 구현합니다.

### 3.2 응답 파싱

`lib/response-parser.ts`에 parseAssistantResponse 함수를 구현합니다:

반환 타입: { message(string), collected(CollectedData), is_complete(boolean), next_question?(string) }

파싱 로직:
1. 정규식으로 ```json ... ``` 블록 추출
2. 블록 없으면 fallback: 전체 content를 message로, 빈 CollectedData, is_complete=false
3. 블록 있으면 JSON.parse → collected, is_complete, next_question 추출
4. JSON 블록을 제거한 나머지 텍스트를 message로 사용

> 위 스펙에 맞는 파싱 함수를 구현합니다.

---

## 4. API 설계

### 4.1 채팅 API

`app/api/chat/route.ts` — POST 핸들러

처리 흐름:
1. 요청에서 conversationId, message 추출
2. 기존 대화 기록 조회
3. System Prompt + 대화 기록 + 새 사용자 메시지로 LLM 메시지 배열 구성
4. OpenAI 호출 (gpt-4o-mini, temperature: 0.7)
5. 응답 파싱
6. 상태 업데이트 (메시지 추가, collectedData 갱신, 완료 시 status='READY')
7. 응답 반환: { message, collected, is_complete, conversation_status }

> 위 스펙에 맞는 API Route를 구현합니다.

### 4.2 대화 시작 API

`app/api/conversations/route.ts` — POST 핸들러

처리 흐름:
1. 새 conversation 생성 (status: 'INITIAL', 빈 collectedData)
2. 초기 인사 메시지 저장 (role: 'assistant')
3. 응답 반환: { conversationId, message }

> 위 스펙에 맞는 API Route를 구현합니다.

---

## 5. 프론트엔드 연동

### 5.1 Chat Hook

`hooks/useChat.ts`에 useChat 커스텀 훅을 구현합니다:

**상태:**
- conversationId, messages, collectedData, isComplete, isLoading

**함수:**
- startConversation(): POST /api/conversations → conversationId 저장, 초기 메시지 설정
- sendMessage(content): Optimistic update → POST /api/chat → 응답 메시지 추가, collectedData/isComplete 업데이트

**반환:** { messages, collectedData, isComplete, isLoading, sendMessage, startConversation }

> 위 스펙에 맞는 React 훅을 구현합니다.

### 5.2 Chat UI Component

`components/chat/ChatContainer.tsx`에 채팅 컨테이너 컴포넌트를 구현합니다:

**구성:**
- useChat 훅 사용
- useEffect로 startConversation 호출
- 메시지 목록 렌더링 (ChatMessage 컴포넌트)
- 로딩 표시 ("입력 중...")
- 수집 완료 시: CollectionSummary (수집 정보 요약 + 전화 걸기/수정 버튼)
- 수집 미완료 시: ChatInput (메시지 입력창)
- 전화 걸기 클릭 시: POST /api/calls → 통화 중 화면으로 이동

> 위 스펙에 맞는 React 컴포넌트를 구현합니다.

---

## 6. 대안: LangChain 사용 시

만약 LangChain을 쓴다면:

- `BufferMemory`로 대화 기록 자동 관리
- `StructuredOutputParser` + Zod 스키마로 CollectedData JSON 추출 보장
- `ConversationChain`으로 체인 구조 확장

**LangChain 장점:**
- `BufferMemory`가 대화 기록 자동 관리
- `StructuredOutputParser`가 JSON 추출 보장
- 체인 구조로 확장 용이

**단점:**
- 의존성 추가 (`langchain`, `@langchain/openai`, `zod`)
- 추상화 레이어로 디버깅 어려움
- 해커톤 시간 내 러닝커브

---

## 7. 최종 권장 사항

### 해커톤용: 직접 구현

```
의존성: openai 만
복잡도: 낮음
파일 수: 3-4개
구현 시간: 1-2시간
```

### 프로덕션용: LangChain 고려

```
의존성: langchain, @langchain/openai, zod
복잡도: 중간
장점: 확장성, 메모리 관리, 타입 안전
구현 시간: 3-4시간 (러닝커브 포함)
```

---

## 8. 구현 체크리스트

### 직접 구현 시

- [ ] `types/chat.ts` - 타입 정의
- [ ] `lib/collection-checker.ts` - 수집 완료 판단
- [ ] `lib/response-parser.ts` - LLM 응답 파싱
- [ ] `app/api/conversations/route.ts` - 대화 시작
- [ ] `app/api/chat/route.ts` - 메시지 전송
- [ ] `hooks/useChat.ts` - 프론트엔드 훅
- [ ] `components/chat/*.tsx` - UI 컴포넌트

### 테스트 시나리오

1. 미용실 예약 (기본)
2. 대안 시간 수집
3. 정보 불명확 → 재질문
4. 수집 완료 → 요약 표시
