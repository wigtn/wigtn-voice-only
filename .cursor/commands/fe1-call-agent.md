# FE1: 채팅/로그인 UI 개발 지시서 (v2)

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: FE1 - 채팅/로그인 UI 담당
> **담당 시간**: Phase 1 (0:30-2:00)
> **버전**: v2 (Dynamic Agent Platform - 채팅 기반 정보 수집)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("FE1-1 시작해", "채팅 UI 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("채팅 훅 전체 설계해줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("채팅이 안 돼", "메시지가 안 보여") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("useChat 구조 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

> 명시적 모드 지정이 없으면 **Agent 모드**로 진행하세요.

---

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)

---

## File Ownership

### FE1이 소유하는 파일 (ONLY these)
```
app/layout.tsx
app/page.tsx                      # 채팅 화면 (메인)
app/login/page.tsx
components/layout/Header.tsx
components/auth/LoginButton.tsx
components/chat/ChatContainer.tsx # 신규: 채팅 컨테이너
components/chat/ChatMessage.tsx   # 신규: 메시지 버블
components/chat/ChatInput.tsx     # 신규: 입력창
components/chat/CollectionSummary.tsx  # 신규: 수집 완료 요약
hooks/useChat.ts                  # 신규: 채팅 훅
lib/api.ts
lib/validation.ts
```

### 절대 수정하지 마세요
- `app/calling/`, `app/result/`, `app/history/` — FE2 소유
- `app/api/` — BE1, BE2 소유
- `lib/supabase/` — BE1 소유 (import는 자유, 수정 금지)
- `lib/elevenlabs.ts` — BE2 소유
- `shared/types.ts` — BE1 소유 (읽기만 가능)

---

## 역할 요약 (v2)

사용자가 AI와 **채팅**하며 전화 요청 정보를 수집하는 **채팅 화면**과 **로그인 화면**을 개발합니다.

```
[당신이 만드는 부분 - v2]

┌─────────────────────────────────────────┐
│  📞 WIGVO에 오신 걸 환영합니다          │  ← 로그인 화면
│                                         │
│  [G Google로 계속하기]                  │
│  [🍎 Apple로 계속하기]                  │
│  [💬 카카오로 계속하기]                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  📞 WIGVO                    [로그아웃] │  ← 헤더
├─────────────────────────────────────────┤
│                                         │
│  🤖 안녕하세요! 어떤 전화를 대신        │  ← 채팅 화면 (메인)
│     걸어드릴까요?                       │
│                                         │
│                    내일 오후 3시에       │
│                    OO미용실 커트        │
│                    예약해줘 👤          │
│                                         │
│  🤖 OO미용실에 전화할 전화번호를        │
│     알려주세요!                         │
│                                         │
│                    010-1234-5678 👤     │
│                                         │
│  🤖 좋아요! 정리해볼게요:               │
│                                         │
│     📍 OO미용실 (010-1234-5678)        │
│     📅 내일 오후 3시                    │
│     ✂️ 커트                             │
│                                         │
│     맞으시면 전화 걸어볼게요!           │
│                                         │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │  ← 수집 완료 시
│  │ [수정하기]      [📞 전화 걸기]    │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  [메시지를 입력하세요...      ] [전송] │  ← 입력창
└─────────────────────────────────────────┘
```

---

## 태스크 목록

### FE1-1: 메인 레이아웃 (10분)

**파일**: `app/layout.tsx`, `components/layout/Header.tsx`

**layout.tsx 요구사항:**
- `<html lang="ko">` 설정
- `bg-gray-50 min-h-screen` 배경
- Header 컴포넌트 포함
- `container mx-auto max-w-md` 메인 컨테이너 (모바일 우선)

**Header.tsx 요구사항:**
- 'use client' (로그아웃 이벤트 처리)
- 좌측: "WIGVO" 로고 (text-xl font-bold text-blue-600)
- 우측: 로그아웃 버튼 → `supabase.auth.signOut()` → localStorage에서 `currentConversationId` 삭제 → `/login` redirect
- sticky top-0, 흰색 배경, border-bottom
- **로그인 페이지에서는 Header 숨김**: pathname이 `/login`이면 Header를 렌더링하지 않음 (layout.tsx에서 조건부 렌더링 또는 Header 내부에서 `usePathname()` 사용)

---

### FE1-2: 로그인 화면 (15분)

**파일**: `app/login/page.tsx`, `components/auth/LoginButton.tsx`

**LoginButton.tsx 요구사항:**
- Props: `{ provider: 'google' | 'apple' | 'kakao', label: string, icon: string }`
- 'use client'
- `supabase.auth.signInWithOAuth` 호출, redirectTo: `/auth/callback`
- 스타일: 전체 너비, border, rounded, hover 효과

**login/page.tsx 요구사항:**
- 중앙 정렬, max-w-sm
- "WIGVO" 제목 + "AI 음성 비서로 전화를 대신 걸어드립니다" 설명
- Google / Apple / Kakao 3개 LoginButton
- 하단: 이용약관 동의 안내 텍스트

---

### FE1-3: useChat 훅 (25분)

**파일**: `hooks/useChat.ts`

**참고**: `api-contract.mdc`의 Endpoint 0-1, 0-2, 0-3

**상태:**

| 상태 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| conversationId | string \| null | null | 현재 대화 ID |
| messages | Message[] | [] | 채팅 메시지 목록 |
| collectedData | CollectedData \| null | null | 수집된 정보 |
| isComplete | boolean | false | 수집 완료 여부 |
| isLoading | boolean | false | API 호출 중 |
| conversationStatus | ConversationStatus | 'COLLECTING' | 대화 상태 |

**함수:**

| 함수 | 호출 API | 동작 |
|------|---------|------|
| `startConversation()` | POST /api/conversations | 새 대화 시작, greeting 표시, localStorage에 ID 저장 |
| `resumeConversation(id)` | GET /api/conversations/{id} | 기존 대화 복구 (실패 시 새로 시작) |
| `sendMessage(content)` | POST /api/chat | Optimistic update → API 호출 → 응답 반영 (실패 시 rollback) |

**초기화 로직 (useEffect) — StrictMode 이중 초기화 방지:**

React StrictMode에서 useEffect가 2번 실행되므로 반드시 `useRef`(initializedRef)로 중복 실행을 방지해야 합니다. ref 체크 없이 호출하면 대화가 2개 생성됩니다.

- `isInitializing` 상태를 추가하여 초기화 중 로딩 표시

**Resume 결정 테이블:**

| localStorage 상태 | conversation 조회 결과 | 동작 |
|------------------|---------------------|------|
| `currentConversationId` 있음 | 200 OK, status=COLLECTING | `resumeConversation` — 기존 대화 이어가기 |
| `currentConversationId` 있음 | 200 OK, status=READY | `resumeConversation` — 수집 완료 상태 복원 |
| `currentConversationId` 있음 | 200 OK, status=COMPLETED/CALLING | localStorage 삭제 → `startConversation` — 새 대화 시작 |
| `currentConversationId` 있음 | 401 에러 | `/login`으로 redirect |
| `currentConversationId` 있음 | 404 또는 기타 에러 | localStorage 삭제 → `startConversation` |
| `currentConversationId` 없음 | — | `startConversation` |

**401 에러 처리:**
- API 호출 시 401 응답을 받으면 즉시 `/login`으로 redirect
- sendMessage, startConversation, resumeConversation 모두에 적용

**Optimistic update + rollback 단계 (sendMessage):**
1. 사용자 메시지를 즉시 messages 배열에 추가 (optimistic)
2. isLoading = true
3. POST /api/chat 호출
4. 성공 시: assistant 메시지 추가, collectedData/isComplete 업데이트
5. **실패 시 rollback**: 마지막으로 추가한 사용자 메시지를 messages에서 제거, 에러 메시지 표시

**수정하기 동작:**
- CollectionSummary의 "수정하기" 클릭 시: `isComplete`를 false로 되돌리고, "수정할 내용을 말씀해주세요" 안내 메시지를 messages에 추가
- conversation status는 COLLECTING으로 변경 (서버에 별도 요청 없이 프론트에서만 상태 변경 후, 다음 sendMessage에서 서버 상태도 자동 갱신)

**calling 이동 전 localStorage 정리:**
- "전화 걸기" 버튼 클릭 후 `/calling/{id}`로 이동할 때, localStorage에서 `currentConversationId`를 삭제하여 돌아왔을 때 새 대화가 시작되도록 함

---

### FE1-4: 채팅 컴포넌트들 (30분)

**파일**: `components/chat/ChatContainer.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`, `CollectionSummary.tsx`

**ChatContainer.tsx 요구사항:**
- 'use client'
- useChat 훅 사용
- 메시지 목록 표시 (flex-1 overflow-y-auto)
- **자동 스크롤**: 새 메시지 추가 시 스크롤을 맨 아래로 이동 (messagesEndRef + scrollIntoView)
- **로딩 중 "입력 중..." 표시**: isLoading이 true일 때 assistant 아바타 + "입력 중..." 텍스트 (animate-bounce 점 3개)
- 수집 완료 시 CollectionSummary 표시
- ChatInput으로 메시지 입력
- "전화 걸기" 버튼: POST /api/calls → POST /api/calls/{id}/start → localStorage에서 `currentConversationId` 삭제 → `/calling/{id}` 이동
- "새로운 요청하기" 버튼: localStorage 초기화 + startConversation

**ChatMessage.tsx 요구사항:**
- Props: `{ message: Message }`
- user 메시지: 우측 정렬, 파란 배경, 흰 텍스트
- assistant 메시지: 좌측 정렬, 흰 배경, 테두리, "🤖 AI 비서" 라벨
- max-w-[80%], rounded-2xl

**ChatInput.tsx 요구사항:**
- Props: `{ onSend, disabled?, placeholder? }`
- 'use client'
- **textarea 사용** (input이 아닌 textarea — 여러 줄 입력 지원)
- Enter로 전송 (Shift+Enter는 줄바꿈) — `onKeyDown`에서 `e.key === 'Enter' && !e.shiftKey` 체크
- disabled/loading 시 비활성화
- 전송 후 textarea 내용 초기화

**CollectionSummary.tsx 요구사항:**
- Props: `{ data: CollectedData, onConfirm, onEdit, onNewConversation }`
- 수집된 정보 요약 표시 (이름, 전화번호, 일시, 서비스, 예약자, 특별 요청)
- [수정하기] 버튼 → onEdit
- [📞 전화 걸기] 버튼 → onConfirm
- [새로운 요청하기] 텍스트 버튼 → onNewConversation
- 초록색 배경 (bg-green-50)

---

### FE1-5: 메인 페이지 (채팅 화면) (10분)

**파일**: `app/page.tsx`

**요구사항:**
- ChatContainer 컴포넌트 렌더링

---

### FE1-6: API 헬퍼 함수 (10분)

**파일**: `lib/api.ts`

**목적**: API 호출을 중앙 관리하는 헬퍼 함수 모음

**함수 목록:**

| 함수 | HTTP | URL | 설명 |
|------|------|-----|------|
| `createConversation()` | POST | /api/conversations | 대화 시작 |
| `getConversation(id)` | GET | /api/conversations/{id} | 대화 조회 |
| `sendChatMessage(conversationId, message)` | POST | /api/chat | 메시지 전송 |
| `createCall(conversationId)` | POST | /api/calls | 통화 생성 |
| `startCall(callId)` | POST | /api/calls/{id}/start | 통화 시작 |
| `getCall(id)` | GET | /api/calls/{id} | 통화 조회 |

---

## 파일 구조

```
app/
├── layout.tsx           ← 메인 레이아웃
├── page.tsx             ← 채팅 화면 (메인)
└── login/
    └── page.tsx         ← 로그인 화면

components/
├── layout/
│   └── Header.tsx       ← 헤더 + 로그아웃
├── auth/
│   └── LoginButton.tsx  ← OAuth 로그인 버튼
└── chat/
    ├── ChatContainer.tsx   ← 채팅 메인 컨테이너
    ├── ChatMessage.tsx     ← 메시지 버블
    ├── ChatInput.tsx       ← 입력창
    └── CollectionSummary.tsx  ← 수집 완료 요약

hooks/
└── useChat.ts           ← 채팅 훅

lib/
├── api.ts               ← API 함수
└── validation.ts        ← 유효성 검사
```

---

## 의존성

- **받는 것**: BE1 API, BE1 Supabase 클라이언트, BE1 middleware + callback
- **주는 것**: FE2에게 `/calling/[id]`로 이동
- **BE2 호출**: `POST /api/calls/[id]/start`

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:40 | 로그인 화면 완성, OAuth 버튼 동작 |
| 0:50 | 레이아웃 완성, 헤더 표시됨 |
| 1:15 | useChat 훅 완성 |
| 1:40 | 채팅 컴포넌트 완성, 메시지 표시됨 |
| 1:50 | 수집 완료 요약 + 버튼 표시 |
| 2:00 | 전화 걸기 버튼 동작 (calling 페이지로 이동) |

---

## 주의사항

1. **shadcn/ui 사용**: Button, Input, Card 컴포넌트 활용
2. **한국어 UI**: 모든 텍스트 한국어로
3. **모바일 우선**: `max-w-md` 컨테이너 사용
4. **API 응답 형태**: `api-contract.mdc` 참고
5. **타입**: `shared/types.ts`의 Message, CollectedData 인터페이스 사용
6. **대화 복구**: localStorage에 conversationId 저장하여 새로고침 시 복구

---

## Phase 2 통합 시 할 일

- BE1과 함께 채팅 API 연동 테스트
- 실제 LLM 응답으로 채팅 확인
- 수집 완료 → 전화 걸기 플로우 확인
- 대화 복구 (새로고침) 테스트
