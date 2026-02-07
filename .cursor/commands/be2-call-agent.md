# BE2: ElevenLabs + Dynamic Prompt 개발 지시서 (v2)

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: BE2 - ElevenLabs 연동 + Dynamic Prompt 담당
> **담당 시간**: Phase 1 (0:30-2:00)
> **버전**: v2 (Dynamic Agent Platform)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("BE2-1 시작해", "Mock mode 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("ElevenLabs 연동 전체 설계해줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("통화가 안 걸려", "Mock이 완료 안 돼") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("elevenlabs.ts 구조 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

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

### BE2가 소유하는 파일 (ONLY these)
```
app/api/calls/[id]/start/route.ts
lib/elevenlabs.ts
lib/prompt-generator.ts           # 신규: Dynamic Prompt 생성
```

### 절대 수정하지 마세요
- `app/api/calls/route.ts`, `app/api/calls/[id]/route.ts` — BE1 소유
- `app/api/conversations/`, `app/api/chat/`, `app/auth/` — BE1 소유
- `lib/supabase/` — BE1 소유 (import는 자유, 수정 금지)
- `shared/types.ts` — BE1 소유 (읽기만 가능)
- `middleware.ts` — BE1 소유
- `app/page.tsx`, `app/login/` — FE1 소유
- `app/calling/`, `app/result/`, `app/history/` — FE2 소유
- `components/` — FE1, FE2 소유

---

## 역할 요약 (v2)

**ElevenLabs Conversational AI**를 사용하여 실제 전화를 거는 기능 + **채팅에서 수집한 데이터로 Dynamic System Prompt**를 생성합니다.

```
[당신이 만드는 부분 - v2]

┌─────────────────────────────────────────────────────────────────────┐
│                  Dynamic Prompt Generator (신규 v2)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CollectedData (BE1에서 전달)                                        │
│  ├── target_name, target_phone, scenario_type                       │
│  ├── primary_datetime, service                                      │
│  ├── fallback_datetimes, fallback_action                            │
│  └── customer_name, party_size, special_request                     │
│                        │                                            │
│                        ▼                                            │
│       generateDynamicPrompt(collectedData) → System Prompt          │
│                        │                                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ElevenLabs Integration                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Mock Mode (최우선)                                              │
│     └── 실제 API 없이 전체 플로우 동작                               │
│                                                                     │
│  2. Start Route (POST /api/calls/[id]/start)                       │
│     ├── Call 정보 + collected_data 조회                              │
│     ├── Dynamic Prompt 생성                                         │
│     └── ElevenLabs Outbound Call 시작                               │
│                                                                     │
│  3. Polling-based 결과 수집                                         │
│     └── 통화 완료 시 결과 DB 업데이트                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 태스크 목록

### BE2-1: Dynamic Prompt Generator (신규, 20분)

**파일**: `lib/prompt-generator.ts`

**목적**: 채팅에서 수집한 `CollectedData`를 ElevenLabs Agent가 이해할 수 있는 Dynamic System Prompt로 변환

**함수**: `generateDynamicPrompt(data: CollectedData) → { systemPrompt, dynamicVariables }`

**시나리오별 프롬프트 생성:**

| 시나리오 | 프롬프트 핵심 내용 |
|----------|------------------|
| RESERVATION | "{target_name}에 {datetime}에 {service} 예약 요청, 예약자 {customer_name}, {party_size}명" + fallback 전략 |
| INQUIRY | "{target_name}에 {service} 관련 문의, 질문: {special_request}" |
| AS_REQUEST | "{target_name}에 {service} AS/수리 접수, 증상: {special_request}, 방문일: {datetime}" |

**각 프롬프트에 포함할 내용:**
- AI 비서 역할 부여 (고객 대신 전화)
- 대화 흐름 (인사 → 요청 → 확인/대안 → 마무리)
- Fallback 전략 (fallback_action에 따라: ASK_AVAILABLE → 가능 시간 물어보기, NEXT_DAY → 대안 일정 제안, CANCEL → 정중히 종료)
- 특별 요청 전달 (special_request)
- 규칙: 해요체, 확인 반복, 천천히 말하기

**추가 함수**: `formatForElevenLabs(data: CollectedData) → Record<string, string>` (Dynamic Variables 형식 변환)

---

### BE2-2: Mock Mode + ElevenLabs 연동 (20분)

**파일**: `lib/elevenlabs.ts`

**환경변수:**
- `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`
- `ELEVENLABS_MOCK` ('true' → Mock 모드)

**함수 목록:**

| 함수 | 동작 (Mock) | 동작 (Real) |
|------|------------|-------------|
| `isMockMode()` | true 반환 | false 반환 |
| `startOutboundCall(phoneNumber, dynamicVariables)` | `{ conversation_id: "mock_{timestamp}", status: "initiated" }` 반환 | ElevenLabs API `POST /v1/convai/twilio/outbound-call` 호출 |
| `getConversation(conversationId)` | `{ status: "completed", transcript: "Mock transcript" }` 반환 | ElevenLabs API `GET /v1/convai/conversations/{id}` 호출 |

**ElevenLabs API 사양:**
- Base URL: `https://api.elevenlabs.io/v1`
- 인증 헤더: `xi-api-key`
- Outbound Call Body: `{ agent_id, agent_phone_number_id, to_number, conversation_initiation_client_data: { dynamic_variables, conversation_config_override: { agent: { prompt: { prompt } } } } }`

**CRITICAL: ElevenLabs Agent Dashboard 설정**

Agent를 생성한 후 Dashboard에서 반드시 확인해야 하는 설정:

| 설정 항목 | 위치 | 필수 값 | 이유 |
|----------|------|--------|------|
| **Enable overrides** | Agent → Settings → Security | ✅ 체크 | 이 설정이 꺼져있으면 API에서 보낸 system_prompt가 **무시됨** |
| **System prompt** | Agent → Settings → Security → Override Options | ✅ 체크 | prompt override를 허용해야 dynamic prompt가 적용됨 |

> ⚠️ **이 설정을 누락하면 Dynamic System Prompt가 완전히 무시되고, Dashboard에 설정된 기본 프롬프트만 사용됩니다. 에러 없이 조용히 실패하므로 반드시 사전에 확인하세요.**

**System Prompt 전달 방법:**

ElevenLabs에 dynamic system prompt를 전달하려면 `conversation_initiation_client_data`에 dynamic_variables와 **함께** conversation_config_override를 포함해야 합니다:

- `conversation_initiation_client_data.dynamic_variables`: 변수 치환용 (target_name, datetime 등)
- `conversation_initiation_client_data.conversation_config_override.agent.prompt.prompt`: 전체 system prompt 문자열

**startOutboundCall 파라미터:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| phoneNumber | string | E.164 형식 전화번호 |
| dynamicVariables | Record<string, string> | ElevenLabs dynamic variables |
| systemPrompt | string | Dynamic System Prompt 전체 텍스트 |

**Terminal Status 처리:**

ElevenLabs conversation이 종료되었을 때 가능한 status 값:

| ElevenLabs Status | 의미 | WIGVO 매핑 |
|-------------------|------|-----------|
| `completed` | 정상 종료 | → 결과 판정 알고리즘 실행 |
| `failed` | 통화 실패 | → FAILED + ERROR |
| `ended` | 상대방이 끊음 | → 결과 판정 알고리즘 실행 |
| `terminated` | 시스템 종료 | → FAILED + ERROR |

> `completed`와 `ended`만 성공 가능. `failed`와 `terminated`는 무조건 실패 처리.

**결과 판정 알고리즘 (7단계 우선순위):**

통화 종료 후 결과(SUCCESS/NO_ANSWER/REJECTED/ERROR)를 판정하는 순서:

1. ElevenLabs status가 `failed` 또는 `terminated` → **ERROR**
2. conversation의 `analysis.data_collection_results`에 result 필드가 있으면 → 해당 값 사용
3. conversation의 `analysis.transcript_summary`에 "예약 완료", "확인" 등 성공 키워드 → **SUCCESS**
4. transcript_summary에 "거절", "불가", "안 됩니다" 등 거절 키워드 → **REJECTED**
5. transcript_summary에 "부재", "받지 않", "연결되지" 등 부재 키워드 → **NO_ANSWER**
6. transcript가 비어있거나 매우 짧음 (3턴 미만) → **NO_ANSWER**
7. 위 어느 것에도 해당하지 않으면 → **SUCCESS** (기본값: 통화가 이루어졌으므로)

**Real Mode 로깅 요구사항:**

| 시점 | 로그 내용 | 로그 레벨 |
|------|----------|----------|
| 통화 시작 | callId, phoneNumber (마스킹), agentId | info |
| 폴링 시도 | conversationId, 현재 status, 시도 횟수 | debug |
| 통화 종료 | conversationId, final status, 판정 결과 | info |
| 에러 발생 | 에러 메시지, conversationId | error |
| 타임아웃 | conversationId, 총 폴링 횟수 | warn |

**환경변수 검증 함수:**

`lib/elevenlabs.ts`에 `validateElevenLabsConfig()` 함수를 구현하여 Real Mode 진입 시 필수 환경변수 3개(`ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`)가 모두 설정되어 있는지 확인. 누락 시 명확한 에러 메시지와 함께 실패.

---

### BE2-3: POST /api/calls/[id]/start (v2) (25분)

**파일**: `app/api/calls/[id]/start/route.ts`

**API 스펙**: `api-contract.mdc` Endpoint 4 참조

**동작:**
1. Call 정보 조회 (calls 테이블 + conversations.collected_data JOIN)
2. 상태를 'CALLING'으로 변경
3. collected_data에서 Dynamic Prompt 생성 (`generateDynamicPrompt`)
4. 전화번호 E.164 포맷 변환 (010-xxxx → +8210xxxx)
5. ElevenLabs Outbound Call 시작 (or Mock)
6. elevenlabs_conversation_id 저장 + 상태 'IN_PROGRESS'

**Mock 모드 추가 동작:**
- 5초 후 자동 완료 (setTimeout)
- status: 'COMPLETED', result: 'SUCCESS'
- 시나리오별 Mock summary 생성
- conversation status도 'COMPLETED'로 업데이트

**Real 모드 추가 동작 — 서버사이드 폴링 스펙:**

| 설정 | 값 | 설명 |
|------|---|------|
| 폴링 간격 | 3초 | `setInterval` 또는 재귀 `setTimeout` |
| 최대 폴링 횟수 | 60회 (= 3분) | 초과 시 FAILED + "timeout" |
| 연속 에러 허용 | 5회 | 5회 연속 API 에러 시 즉시 중단, FAILED 처리 |
| 종료 조건 | ElevenLabs status가 terminal (completed/failed/ended/terminated) | 결과 판정 알고리즘 실행 후 DB 업데이트 |

폴링 중 에러 발생 시 카운터를 증가시키고, 성공 시 리셋합니다. 연속 5회 에러가 아닌 간헐적 에러는 허용합니다.

**전화번호 포맷팅 (5패턴):**

| 입력 | 출력 | 설명 |
|------|------|------|
| `010-1234-5678` | `+821012345678` | 휴대폰 (하이픈 포함) |
| `01012345678` | `+821012345678` | 휴대폰 (하이픈 없음) |
| `02-123-4567` | `+8221234567` | 서울 지역번호 |
| `031-123-4567` | `+82311234567` | 경기 지역번호 |
| `+821012345678` | `+821012345678` | 이미 E.164 형식 (그대로 유지) |

**변환 알고리즘:**
1. 숫자와 `+` 외 모든 문자 제거
2. `+`로 시작하면 → 그대로 반환
3. `0`으로 시작하면 → `0` 제거 후 `+82` 붙이기
4. 그 외 → `+82` + 전체

**에러 처리:** 실패 시 calls status를 'FAILED', result를 'ERROR'로 업데이트. conversation status도 'COMPLETED'로 업데이트 (실패도 종료 상태)

---

## CollectedData → Dynamic Variables 매핑

| CollectedData 필드 | ElevenLabs Dynamic Variable | 설명 |
|-------------------|----------------------------|------|
| `target_name` | `target_name` | 전화할 곳 이름 |
| `primary_datetime` | `datetime` | 희망 일시 |
| `service` | `service` | 서비스 종류 |
| `customer_name` | `customer_name` | 예약자 이름 |
| `party_size` | `party_size` | 인원수 |
| `fallback_datetimes` | (프롬프트에 포함) | 대안 시간 |
| `fallback_action` | (프롬프트에 포함) | 불가 시 대응 |
| `special_request` | `special_request` | 특별 요청 |

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| **0:50** | **Dynamic Prompt Generator 완성** |
| 1:05 | lib/elevenlabs.ts 완성 |
| **1:25** | **Mock mode 완성 (CRITICAL)** |
| 1:45 | start/route.ts 완성 (Mock + Real) |
| 2:00 | Polling 결과 수집 동작 |

---

## 테스트 방법

Mock mode 테스트 (BE1 API가 준비된 후):
1. 채팅으로 정보 수집 완료
2. Call 생성: POST /api/calls
3. Start 호출: POST /api/calls/{call_id}/start
4. 5초 후 상태 확인: GET /api/calls/{call_id} → status: "COMPLETED", result: "SUCCESS"

---

## 주의사항

1. **Mock mode가 최우선**: Mock 완성 전에 다른 태스크 진행하지 마세요
2. **Dynamic Prompt**: collected_data 형식은 BE1의 `shared/types.ts` 참고
3. **전화번호 형식**: E.164 형식 필수 (+821012345678)
4. **비용 주의**: 실제 통화는 비용 발생 → 테스트는 팀원 번호로

---

## Phase 2 통합 시 할 일

- BE1에게 collected_data 형식 확인
- FE2와 폴링 타이밍 확인 (FE: 3초, BE Mock: 5초 후 완료)
- Mock 모드로 E2E 테스트
- Dynamic Prompt가 시나리오별로 잘 생성되는지 확인
