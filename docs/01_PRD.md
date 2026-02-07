# PRD: WIGVO Dynamic Agent Platform

> **Project**: WIGVO — AI 전화 대행 플랫폼 (Dynamic System Prompt)
> **Version**: 2.0
> **Last Updated**: 2026-02-06

---

## 1. Executive Summary

### 1.1 핵심 컨셉

**"채팅으로 요구사항 수집 → LLM이 System Prompt 동적 생성 → AI가 전화 → 결과 알림"**

기존 접근법 (고정 Agent)과의 차이:

| 항목 | 기존 (v1) | 신규 (v2) |
|------|----------|----------|
| System Prompt | 사전 고정 | **동적 생성** |
| 사용자 입력 | 단일 텍스트 박스 | **채팅 인터페이스** |
| 정보 수집 | GPT-4 파싱 (1회) | **대화형 수집 (멀티턴)** |
| 예외 처리 | 없음 | **차선책 사전 수집** |
| 결과 전달 | 화면 확인 | **Hook 알림 + Calendar** |

### 1.2 Why Dynamic System Prompt?

ElevenLabs Agent는 System Prompt가 고정되면 **하나의 시나리오**만 처리 가능.

```
❌ 고정 Prompt 문제:
   - 미용실 예약 Agent ≠ 부동산 문의 Agent ≠ AS 접수 Agent
   - 시나리오마다 별도 Agent 생성 필요
   - 유저별 세부 요구사항 반영 불가

✅ Dynamic Prompt 해결:
   - 하나의 Agent로 모든 시나리오 대응
   - 채팅으로 수집한 정보 기반 Prompt 생성
   - 유저의 차선책, 특별 요청 등 반영
```

---

## 2. User Flow (Detailed)

### 2.1 End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WIGVO Flow                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 1: 채팅 기반 정보 수집                                      │  │
│  │  ─────────────────────────────                                    │  │
│  │                                                                    │  │
│  │  User ──→ 요구사항 입력                                            │  │
│  │       ←── LLM 질문 (모호한 부분)                                   │  │
│  │       ──→ 답변                                                     │  │
│  │       ←── LLM 질문 (차선책)                                        │  │
│  │       ──→ 답변                                                     │  │
│  │       ←── "정보 수집 완료! 전화 진행할게요"                         │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 2: Dynamic System Prompt 생성                              │  │
│  │  ───────────────────────────────────                              │  │
│  │                                                                    │  │
│  │  수집된 정보 (JSON)                                                │  │
│  │       │                                                            │  │
│  │       ▼                                                            │  │
│  │  System Prompt Template + 정보 주입                                │  │
│  │       │                                                            │  │
│  │       ▼                                                            │  │
│  │  완성된 System Prompt                                              │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 3: AI 전화 실행                                            │  │
│  │  ─────────────────────                                            │  │
│  │                                                                    │  │
│  │  ElevenLabs Outbound Call API                                     │  │
│  │       │                                                            │  │
│  │       ├── Dynamic Variables 주입                                  │  │
│  │       ├── System Prompt Override (if supported)                   │  │
│  │       │   또는 conversation_initiation_client_data 활용            │  │
│  │       │                                                            │  │
│  │       ▼                                                            │  │
│  │  실제 전화 통화 진행                                               │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 4: 결과 처리 & 알림                                        │  │
│  │  ─────────────────────────                                        │  │
│  │                                                                    │  │
│  │  통화 결과 수신 (Polling/Webhook)                                  │  │
│  │       │                                                            │  │
│  │       ├── 성공 → Google Calendar 등록                             │  │
│  │       │       → Push/카카오 알림톡                                 │  │
│  │       │                                                            │  │
│  │       └── 실패 → 실패 사유 + 다음 액션 안내                        │  │
│  │               → "다시 시도" or "직접 전화"                         │  │
│  │                                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Sequence Diagram

```
User          Frontend        Backend/LLM       ElevenLabs      External
 │                │                │                │              │
 │  로그인         │                │                │              │
 │───────────────→│                │                │              │
 │                │                │                │              │
 │  "예약해줘"     │                │                │              │
 │───────────────→│  채팅 메시지    │                │              │
 │                │───────────────→│                │              │
 │                │                │                │              │
 │                │  "어디요?"     │                │              │
 │                │←───────────────│                │              │
 │  "강남 OO미용실" │               │                │              │
 │───────────────→│───────────────→│                │              │
 │                │                │                │              │
 │                │  "몇시요?"     │                │              │
 │                │←───────────────│                │              │
 │  "3시, 안되면 4시" │             │                │              │
 │───────────────→│───────────────→│                │              │
 │                │                │                │              │
 │                │  "알겠어요!    │                │              │
 │                │   전화할게요"  │                │              │
 │                │←───────────────│                │              │
 │                │                │                │              │
 │                │                │  Prompt 생성   │              │
 │                │                │───────────────→│              │
 │                │                │                │  전화 발신   │
 │                │                │                │─────────────→│
 │                │                │                │              │
 │                │                │                │  통화 진행   │
 │                │                │                │←────────────→│
 │                │                │                │              │
 │                │                │  결과 수신     │              │
 │                │                │←───────────────│              │
 │                │                │                │              │
 │  알림 수신      │                │  Calendar 등록 │              │
 │←───────────────│←───────────────│───────────────→│  Google API  │
 │                │                │                │              │
```

---

## 3. Phase 1: 채팅 기반 정보 수집

### 3.1 채팅 UI 설계

```
┌─────────────────────────────────────────┐
│  WIGVO                         [History]│
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🤖 안녕하세요! 어떤 전화를       │   │
│  │    대신 걸어드릴까요?            │   │
│  └─────────────────────────────────┘   │
│                                         │
│         ┌─────────────────────────┐     │
│         │ 내일 3시에 미용실       │     │
│         │ 예약 좀 해줘            │     │
│         └─────────────────────────┘     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🤖 어떤 미용실인가요?           │   │
│  │    전화번호도 알려주시면         │   │
│  │    바로 예약 도와드릴게요!       │   │
│  └─────────────────────────────────┘   │
│                                         │
│         ┌─────────────────────────┐     │
│         │ 강남 OO미용실이야        │     │
│         │ 010-1234-5678           │     │
│         └─────────────────────────┘     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🤖 남자 커트 맞으시죠?          │   │
│  │    혹시 3시가 안 되면 다른       │   │
│  │    시간도 괜찮으세요?           │   │
│  └─────────────────────────────────┘   │
│                                         │
│         ┌─────────────────────────┐     │
│         │ 응 남자커트, 안되면      │     │
│         │ 4시나 5시도 괜찮아       │     │
│         └─────────────────────────┘     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🤖 좋아요! 정리해볼게요 📋      │   │
│  │                                 │   │
│  │ • 장소: OO미용실                │   │
│  │ • 날짜: 내일 (2/7)              │   │
│  │ • 희망시간: 3시                 │   │
│  │ • 대안시간: 4시, 5시            │   │
│  │ • 서비스: 남자 커트             │   │
│  │                                 │   │
│  │ 맞으면 전화 걸어볼게요!         │   │
│  │ 결과는 알림으로 알려드릴게요 🔔  │   │
│  │                                 │   │
│  │ [전화 걸기]  [수정하기]         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  메시지를 입력하세요...      [→]│   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 LLM 정보 수집 로직

#### 수집해야 할 정보 (Required vs Optional)

| 필드 | Required | Description | Example |
|------|----------|-------------|---------|
| `scenario_type` | ✅ | 시나리오 유형 | "RESERVATION", "INQUIRY", "AS_REQUEST" |
| `target_name` | ✅ | 전화할 곳 | "OO미용실" |
| `target_phone` | ✅ | 전화번호 | "010-1234-5678" |
| `primary_datetime` | ✅ | 희망 일시 | "2026-02-07 15:00" |
| `service` | ⬜ | 서비스/용건 | "남자 커트" |
| `fallback_datetime` | ⬜ | 대안 일시 | ["16:00", "17:00"] |
| `fallback_action` | ⬜ | 불가 시 대응 | "다른 날 다시 전화", "취소" |
| `customer_name` | ⬜ | 예약자 이름 | "홍길동" |
| `party_size` | ⬜ | 인원수 | 4 |
| `special_request` | ⬜ | 특별 요청 | "룸으로 부탁드려요" |
| `callback_method` | ⬜ | 알림 방식 | "push", "kakao", "sms" |

#### LLM System Prompt (정보 수집용)

```
당신은 WIGVO의 AI 비서입니다.
사용자의 전화 예약/문의 요청을 도와주세요.

## 목표
사용자와 대화하며 전화 대행에 필요한 정보를 수집합니다.

## 수집할 정보
1. [필수] 전화할 곳 (이름, 전화번호)
2. [필수] 용건 (예약/문의/AS접수 등)
3. [필수] 희망 일시
4. [권장] 대안 시간 (희망 시간 불가 시)
5. [권장] 불가 시 대응 방법
6. [선택] 예약자 정보, 특별 요청 등

## 대화 규칙
- 한 번에 2개 이상 질문하지 마세요
- 친근하고 자연스러운 말투 (해요체)
- 정보가 모호하면 명확히 확인
- 모든 필수 정보 수집 완료 시 요약 제시

## 종료 조건
모든 필수 정보 + 최소 1개 대안 정보 수집 시:
→ 수집 정보 요약 → [전화 걸기] 버튼 표시

## Output Format (내부용)
정보 수집 완료 시 다음 JSON 생성:
{
  "collection_complete": true,
  "data": {
    "scenario_type": "RESERVATION",
    "target_name": "OO미용실",
    "target_phone": "010-1234-5678",
    ...
  }
}
```

### 3.3 차선책(Fallback) 수집 전략

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Fallback 수집 시나리오                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Q: "혹시 3시가 안 되면 어떻게 할까요?"                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Option A: 다른 시간 제시                                    │   │
│  │  → "4시나 5시도 괜찮아"                                      │   │
│  │  → fallback_datetime: ["16:00", "17:00"]                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Option B: 다른 날로 변경                                    │   │
│  │  → "그럼 모레로 해줘"                                        │   │
│  │  → fallback_action: "reschedule_next_day"                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Option C: 가능한 시간 물어보기                              │   │
│  │  → "그쪽에서 가능한 시간 물어봐줘"                           │   │
│  │  → fallback_action: "ask_available_slots"                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Option D: 예약 포기                                         │   │
│  │  → "그럼 됐어"                                               │   │
│  │  → fallback_action: "cancel_if_unavailable"                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 2: Dynamic System Prompt 생성

### 4.1 System Prompt Template

#### CollectedData 구조 (lib/prompt-generator.ts)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scenario_type` | Enum: `RESERVATION`, `INQUIRY`, `AS_REQUEST` | Yes | 시나리오 유형 |
| `target_name` | String | Yes | 전화할 곳 이름 |
| `target_phone` | String | Yes | 전화번호 |
| `primary_datetime` | String | Yes | 희망 일시 |
| `service` | String | No | 서비스/용건 |
| `fallback_datetime` | String[] | No | 대안 시간 목록 |
| `fallback_action` | String | No | 불가 시 대응 방법 |
| `customer_name` | String | No | 예약자 이름 |
| `party_size` | Number | No | 인원수 |
| `special_request` | String | No | 특별 요청 사항 |

#### generateSystemPrompt 로직

`CollectedData`를 입력받아 아래 섹션들을 조합하여 하나의 System Prompt 문자열을 생성한다.

**Base Prompt 구조:**

| 섹션 | 내용 | 생성 함수 |
|------|------|-----------|
| Your Identity | "WIGVO 앱 사용자를 대신해 전화하는 AI. 한국어 해요체 사용." (고정) | — |
| Call Objective | 시나리오 유형에 따른 통화 목적 문장 | `generateObjective` |
| Key Information | 수집된 핵심 정보 나열 (장소, 서비스, 시간, 이름 등) | `generateKeyInfo` |
| Conversation Flow | 인사 → 요청 → 이름 제공 → 확인 순서의 대화 흐름 | `generateConversationFlow` |
| Fallback Handling | 희망 시간 불가 시 대안 처리 규칙 | `generateFallbackRules` |
| Ending the Call | 성공/실패 시 종료 멘트 | `generateEndingRules` |

#### generateObjective 규칙

| scenario_type | 생성되는 목적 문장 |
|---------------|-------------------|
| `RESERVATION` | "Make a reservation at {target_name} for {primary_datetime}." |
| `INQUIRY` | "Inquire about {service} at {target_name}." |
| `AS_REQUEST` | "Request AS service at {target_name} for {service}." |

#### generateFallbackRules 규칙

- **fallback 정보 없음**: "If the requested time is unavailable, politely end the call and report back."
- **fallback 정보 있을 경우**, 아래 조건을 순서대로 적용:
  1. `fallback_datetime` 존재 시 → 대안 시간을 순서대로 시도
  2. `fallback_action`이 `ask_available_slots` → 오늘/내일 가능한 시간 문의
  3. `fallback_action`이 `reschedule_next_day` → 다음 날 가능 여부 문의
  4. `fallback_action`이 `cancel_if_unavailable` → 대안 없으면 정중히 종료

### 4.2 Generated Prompt Example

**Input (수집된 정보):**
```json
{
  "scenario_type": "RESERVATION",
  "target_name": "OO미용실",
  "target_phone": "010-1234-5678",
  "primary_datetime": "2026-02-07 15:00",
  "service": "남자 커트",
  "fallback_datetime": ["16:00", "17:00"],
  "fallback_action": "ask_available_slots",
  "customer_name": "홍길동"
}
```

**Output (생성된 System Prompt):**
```
You are a friendly AI phone assistant making a call on behalf of a customer.
You MUST speak in Korean (한국어) using polite speech (해요체).

## Your Identity
- You are calling on behalf of a customer who uses WIGVO app
- Be polite, clear, and efficient

## Call Objective
Make a reservation at OO미용실 for 2026-02-07 15:00.

## Key Information
- Target: OO미용실
- Service: 남자 커트
- Preferred Time: 내일 오후 3시 (2026-02-07 15:00)
- Customer Name: 홍길동

## Conversation Flow
1. Greeting: "안녕하세요, 예약 문의 드립니다."
2. Request: "내일 오후 3시에 남자 커트 예약 가능할까요?"
3. If asked for name: "예약자 이름은 홍길동입니다."
4. Confirm final details before ending

## Fallback Handling
If 15:00 is not available:
1. Try these alternative times in order: 16:00, 17:00
2. Ask what times ARE available tomorrow
3. If no alternatives work, ask "그럼 언제가 가능하세요?" and report back

## Ending the Call
- Always confirm the final reservation details
- Say: "감사합니다. 좋은 하루 되세요."
- If reservation failed, say: "알겠습니다. 확인해서 다시 연락드릴게요."
```

### 4.3 ElevenLabs API 호출 시 Prompt 전달

ElevenLabs는 **Agent 생성 시** System Prompt를 설정하므로, 동적 변경에는 두 가지 접근법이 있음:

#### Option A: Dynamic Variables 최대 활용 (권장)

**Agent System Prompt 템플릿 변수:**

Agent 생성 시 System Prompt에 아래 플레이스홀더를 배치한다. 호출 시 실제 값으로 치환된다.

| 플레이스홀더 | 설명 | 예시 값 |
|-------------|------|---------|
| `{{target_name}}` | 전화할 곳 이름 | "OO미용실" |
| `{{objective}}` | 통화 목적 | "make a reservation" |
| `{{request_details}}` | 요청 상세 내용 | "내일 오후 3시 남자 커트" |
| `{{fallback_rules}}` | 대안 처리 규칙 | "3시 안되면 4시, 5시도 가능" |
| `{{customer_name}}` | 예약자 이름 | "홍길동" |

**API 호출 구조:**

| 항목 | 값 |
|------|-----|
| Method | `POST` |
| Endpoint | `/v1/convai/twilio/outbound-call` |
| Body: `agent_id` | 사전 생성된 Agent ID |
| Body: `agent_phone_number_id` | 발신 번호 ID |
| Body: `to_number` | 수신자 전화번호 |
| Body: `conversation_initiation_client_data.dynamic_variables` | 위 플레이스홀더에 대응하는 key-value 맵 |

#### Option B: Agent 동적 생성 (복잡한 경우)

**동적 Agent 생성 프로세스 (매 요청마다):**

| 단계 | 동작 | 비고 |
|------|------|------|
| 1 | Agent 생성 | 이름: `WIGVO-{timestamp}`, 생성된 System Prompt 및 한국어 Voice ID 포함 |
| 2 | Outbound Call 실행 | 생성된 Agent ID와 수신자 전화번호로 전화 발신 |
| 3 | Agent 삭제 (선택) | 통화 완료 후 Agent를 삭제하여 리소스 정리. 비용 고려 필요 |

---

## 5. Phase 3: AI 전화 실행

### 5.1 Outbound Call with Dynamic Context

#### CallContext 구조 (lib/elevenlabs.ts)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `collectedData` | CollectedData | Yes | 채팅에서 수집된 전체 정보 |
| `generatedPrompt` | String | Yes | 동적으로 생성된 System Prompt |
| `conversationId` | String | No | 기존 대화 ID (있는 경우) |

#### startDynamicCall 로직

**Step 1 — Dynamic Variables 맵 구성:**

| Variable Key | 값 출처 | 기본값 |
|-------------|--------|--------|
| `target_name` | `collectedData.target_name` | — |
| `date` | `collectedData.primary_datetime`에서 날짜 부분 포맷팅 | — |
| `time` | `collectedData.primary_datetime`에서 시간 부분 포맷팅 | — |
| `service` | `collectedData.service` | "예약" |
| `customer_name` | `collectedData.customer_name` | "고객" |
| `fallback_times` | `collectedData.fallback_datetime` 목록을 콤마로 연결 | "없음" |
| `special_request` | `collectedData.special_request` | "" |

**Step 2 — ElevenLabs Outbound Call API 호출:**

| 항목 | 값 |
|------|-----|
| Method | `POST` |
| URL | `https://api.elevenlabs.io/v1/convai/twilio/outbound-call` |
| Header | `xi-api-key`: ElevenLabs API Key, `Content-Type`: application/json |
| Body: `agent_id` | 환경변수에서 로드 (`ELEVENLABS_AGENT_ID`) |
| Body: `agent_phone_number_id` | 환경변수에서 로드 (`ELEVENLABS_PHONE_NUMBER_ID`) |
| Body: `to_number` | `collectedData.target_phone`을 E.164 형식으로 변환 |
| Body: `conversation_initiation_client_data.dynamic_variables` | Step 1에서 구성한 맵 |

**Step 3 — 응답 반환:**

- API 응답을 JSON 파싱하여 `CallResult`로 반환

### 5.2 Universal Agent System Prompt

모든 시나리오에 대응하는 **범용 Agent System Prompt**:

```
You are WIGVO AI, a phone assistant that makes calls on behalf of users.

## Core Rules
1. ALWAYS speak in Korean (한국어, 해요체)
2. Be polite, natural, and efficient
3. Follow the specific instructions in dynamic variables

## Your Task
Make a call to {{target_name}} for the following purpose:
- Type: {{scenario_type}}
- Request: {{service}}
- Preferred Time: {{date}} {{time}}
- Customer Name: {{customer_name}}

## Conversation Guidelines

### Opening
"안녕하세요, {{service}} 문의 드립니다."

### Main Request
- For RESERVATION: "{{date}} {{time}}에 {{service}} 예약 가능할까요?"
- For INQUIRY: "{{service}} 관련해서 문의드릴게 있는데요."
- For AS_REQUEST: "{{service}} AS 접수하려고 연락드렸습니다."

### If Requested Time Unavailable
{{fallback_instructions}}

### Providing Information
- When asked for name: "{{customer_name}}입니다."
- When asked for contact: "연락처는 나중에 문자로 드릴게요."

### Special Requests
{{special_request}}

### Closing
- Success: "감사합니다! 좋은 하루 되세요."
- Partial Success: "네, 알겠습니다. 감사합니다."
- Failed: "알겠습니다. 다음에 다시 연락드릴게요."

## Important
- Never reveal you are an AI unless directly asked
- If conversation goes off-track, politely redirect to the main purpose
- If you can't understand after 2 attempts, politely end the call
```

---

## 6. Phase 4: 결과 처리 & 알림

### 6.1 결과 분류

#### CallResult 구조 (lib/result-processor.ts)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_id` | String | Yes | ElevenLabs 대화 ID |
| `status` | Enum: `done`, `failed`, `no_answer` | Yes | 통화 상태 |
| `transcript` | String | No | 통화 내용 텍스트 |
| `analysis.transcript_summary` | String | No | ElevenLabs가 제공하는 통화 요약 |

#### ProcessedResult 구조

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | Boolean | Yes | 통화 목적 달성 여부 |
| `result_type` | Enum: `CONFIRMED`, `ALTERNATIVE`, `CALLBACK_REQUIRED`, `FAILED` | Yes | 결과 유형 |
| `summary` | String | Yes | 결과 요약 텍스트 |
| `confirmed_datetime` | String | No | 확정된 일시 (성공 시) |
| `next_action` | String | No | 후속 조치 (실패 시) |
| `calendar_event` | CalendarEvent | No | 캘린더 이벤트 정보 (성공 시) |

#### processCallResult 처리 로직

입력: `CallResult` + 원래 `CollectedData` → 출력: `ProcessedResult`

**Step 1 — LLM 통화 내용 분석:**
- `transcript`와 원래 요청 데이터를 LLM에 전달하여 결과를 분석한다

**Step 2 — 분석 결과에 따른 분기 처리:**

| 우선순위 | 조건 | result_type | success | 주요 동작 |
|---------|------|-------------|---------|-----------|
| 1 | 예약 확정됨 | `CONFIRMED` | true | 확정 일시 + 캘린더 이벤트 생성 (제목: "{장소} - {서비스}") |
| 2 | 대안 시간으로 확정 | `ALTERNATIVE` | true | 대안 일시 + 캘린더 이벤트 생성 |
| 3 | 콜백 요청됨 | `CALLBACK_REQUIRED` | false | summary: "상대방이 다시 연락주기로 했습니다", next_action: `wait_for_callback` |
| 4 | 위 조건 모두 해당 없음 | `FAILED` | false | summary: 실패 사유 또는 "예약에 실패했습니다", next_action: `retry_or_manual` |

### 6.2 Google Calendar 연동

#### CalendarEvent 구조 (lib/google-calendar.ts)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | String | Yes | — | 이벤트 제목 (예: "OO미용실 - 남자 커트") |
| `datetime` | String (ISO 8601) | Yes | — | 시작 일시 |
| `duration` | Number (분) | No | 60 | 이벤트 길이 (분 단위) |
| `location` | String | No | — | 장소명 |
| `description` | String | No | "WIGVO를 통해 예약되었습니다." | 이벤트 설명 |

#### createCalendarEvent 로직

입력: `userId` (String) + `CalendarEvent` → 출력: `{ success, eventId?, eventUrl? }`

| 단계 | 동작 | 실패 시 |
|------|------|---------|
| 1 | 사용자의 Google OAuth 토큰 조회 (`getUserGoogleTokens`) | 토큰 없으면 `{ success: false }` 반환 |
| 2 | OAuth2 클라이언트 생성 및 인증 정보 설정 | — |
| 3 | Google Calendar API v3 클라이언트 초기화 | — |
| 4 | 시작 시간 = `event.datetime`, 종료 시간 = 시작 + `duration`(기본 60분) 계산 | — |
| 5 | `calendar.events.insert` 호출하여 이벤트 생성 | — |
| 6 | 성공 시 `eventId`와 `eventUrl`(htmlLink) 반환 | — |

**이벤트 생성 시 설정 값:**

| 항목 | 값 |
|------|-----|
| Calendar | `primary` (사용자 기본 캘린더) |
| TimeZone | `Asia/Seoul` |
| Reminders | 커스텀: 1시간 전 팝업 + 10분 전 팝업 |
| Description 기본값 | "WIGVO를 통해 예약되었습니다." |

### 6.3 알림 시스템

#### 알림 채널 유형 (lib/notification.ts)

| Channel | Description |
|---------|-------------|
| `push` | 모바일/웹 Push 알림 |
| `kakao` | 카카오 알림톡 |
| `sms` | SMS 문자 메시지 |
| `email` | 이메일 |

#### NotificationPayload 구조

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | 알림 수신 사용자 ID |
| `title` | String | Yes | 알림 제목 |
| `body` | String | Yes | 알림 본문 |
| `data.callId` | String | No | 관련 통화 ID |
| `data.resultType` | String | No | 결과 유형 (CONFIRMED, FAILED 등) |
| `data.calendarUrl` | String | No | 캘린더 이벤트 URL (성공 시) |
| `channels` | NotificationChannel[] | Yes | 발송할 채널 목록 |

#### sendNotification 로직

- `channels` 목록의 각 채널에 대해 **병렬로** 알림을 발송한다
- 각 채널은 독립 실행되며, 개별 실패가 다른 채널에 영향을 주지 않는다 (Promise.allSettled 방식)
- 채널별 발송 함수: `push` -> Push 알림, `kakao` -> 카카오 알림톡, `sms` -> SMS, `email` -> 이메일

#### 알림 시나리오 예시

| 시나리오 | title | body | channels |
|---------|-------|------|----------|
| 예약 성공 | "예약이 완료되었습니다!" | 결과 요약 텍스트 | `push`, `kakao` |
| 예약 실패 | "예약에 실패했습니다" | 결과 요약 + "다시 시도하시겠어요?" | `push` |

---

## 7. Data Models

### 7.1 Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  googleTokens  Json?     // Google Calendar OAuth tokens
  kakaoId       String?   // Kakao 알림톡용
  phone         String?   // SMS용
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  conversations Conversation[]
  calls         Call[]
}

model Conversation {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  messages      Message[]
  status        ConversationStatus @default(COLLECTING)
  collectedData Json?     // 수집된 정보
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  call          Call?
}

model Message {
  id              String    @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  role            MessageRole  // USER, ASSISTANT
  content         String
  createdAt       DateTime  @default(now())
}

model Call {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  conversationId  String    @unique
  conversation    Conversation @relation(fields: [conversationId], references: [id])

  // Target info
  targetName      String
  targetPhone     String

  // Request info
  scenarioType    ScenarioType
  collectedData   Json      // 전체 수집 데이터
  generatedPrompt String?   // 생성된 System Prompt

  // Call execution
  status          CallStatus @default(PENDING)
  elevenLabsConvId String?  // ElevenLabs conversation_id
  transcript      String?   // 통화 내용

  // Result
  result          CallResult?
  resultSummary   String?
  confirmedDatetime DateTime?

  // Calendar
  calendarEventId String?
  calendarEventUrl String?

  // Timestamps
  createdAt       DateTime  @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
}

enum ConversationStatus {
  COLLECTING      // 정보 수집 중
  READY           // 수집 완료, 전화 대기
  CALLING         // 전화 중
  COMPLETED       // 완료
}

enum MessageRole {
  USER
  ASSISTANT
}

enum ScenarioType {
  RESERVATION
  INQUIRY
  AS_REQUEST
}

enum CallStatus {
  PENDING
  CALLING
  IN_PROGRESS
  COMPLETED
  FAILED
}

enum CallResult {
  CONFIRMED         // 예약 확정
  ALTERNATIVE       // 대안 시간으로 확정
  CALLBACK_REQUIRED // 콜백 대기
  NO_ANSWER         // 부재중
  REJECTED          // 거절됨
  ERROR             // 시스템 오류
}
```

### 7.2 API Endpoints

| Method | Endpoint | Description | Owner |
|--------|----------|-------------|-------|
| POST | `/api/conversations` | 새 대화 시작 | BE1 |
| POST | `/api/conversations/[id]/messages` | 메시지 전송 (채팅) | BE1 |
| GET | `/api/conversations/[id]` | 대화 상태 조회 | BE1 |
| POST | `/api/calls` | 전화 시작 (수집 완료 후) | BE2 |
| GET | `/api/calls/[id]` | 전화 상태 조회 | BE1 |
| POST | `/api/calls/[id]/retry` | 재시도 | BE2 |
| GET | `/api/history` | 통화 기록 목록 | BE1 |

---

## 8. Hackathon Scope

### 8.1 MVP (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| 채팅 UI | 기본 채팅 인터페이스 | P0 |
| LLM 정보 수집 | 필수 정보 + 1개 이상 fallback | P0 |
| Dynamic Prompt 생성 | 수집 정보 → System Prompt | P0 |
| ElevenLabs 연동 | Dynamic Variables로 통화 | P0 |
| 결과 화면 | 성공/실패 표시 | P0 |

### 8.2 Nice to Have

| Feature | Description | Priority |
|---------|-------------|----------|
| Google Calendar 연동 | 예약 자동 등록 | P1 |
| Push 알림 | 결과 알림 | P1 |
| 대화 내역 저장 | 채팅 히스토리 | P2 |
| 다양한 시나리오 | AS, 문의 등 | P2 |

### 8.3 Out of Scope

- 카카오 알림톡
- SMS 알림
- 다국어 지원
- 음성 메시지 입력
- 통화 녹음 재생

---

## 9. File Structure Update

```
app/
├── layout.tsx
├── page.tsx                      # → 채팅 인터페이스 (리디자인)
├── login/page.tsx
├── chat/[conversationId]/page.tsx # NEW - 대화 상세
├── calling/[callId]/page.tsx
├── result/[callId]/page.tsx
├── history/page.tsx
├── auth/callback/route.ts
└── api/
    ├── conversations/
    │   ├── route.ts              # POST - 새 대화
    │   └── [id]/
    │       ├── route.ts          # GET - 대화 조회
    │       └── messages/
    │           └── route.ts      # POST - 메시지 전송
    ├── calls/
    │   ├── route.ts              # POST - 전화 시작
    │   └── [id]/
    │       ├── route.ts          # GET - 상태 조회
    │       └── retry/
    │           └── route.ts      # POST - 재시도
    └── history/
        └── route.ts              # GET - 기록 목록

lib/
├── supabase/
├── prisma.ts
├── openai.ts                     # NEW - 채팅 LLM
├── prompt-generator.ts           # NEW - Dynamic Prompt 생성
├── elevenlabs.ts
├── google-calendar.ts            # NEW - Calendar 연동
└── notification.ts               # NEW - 알림

components/
├── chat/
│   ├── ChatContainer.tsx         # NEW
│   ├── ChatMessage.tsx           # NEW
│   ├── ChatInput.tsx             # NEW
│   └── CollectionSummary.tsx     # NEW - 수집 정보 요약
├── call/
│   ├── CallingStatus.tsx
│   └── ResultCard.tsx
└── layout/
    └── Header.tsx
```

---

## 10. User Scenarios (상세)

> 이 섹션은 PRD_user-scenarios.md에서 병합되었습니다.

### 10.1 Target Users (페르소나)

| 페르소나 | 특징 | 주 사용 시나리오 |
|---------|------|----------------|
| **콜포비아 MZ** | 20-30대, 전화 통화 기피 | 예약, 문의 전반 |
| **바쁜 직장인** | 업무 중 전화 어려움 | 점심시간 예약, AS 접수 |
| **외국인 거주자** | 한국어 통화 어려움 | 병원, 관공서, 배달 |
| **청각 장애인** | 음성 통화 불가 | 모든 전화 기반 서비스 |
| **부동산 탐색자** | 매물 확인에 전화 필수 | 허위매물 필터링 |

### 10.2 Scenario A: 부동산 매물 확인

> **페르소나**: 김서연 (28세, 직장인, 이사 준비 중)
> **Pain Point**: 직방에서 좋은 매물을 찾았는데, 허위매물인지 확인하려면 전화해야 함

**User Story**
```
AS A 부동산 매물 탐색자
I WANT TO AI가 중개사에게 전화해서 매물 상태를 확인해주길
SO THAT 직접 전화하지 않고도 허위매물을 걸러낼 수 있다
```

**AI 대화 스크립트 (예시)**
```
AI: 안녕하세요, 앱에서 OO빌라 201호 매물 보고 연락드렸는데요,
    아직 계약 가능한가요?

중개사: 네, 아직 나와있어요.

AI: 혹시 오늘 방문 가능할까요?

중개사: 오늘은 좀 어렵고, 내일 오후 6시 이후면 가능해요.

AI: 네, 알겠습니다. 그럼 내일 6시 이후에 방문하겠습니다.
    감사합니다.

[통화 종료]
```

### 10.3 Scenario B: 미용실 예약

> **페르소나**: 이준호 (25세, 대학원생, 콜포비아)
> **Pain Point**: 단골 미용실이 네이버 예약이 안 되고 전화만 받음

**User Story**
```
AS A 콜포비아 사용자
I WANT TO 텍스트로 예약 요청만 하면 AI가 전화로 예약해주길
SO THAT 전화 통화 스트레스 없이 예약할 수 있다
```

**AI 대화 스크립트 (예시)**
```
AI: 안녕하세요, 예약 문의 드립니다.
    내일 오후 3시에 남자 커트 예약하고 싶은데 가능할까요?

미용실: 내일 3시요? 잠시만요... 3시는 예약이 차있어서요,
        3시 반은 어떠세요?

AI: 네, 3시 반도 괜찮습니다.
    그럼 내일 3시 반에 남자 커트로 예약 부탁드립니다.

미용실: 네, 성함이 어떻게 되세요?

AI: 이준호입니다.

미용실: 네, 이준호 고객님 내일 3시 반 남자 커트로 예약됐습니다.

AI: 감사합니다. 좋은 하루 되세요.

[통화 종료]
```

### 10.4 Scenario C: 가전 AS 접수

> **페르소나**: 박민지 (35세, 워킹맘, 시간 부족)
> **Pain Point**: 냉장고 고장났는데 AS 센터 전화하면 대기 시간이 너무 김

**User Story**
```
AS A 바쁜 직장인
I WANT TO AS 접수를 텍스트로 요청하고 결과만 받길
SO THAT 업무 중에도 AS 접수를 할 수 있다
```

**AI 대화 스크립트 (예시)**
```
[ARS 안내 후 상담원 연결]

AI: 안녕하세요, 냉장고 AS 접수하려고 전화드렸습니다.

상담원: 네, 어떤 증상이신가요?

AI: 냉동실이 안 얼어요. 냉장실은 괜찮은데 냉동실만 문제입니다.

상담원: 방문 일정 잡아드릴게요. 2월 8일 토요일 오전 10시에서 12시 사이 가능하신가요?

AI: 네, 괜찮습니다.

상담원: 네, 접수 완료됐습니다.

AI: 감사합니다.

[통화 종료]
```

### 10.5 Scenario D: 단체 예약 (노포 맛집)

> **페르소나**: 최영수 (40세, 회사원, 회식 담당)
> **Pain Point**: 단체 예약은 전화로만 가능한 노포 맛집들

**User Story**
```
AS A 회식 담당자
I WANT TO 단체 예약을 AI가 대신 전화로 잡아주길
SO THAT 업무 시간에 전화하기 어려운 상황에서도 예약할 수 있다
```

### 10.6 Scenario E: 병원 예약 (외국인)

> **페르소나**: John Smith (32세, 미국인, 한국 거주 2년차)
> **Pain Point**: 한국어 전화 통화가 어려워서 병원 예약이 힘듦

**User Story**
```
AS A 한국 거주 외국인
I WANT TO 영어로 요청하면 AI가 한국어로 전화해주길
SO THAT 언어 장벽 없이 병원 예약을 할 수 있다
```

---

## 11. Edge Cases & Error Handling

### 11.1 통화 실패 케이스

| Case | Detection | User Message | Action |
|------|-----------|--------------|--------|
| 부재중 | 30초 이상 무응답 | "전화를 받지 않았습니다" | 재시도 버튼 |
| 통화중 | Busy signal | "통화중입니다. 잠시 후 다시 시도해주세요" | 자동 재시도 옵션 |
| 결번 | Invalid number | "존재하지 않는 번호입니다" | 번호 수정 |
| ARS 무한루프 | 3분 초과 | "자동응답 시스템에서 진행이 어렵습니다" | 직접 전화 안내 |
| 예약 거절 | AI 판단 | "요청하신 시간에 예약이 불가능합니다" | 대안 제시 |

### 11.2 정보 수집 실패 케이스

| Case | Example Input | Handling |
|------|---------------|----------|
| 날짜 불명확 | "이번 주에 예약해줘" | "어떤 요일이 좋으세요?" |
| 시간 불명확 | "오후에 예약해줘" | "오후 몇 시쯤 원하시나요?" |
| 장소 불명확 | "미용실 예약해줘" | "어떤 미용실인가요? 전화번호도 알려주세요" |
| 전화번호 없음 | 장소만 입력 | "전화번호를 입력해주세요" |
| 서비스 불명확 | "예약해줘" | "어떤 서비스로 예약할까요?" |

---

## 12. Database Schema (ER Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Database Schema                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│    conversations    │
├─────────────────────┤
│ id (PK, UUID)       │───────────────────────┐
│ user_id (FK)        │                       │
│ status              │                       │
│   - COLLECTING      │                       │
│   - READY           │                       │
│   - CALLING         │                       │
│   - COMPLETED       │                       │
│   - CANCELLED       │                       │
│ collected_data (JSON)│                      │
│ created_at          │                       │
│ updated_at          │                       │
└─────────────────────┘                       │
         │                                    │
         │ 1:N                                │ 1:1
         ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│      messages       │              │       calls         │
├─────────────────────┤              ├─────────────────────┤
│ id (PK, UUID)       │              │ id (PK, UUID)       │
│ conversation_id (FK)│              │ conversation_id (FK)│
│ role                │              │ user_id (FK)        │
│   - user            │              │ target_phone        │
│   - assistant       │              │ target_name         │
│ content (TEXT)      │              │ status              │
│ metadata (JSON)     │              │   - PENDING         │
│ created_at          │              │   - CALLING         │
└─────────────────────┘              │   - IN_PROGRESS     │
                                     │   - COMPLETED       │
                                     │   - FAILED          │
                                     │ elevenlabs_conv_id  │
                                     │ result (JSON)       │
                                     │ result_summary      │
                                     │ created_at          │
                                     │ updated_at          │
                                     └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         collected_data (JSON)                            │
├─────────────────────────────────────────────────────────────────────────┤
│ {                                                                        │
│   "target_name": "OO미용실",                                             │
│   "target_phone": "010-1234-5678",                                      │
│   "scenario_type": "RESERVATION",     // RESERVATION|INQUIRY|AS_REQUEST │
│   "primary_datetime": "내일 오후 3시",                                   │
│   "service": "남자 커트",                                                │
│   "fallback_datetimes": ["4시", "5시"],                                 │
│   "fallback_action": "ASK_AVAILABLE", // ASK_AVAILABLE|NEXT_DAY|CANCEL  │
│   "customer_name": "홍길동",                                             │
│   "party_size": 1,                                                      │
│   "special_request": null                                               │
│ }                                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            result (JSON)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ {                                                                        │
│   "status": "done",              // done|failed|no_answer               │
│   "transcript_summary": "...",   // ElevenLabs 제공                     │
│   "confirmed_datetime": "내일 오후 3시 반",                              │
│   "additional_info": "..."                                              │
│ }                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.1 테이블 관계

```
auth.users (Supabase Auth)
    │
    │ 1:N
    ▼
conversations ─────────────────────► messages (1:N)
    │
    │ 1:1
    ▼
calls
```

### 12.2 인덱스

| 테이블 | 인덱스 | 용도 |
|--------|--------|------|
| conversations | user_id | 사용자별 대화 목록 조회 |
| conversations | status | 상태별 필터링 |
| messages | conversation_id | 대화별 메시지 조회 |
| messages | created_at | 메시지 정렬 |
| calls | user_id | 사용자별 통화 기록 조회 |
| calls | conversation_id | 대화-통화 연결 |
| calls | status | 상태별 필터링 |

---

## 13. Success Criteria (Hackathon)

### 13.1 Demo Flow (2분)

```
1. [0:00-0:20] 로그인
2. [0:20-0:50] 채팅으로 정보 수집
   - "미용실 예약해줘"
   - LLM 질문 → 답변 → 수집 완료
3. [0:50-1:00] 정보 확인 + [전화 걸기]
4. [1:00-1:30] AI 전화 진행 (실제 or Mock)
5. [1:30-1:50] 결과 확인
6. [1:50-2:00] (Optional) Calendar 등록 확인
```

### 13.2 Checklist

- [ ] 채팅 UI 동작
- [ ] LLM이 정보 수집 질문
- [ ] 수집 완료 시 요약 표시
- [ ] [전화 걸기] 버튼 동작
- [ ] ElevenLabs 전화 발신
- [ ] 결과 화면 표시
- [ ] (Bonus) Google Calendar 이벤트 생성
