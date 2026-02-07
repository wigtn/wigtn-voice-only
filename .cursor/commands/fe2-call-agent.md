# FE2: 결과/상태 UI 개발 지시서 (v2)

> **프로젝트**: WIGVO (4시간 해커톤)
> **역할**: FE2 - 결과/상태 UI 담당
> **담당 시간**: Phase 1 (0:30-2:00)
> **버전**: v2 (변경 최소 - 채팅→통화 플로우만 변경)

## Mode Selection (자동)

사용자의 요청 의도를 파악하여 적절한 모드로 동작하세요:

| 사용자 의도 | 모드 | 동작 |
|------------|------|------|
| 태스크 구현 요청 ("FE2-1 시작해", "통화 중 화면 만들어줘") | **Agent** | 아래 태스크 목록에서 해당 항목을 찾아 바로 구현 |
| 복잡한 기능 시작 ("폴링 로직 전체 설계해줘") | **Plan → Agent** | 계획 수립 → 사용자 승인 → 구현 |
| 버그/에러 수정 ("폴링이 안 돼", "결과 화면이 안 나와") | **Debug** | 로그 삽입 → 원인 추적 → 수정 |
| 코드 이해/질문 ("useCallPolling 구조 설명해줘") | **Ask** | 코드를 읽고 설명만, 수정하지 않음 |

> 명시적 모드 지정이 없으면 **Agent 모드**로 진행하세요.

---

## IMPORTANT: 필독 문서

작업 시작 전에 반드시 읽어야 할 파일들:
1. **`.cursorrules`** — 프로젝트 전체 규칙, 아키텍처, 코딩 컨벤션
2. **`.cursor/rules/team-workflow.mdc`** — 파일 오너십, 충돌 방지 규칙
3. **`.cursor/rules/api-contract.mdc`** — API 요청/응답 스키마 (SSOT)

---

## File Ownership

### FE2가 소유하는 파일 (ONLY these)
```
app/calling/[id]/page.tsx
app/result/[id]/page.tsx
app/history/page.tsx
components/call/CallingStatus.tsx
components/call/ResultCard.tsx
components/call/HistoryList.tsx
hooks/useCallPolling.ts
```

### 절대 수정하지 마세요
- `app/layout.tsx`, `app/page.tsx`, `app/login/page.tsx` — FE1 소유
- `app/api/` — BE1, BE2 소유
- `app/auth/` — BE1 소유
- `lib/supabase/` — BE1 소유 (import는 자유, 수정 금지)
- `lib/elevenlabs.ts` — BE2 소유
- `shared/types.ts` — BE1 소유 (읽기만 가능)
- `middleware.ts` — BE1 소유

---

## 역할 요약 (v2)

AI가 전화 중일 때의 **통화 중 화면**과 **결과 화면**, **통화 기록 목록**을 개발합니다.

**v2 변경사항**: FE1 채팅 화면에서 바로 `/calling/[id]`로 이동 (기존 `/confirm/[id]` 삭제됨)

```
[당신이 만드는 부분 - v2]

                  ┌─────────────────────────────────────────┐
(FE1 채팅 화면) → │           📞 통화 중...                  │  ← 통화 중 화면
                  │                                         │
                  │           🤖  ↔️  📱                     │
                  │           AI    미용실                   │
                  │                                         │
                  │           ⏱️ 00:32 경과                  │
                  │                                         │
                  │  ✅ 전화 연결됨                          │
                  │  ⏳ 예약 요청 중...                      │
                  │                                         │
                  └─────────────────────────────────────────┘
                                    ↓
                  ┌─────────────────────────────────────────┐
                  │  ✅ 예약이 완료되었습니다!               │  ← 결과 화면
                  │                                         │
                  │  📍 OO미용실                             │
                  │  📆 2026년 2월 6일 (목)                  │
                  │  ⏰ 오후 3시                             │
                  │  ✂️ 커트                                 │
                  │                                         │
                  │  📝 AI 요약                              │
                  │  "예약이 정상적으로 완료되었습니다..."   │
                  │                                         │
                  │           [🏠 홈으로]                    │
                  └─────────────────────────────────────────┘
```

---

## 태스크 목록

### FE2-1: 통화 중 화면 (20분)

**파일**: `app/calling/[id]/page.tsx`, `components/call/CallingStatus.tsx`

**calling/[id]/page.tsx 요구사항:**
- 'use client'
- **useParams** 사용: Next.js 15+에서 클라이언트 컴포넌트의 params 접근은 `useParams()` 훅 사용 (서버 컴포넌트에서만 `await params`)
- 상태 폴링: `GET /api/calls/{id}` 매 3초마다 호출
- **Terminal 상태 시 자동 이동**: COMPLETED 또는 FAILED 감지 시 **1초 후** `/result/{id}`로 이동 (사용자가 상태 변화를 인지할 수 있도록 약간의 딜레이)
- **hasNavigated ref**: 이미 이동 처리가 시작되었으면 중복 이동 방지
- Terminal 상태 감지 시 **경과 시간 타이머도 정지**
- 경과 시간 카운터 (1초마다 증가)

**CallingStatus.tsx 요구사항:**
- Props: `{ call: Call | null, elapsed: number }`
- "📞 통화 중..." 제목
- 애니메이션: 🤖 ↔️ 📱 (animate-pulse, animate-bounce)
- 대상 이름 표시 (call.targetName)
- 경과 시간 표시 (MM:SS 형식, font-mono)

**CallingStatus 3단계 step 정의:**

| call.status | step 표시 | 아이콘 |
|-------------|----------|--------|
| CALLING | "전화 연결 중..." | ⏳ (활성) |
| IN_PROGRESS | "예약 요청 중..." | ⏳ (활성) |
| COMPLETED/FAILED | "통화 종료" | ✅ 또는 ❌ |

각 step은 현재 상태에 맞게 활성/비활성 스타일을 다르게 표시합니다.

---

### FE2-2: 결과 화면 (25분)

**파일**: `app/result/[id]/page.tsx`, `components/call/ResultCard.tsx`

**result/[id]/page.tsx 요구사항:**
- `GET /api/calls/{id}`로 데이터 조회 (cache: 'no-store')
- ResultCard 컴포넌트에 call 데이터 전달

**ResultCard.tsx 요구사항:**
- Props: `{ call: Call }`
- 'use client' (router.push 사용)
- 성공 시 (result === 'SUCCESS'): ✅ + "예약이 완료되었습니다!" + 예약 정보 카드
- 실패 시: ❌ + 실패 사유 (NO_ANSWER/REJECTED/ERROR별 메시지) + [다시 시도하기]
- AI 요약 표시 (call.summary)
- 하단 버튼: [📋 기록 보기] + [🏠 홈으로]

---

### FE2-3: 통화 기록 목록 (20분)

**파일**: `app/history/page.tsx`, `components/call/HistoryList.tsx`

**API**: `GET /api/calls` → `{ calls: Call[] }` (`api-contract.mdc` Endpoint 2 참조)

**history/page.tsx 요구사항:**
- "📋 통화 기록" 제목
- HistoryList 컴포넌트에 calls 전달

**HistoryList.tsx 요구사항:**
- Props: `{ calls: Call[] }`
- 빈 목록: "아직 통화 기록이 없습니다." 표시
- 각 항목: 이름, 유형(예약/문의), 상태 배지, 날짜
- StatusBadge: SUCCESS → "✅ 성공", FAILED → "❌ 실패", CALLING → "📞 통화중", PENDING → "⏳ 대기"

**Call 상태별 네비게이션 대상:**

| call.status | 클릭 시 이동 | 이유 |
|-------------|------------|------|
| COMPLETED / FAILED | `/result/{id}` | 결과 확인 |
| CALLING / IN_PROGRESS | `/calling/{id}` | 통화 중 화면으로 |
| PENDING | `/calling/{id}` | 곧 시작될 통화 대기 |

---

### FE2-4: 폴링 훅 (10분)

**파일**: `hooks/useCallPolling.ts`

**입력**: callId (string)
**출력**: `{ call: Call | null, loading: boolean }`

**동작:**
- 즉시 1회 조회 + 3초 간격 폴링
- COMPLETED 또는 FAILED 시 폴링 자동 중지
- 언마운트 시 clearInterval — **반드시 cleanup 함수에서 interval 정리**

**에러 처리 및 retry:**

| 상황 | 동작 |
|------|------|
| 200 OK | 정상 처리, retry counter 리셋 |
| 401 Unauthorized | **즉시 폴링 중단**, `/login`으로 redirect |
| 404 Not Found | **즉시 폴링 중단**, `/`(홈)으로 이동 |
| 500 / 네트워크 에러 | retry counter 증가, **최대 3회** 연속 실패 시 폴링 중단 + 에러 표시 |

- retry counter는 성공 응답 시 0으로 리셋
- interval cleanup은 useEffect의 return 함수에서 반드시 수행

---

## 파일 구조

```
app/
├── calling/[id]/page.tsx  ← 통화 중 화면
├── result/[id]/page.tsx   ← 결과 화면
└── history/page.tsx       ← 통화 기록

components/call/
├── CallingStatus.tsx      ← 통화 중 상태
├── ResultCard.tsx         ← 결과 카드
└── HistoryList.tsx        ← 기록 목록

hooks/
└── useCallPolling.ts      ← 폴링 훅
```

---

## 의존성 (v2)

- **받는 것**: FE1에서 `/calling/[id]`로 이동, BE1 API, BE2 통화 결과 (polling)
- **주는 것**: 결과 화면에서 홈(/)으로 이동

---

## 체크포인트

| 시간 | 체크 |
|------|------|
| 0:50 | 통화 중 화면 기본 레이아웃 |
| 1:15 | 결과 화면 성공 케이스 완성 |
| 1:30 | 결과 화면 실패 케이스 추가 |
| 1:50 | 통화 기록 목록 완성 |
| 2:00 | 폴링 로직 동작 확인 (3초 간격) |

---

## 주의사항

1. **폴링 주기**: **3초**마다
2. **애니메이션**: `animate-pulse`, `animate-bounce` 활용
3. **상태 전환**: COMPLETED/FAILED 시 자동으로 결과 페이지로
4. **타입 일치**: `shared/types.ts`의 Call 인터페이스 사용
5. **API 응답 형태**: `api-contract.mdc` 참고

---

## Phase 2 통합 시 할 일

- BE2와 함께 Mock 모드 결과 반영 테스트
- 실제 통화 데이터로 결과 화면 확인
- 폴링 타이밍 조정 (필요시)
