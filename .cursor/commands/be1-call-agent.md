# BE1: API + DB 개발 지시서 (v2)

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: BE1 - API + DB 담당
> **담당 시간**: Phase 0 리드 + Phase 1 (0:00-2:00)
> **버전**: v2 (Dynamic Agent Platform - 채팅 기반 정보 수집)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("BE1-1 시작해", "API 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("채팅 API 전체 설계해줘", "어떻게 구현할지 계획 세워줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("API가 500 에러 나", "대화가 저장 안 돼") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("이 구조 어떻게 돼있어?", "types.ts 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

> 명시적 모드 지정이 없으면 **Agent 모드**로 진행하세요.

---

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)
4. **`docs/TECH_chat-collection-architecture.md`** — 채팅 수집 기술 스펙

---

## File Ownership

### BE1이 소유하는 파일 (ONLY these)
```
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/chat.ts              # 신규: 대화 DB 함수
lib/prompts.ts                    # 신규: System Prompt 템플릿
lib/response-parser.ts            # 신규: LLM 응답 파싱
shared/types.ts
app/api/conversations/route.ts    # 신규: POST (대화 시작)
app/api/conversations/[id]/route.ts  # 신규: GET (대화 복구)
app/api/chat/route.ts             # 신규: POST (메시지 전송)
app/api/calls/route.ts
app/api/calls/[id]/route.ts
app/auth/callback/route.ts
middleware.ts
```

### 절대 수정하지 마세요
- `app/api/calls/[id]/start/route.ts` — **BE2 전용**
- `lib/elevenlabs.ts` — BE2 소유
- `lib/prompt-generator.ts` — BE2 소유
- `app/page.tsx`, `app/login/page.tsx` — FE1 소유
- `app/calling/`, `app/result/`, `app/history/` — FE2 소유
- `components/` — FE1, FE2 소유

---

## 역할 요약 (v2)

프로젝트 초기 설정을 리드하고, **Supabase Auth**, **Supabase PostgreSQL**, **채팅 API**, **정보 수집 LLM**을 개발합니다.

```
[당신이 만드는 부분 - v2]

┌─────────────────────────────────────────────────────────────────────┐
│                      Auth Layer (Supabase)                           │
├─────────────────────────────────────────────────────────────────────┤
│  middleware.ts         → 세션 갱신 + 미인증 /login redirect           │
│  lib/supabase/         → client.ts (브라우저) + server.ts (서버)      │
│  app/auth/callback/    → OAuth 콜백 핸들러                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Chat API Layer (신규 v2)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/conversations                                            │
│  ├── 새 대화 세션 생성 (Supabase conversations 테이블)               │
│  └── 초기 인사 메시지 반환                                           │
│                                                                     │
│  POST /api/chat                                                     │
│  ├── 사용자 메시지 DB 저장                                           │
│  ├── DB에서 대화 기록 조회                                           │
│  ├── GPT-4o-mini로 정보 수집 대화                                    │
│  ├── 응답 파싱 (메시지 + collected_data)                             │
│  ├── Assistant 메시지 DB 저장                                        │
│  └── collected_data 업데이트                                         │
│                                                                     │
│  GET /api/conversations/[id]                                        │
│  └── 대화 복구 (새로고침 시)                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Call API Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/calls (v2 수정)                                          │
│  ├── conversationId로 collected_data 조회                           │
│  └── Call 레코드 생성                                                │
│                                                                     │
│  GET /api/calls/[id]                                                │
│  └── 통화 상태 및 결과 조회                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database (Supabase PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  conversations (신규)                                                │
│  ├── id, user_id, status                                            │
│  └── collected_data (JSONB), created_at, updated_at                 │
│                                                                     │
│  messages (신규)                                                     │
│  ├── id, conversation_id, role, content                             │
│  └── metadata (JSONB), created_at                                   │
│                                                                     │
│  calls (수정: conversation_id 추가)                                  │
│  ├── id, user_id, conversation_id                                   │
│  ├── request_type, target_name, target_phone                        │
│  └── status, result, summary, created_at, completed_at              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 프로젝트 셋업 (0:00-0:30)

> **당신이 리드** - 다른 팀원들은 환경 설정
> 상세: docs/SETUP-GUIDE.md 참조

---

## Phase 1: 핵심 기능 개발 (0:30-2:00)

### BE1-1: Supabase 테이블 생성 (15분)

**실행 위치**: Supabase Dashboard → SQL Editor (`scripts/supabase-tables.sql`)

**생성할 테이블:**

| 테이블 | 주요 컬럼 | 설명 |
|--------|----------|------|
| `conversations` | id (UUID PK), user_id (FK → auth.users), status (TEXT, default 'COLLECTING'), collected_data (JSONB), created_at, updated_at | 대화 세션 |
| `messages` | id (UUID PK), conversation_id (FK → conversations, CASCADE), role (TEXT), content (TEXT), metadata (JSONB), created_at | 대화 메시지 |
| `calls` | id (UUID PK), user_id (FK → auth.users), conversation_id (FK → conversations), request_type, target_name, target_phone, parsed_date, parsed_time, parsed_service, status (default 'PENDING'), result, summary, elevenlabs_conversation_id, created_at, completed_at | 전화 기록 |

**인덱스:** messages(conversation_id), conversations(user_id), conversations(status), calls(user_id)

**RLS:** 3개 테이블 모두 활성화, `auth.uid() = user_id` 정책으로 본인 데이터만 접근 가능

---

### BE1-2: 공유 타입 정의 (10분)

**파일**: `shared/types.ts`

**정의할 타입:**

| 타입 | 종류 | 설명 |
|------|------|------|
| `ConversationStatus` | union type | 'COLLECTING' \| 'READY' \| 'CALLING' \| 'COMPLETED' \| 'CANCELLED' |
| `CollectedData` | interface | target_name, target_phone, scenario_type, primary_datetime, service, fallback_datetimes, fallback_action, customer_name, party_size, special_request |
| `Message` | interface | id, role ('user' \| 'assistant'), content, createdAt |
| `Conversation` | interface | id, userId, status, collectedData, messages, createdAt, updatedAt |
| `Call` | interface | id, userId, conversationId, requestType, targetName, targetPhone, parsedDate/Time/Service, status, result, summary, elevenLabsConversationId, createdAt, completedAt |
| `ChatRequest` | interface | conversationId, message |
| `ChatResponse` | interface | message, collected (CollectedData), is_complete, conversation_status |
| `CreateCallRequest` | interface | conversationId |
| `createEmptyCollectedData()` | helper function | 모든 필드 null/빈 배열로 초기화된 CollectedData 반환 |

**createEmptyCollectedData() 상세 요구사항:**
- string 필드 (target_name, target_phone, scenario_type, primary_datetime, service, fallback_action, customer_name, special_request): `null`
- 배열 필드 (fallback_datetimes): `[]`
- number 필드 (party_size): `null`
- 이 함수는 대화 시작, 파싱 실패 fallback, 빈 상태 초기화 등 **여러 곳에서 사용**되므로 반드시 중앙 헬퍼로 구현

**참고**: `api-contract.mdc`의 Shared TypeScript Types 섹션 참조

---

### BE1-3: System Prompt 템플릿 (10분)

**파일**: `lib/prompts.ts`

**목적**: GPT-4o-mini에 전달할 정보 수집용 System Prompt

**COLLECTION_SYSTEM_PROMPT 내용 요구사항:**
- AI 비서 역할 부여 (WIGVO의 AI 비서)
- 필수 수집 정보: target_name, target_phone, scenario_type (RESERVATION/INQUIRY/AS_REQUEST), primary_datetime
- 권장 수집 정보: service, fallback_datetimes, fallback_action (ASK_AVAILABLE/NEXT_DAY/CANCEL), customer_name, party_size, special_request
- 대화 규칙: 한 번에 1-2개 질문, 해요체, 모호한 답변 재확인, 충분히 모이면 요약 후 확인
- 출력 형식: 매 응답마다 JSON 블록 포함 (`collected` 객체 + `is_complete` + `next_question`)
- 완료 조건: 필수 정보 모두 수집 시 `is_complete: true`

---

### BE1-4: LLM 응답 파싱 (10분)

**파일**: `lib/response-parser.ts`

**목적**: GPT 응답에서 메시지와 JSON 데이터를 분리

**함수**: `parseAssistantResponse(content: string) → ParsedLLMResponse`

| 반환 필드 | 타입 | 설명 |
|-----------|------|------|
| `message` | string | JSON 블록을 제거한 순수 메시지 텍스트 |
| `collected` | CollectedData | 파싱된 수집 데이터 (실패 시 빈 데이터) |
| `is_complete` | boolean | 수집 완료 여부 |
| `next_question` | string? | 다음에 물어볼 필드 |

**동작:**
1. 응답에서 JSON 블록 추출 — 정규식은 `` ```json\s*([\s\S]*?)\s*``` `` 패턴 사용. `\`\`\`json` 시작과 `\`\`\`` 끝 사이의 내용을 캡처
2. JSON 파싱하여 collected, is_complete 추출
3. JSON 블록 제거한 나머지를 message로 반환 (앞뒤 공백 trim)
4. **파싱 실패 시 fallback**: 전체 텍스트를 message로, `createEmptyCollectedData()` 반환, is_complete=false. 대화가 중단되지 않도록 반드시 유효한 응답 반환

**데이터 병합 규칙 (api-contract.mdc 참조):**
- LLM이 반환한 collected 객체를 기존 collected_data와 병합
- null이 아닌 새 값만 덮어쓰기, 배열은 비어있지 않을 때만 교체
- 병합은 `updateCollectedData` 호출 전에 수행

---

### BE1-5: 대화 DB 함수 (15분)

**파일**: `lib/supabase/chat.ts`

**의존성**: `lib/supabase/server.ts`의 `createClient()`

**함수 목록:**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `createConversation(userId)` | userId: string | { conversation, greeting } | 대화 세션 생성 + 초기 인사 메시지 저장 |
| `getConversationHistory(conversationId)` | conversationId: string | messages[] (role, content, created_at) | 대화 기록 조회 (LLM 컨텍스트용, limit 20) |
| `saveMessage(conversationId, role, content, metadata?)` | - | saved message | 메시지 저장 |
| `updateCollectedData(conversationId, collectedData, status?)` | - | void | collected_data + status 업데이트 |
| `getConversation(conversationId)` | conversationId: string | conversation with messages | 대화 세션 + 메시지 전체 조회 (복구용, messages join). **메시지는 반드시 `created_at` 오름차순 정렬** — Supabase 중첩 relation은 정렬 미보장 |

---

### BE1-6: POST /api/conversations (15분)

**파일**: `app/api/conversations/route.ts`

**API 스펙**: `api-contract.mdc` Endpoint 0-1 참조

**동작:**
1. Supabase Auth로 인증 확인 → 미인증 시 401
2. `createConversation(user.id)` 호출
3. 응답: `{ id, greeting }` (201 Created)

---

### BE1-7: GET /api/conversations/[id] (10분)

**파일**: `app/api/conversations/[id]/route.ts`

**API 스펙**: `api-contract.mdc` Endpoint 0-3 참조

**동작:**
1. 인증 확인 → 미인증 시 401
2. `getConversation(id)` 호출
3. 본인 대화인지 확인 (user_id 비교) → 아니면 404
4. snake_case → camelCase 변환 후 응답 — 중첩된 messages 배열도 각 메시지의 `created_at` → `createdAt` 변환 필요
5. 응답: `{ id, userId, status, collectedData, messages[], createdAt, updatedAt }`

**필수 패턴 — params await:**
- Next.js 15+에서 `params`는 Promise → `const { id } = await params`
- await 없이 사용하면 id가 `[object Promise]`가 되어 DB 조회 실패
- 이 패턴은 `[id]` 경로가 있는 모든 API Route에 적용 (conversations/[id], calls/[id] 등)

---

### BE1-8: POST /api/chat (25분)

**파일**: `app/api/chat/route.ts`

**API 스펙**: `api-contract.mdc` Endpoint 0-2 참조

**핵심 로직 (이 태스크가 가장 중요):**
1. 인증 확인
2. 요청 파싱: `{ conversationId, message }` → 둘 다 필수, 없으면 400
3. 사용자 메시지 DB 저장 (`saveMessage`)
4. DB에서 대화 기록 조회 (`getConversationHistory`)
5. LLM 메시지 구성: system prompt + 대화 기록
6. OpenAI GPT-4o-mini 호출 (temperature: 0.7). **OpenAI 호출 실패 시 fallback**: 한국어 에러 메시지("죄송합니다, 잠시 오류가 발생했어요. 다시 말씀해주세요.")를 message로 반환, collected는 기존 상태 유지, is_complete=false
7. 응답 파싱 (`parseAssistantResponse`). **JSON 파싱 실패 시**: 전체 응답 텍스트를 message로, 빈 CollectedData, is_complete=false — 대화 흐름은 중단하지 않음
8. Assistant 메시지 DB 저장 (metadata에 collected, is_complete 포함)
9. collected_data 업데이트 (is_complete이면 status를 'READY'로)
10. 응답: `{ message, collected, is_complete, conversation_status }`

---

### BE1-9: POST /api/calls (v2 수정) + GET /api/calls (15분)

**파일**: `app/api/calls/route.ts`

**API 스펙**: `api-contract.mdc` Endpoint 1, 2 참조

**POST 동작:**
1. 인증 확인
2. `{ conversationId }` 파싱 → 필수, 없으면 400
3. 대화 세션 조회 → 본인 확인

**Call 생성 전 상태 검증 테이블:**

| conversation.status | 동작 | 이유 |
|--------------------|------|------|
| READY | ✅ Call 생성 진행 | 정상 흐름 |
| COLLECTING | ❌ 400 에러 "Conversation is not ready for call" | 정보 수집 미완료 |
| CALLING | ❌ 400 에러 "Call already in progress" | 이미 전화 진행 중 |
| COMPLETED | ❌ 400 에러 "Conversation already completed" | 이미 완료된 대화 |
| CANCELLED | ❌ 400 에러 "Conversation was cancelled" | 취소된 대화 |

4. collected_data에서 call 정보 추출
5. calls 테이블에 레코드 생성 (status: 'PENDING')
6. conversation status를 'CALLING'으로 업데이트
7. 응답: Call 객체 (201 Created, snake_case → camelCase 변환)

**GET 동작:**
1. 인증 확인
2. 본인의 calls 조회 (최신순, limit 20)
3. 응답: `{ calls: Call[] }` (snake_case → camelCase 변환)

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:30 | 프로젝트 셋업 완료, npm run dev 동작 |
| 0:40 | Supabase 테이블 생성 완료 |
| 0:50 | 공유 타입 + 프롬프트 + 파서 완료 |
| 1:10 | POST /api/conversations 동작 |
| 1:25 | POST /api/chat 동작 (LLM 응답) |
| 1:40 | GET /api/conversations/[id] 동작 |
| 1:55 | POST /api/calls (v2) 동작 |

---

## 테스트 방법

각 API 완성 시 curl로 테스트:
1. **대화 시작**: POST /api/conversations → id, greeting 확인
2. **메시지 전송**: POST /api/chat → message, collected, is_complete 확인
3. **대화 복구**: GET /api/conversations/{id} → 메시지 목록 확인
4. **Call 생성**: POST /api/calls → 수집 완료 후 call 생성 확인

---

## Phase 2 통합 시 할 일

- FE1과 채팅 UI 연동 테스트
- BE2에게 collected_data 형식 전달 확인
- 대화 복구 (새로고침) 테스트
- E2E 플로우 확인: 채팅 → 수집 완료 → Call 생성 → Start
