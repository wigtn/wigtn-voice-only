# WIGVO 프로젝트 설정 가이드

> 해커톤 당일 BE1이 리드하여 진행합니다.
> 이 문서는 설계 명세서이며, 해커톤 당일 수동으로 실행합니다.

---

## 전체 설정 순서

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 0: 프로젝트 초기화 (BE1 리드, ~15분)                      │
├─────────────────────────────────────────────────────────────────┤
│  Step 1. Supabase 테이블 생성         (Dashboard, 2분)          │
│  Step 2. Next.js 프로젝트 생성        (터미널, 3분)             │
│  Step 3. 의존성 설치                  (터미널, 2분)             │
│  Step 4. shadcn/ui 설정               (터미널, 3분)             │
│  Step 5. 디렉토리 구조 생성           (터미널, 1분)             │
│  Step 6. 환경변수 설정                (편집기, 2분)             │
│  Step 7. 개발 서버 시작               (터미널, 1분)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1. Supabase 테이블 생성

### 1.1 Supabase Dashboard 접속

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (또는 새 프로젝트 생성)
3. 좌측 메뉴 → **SQL Editor** 클릭

### 1.2 SQL 실행

`scripts/supabase-tables.sql` 파일 내용을 복사하여 실행합니다.

**실행 후 확인 사항:**
- [ ] `conversations` 테이블 생성됨
- [ ] `messages` 테이블 생성됨
- [ ] `calls` 테이블 생성됨
- [ ] RLS 정책 활성화됨

### 1.3 API 키 복사

**Settings → API** 에서 다음 값을 복사해둡니다:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 1.4 ElevenLabs Agent Dashboard 설정 (BE2 필수)

ElevenLabs에서 Agent를 생성한 후 **반드시** 다음 설정을 확인합니다:

- [ ] **ElevenLabs Dashboard** → Conversational AI → Agent 선택
- [ ] **Settings → Security** → **"Enable overrides"** 체크
- [ ] **Override Options** → **"System prompt"** 체크
- [ ] **Override Options** → **"First message"** 체크 (전화 연결 직후 끊김 방지)
- [ ] **Twilio 전화 사용 시**: **Voice** → TTS Output **μ-law 8000 Hz** 선택
- [ ] **Twilio 전화 사용 시**: **Advanced** → Input format **μ-law 8000 Hz** 선택
- [ ] Agent 저장

> ⚠️ System prompt / First message override가 없으면 API에서 보낸 값이 **무시**됩니다.
> ⚠️ Twilio는 μ-law 8kHz를 사용합니다. 다른 포맷이면 통화가 연결 직후 끊길 수 있습니다. 자세한 내용은 `docs/11_ELEVENLABS_TWILIO_TROUBLESHOOTING.md` 참고.

---

## Step 2. Next.js 프로젝트 생성

### 2.1 프로젝트 생성 명령어

프로젝트 루트 디렉토리에서 실행:

```bash
npx create-next-app@latest temp-next \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --turbopack \
  --yes
```

**옵션 설명:**

| 옵션 | 설명 |
|------|------|
| `--typescript` | TypeScript 사용 |
| `--tailwind` | Tailwind CSS 설정 |
| `--eslint` | ESLint 설정 |
| `--app` | App Router 사용 |
| `--src-dir=false` | src 폴더 미사용 (루트에 app/) |
| `--import-alias="@/*"` | @ 경로 별칭 |
| `--turbopack` | Turbopack 사용 |
| `--yes` | 기본값 자동 선택 |

### 2.2 파일 이동

임시 폴더에서 필요한 파일만 현재 디렉토리로 이동:

```bash
# 핵심 파일 이동
mv temp-next/app ./
mv temp-next/public ./
mv temp-next/next.config.ts ./
mv temp-next/tailwind.config.ts ./
mv temp-next/postcss.config.mjs ./
mv temp-next/tsconfig.json ./
mv temp-next/package.json ./
mv temp-next/next-env.d.ts ./

# package-lock.json (있으면 이동)
mv temp-next/package-lock.json ./ 2>/dev/null || true

# ESLint 설정 (버전에 따라 다름)
mv temp-next/.eslintrc.json ./ 2>/dev/null || true
mv temp-next/eslint.config.mjs ./ 2>/dev/null || true

# 임시 폴더 삭제
rm -rf temp-next
```

### 2.3 확인 사항

- [ ] `app/` 폴더 존재
- [ ] `package.json` 존재
- [ ] `postcss.config.mjs` 존재 (Tailwind v4는 tailwind.config.ts 불필요)
- [ ] `tsconfig.json` 존재

---

## Step 3. 의존성 설치

### 3.1 Supabase 클라이언트

```bash
npm install @supabase/supabase-js @supabase/ssr
```

| 패키지 | 용도 |
|--------|------|
| `@supabase/supabase-js` | Supabase 코어 클라이언트 |
| `@supabase/ssr` | Next.js SSR 지원 |

### 3.2 OpenAI

```bash
npm install openai
```

### 3.3 UI 라이브러리

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
```

| 패키지 | 용도 |
|--------|------|
| `class-variance-authority` | 컴포넌트 변형 관리 |
| `clsx` | 조건부 클래스 결합 |
| `tailwind-merge` | Tailwind 클래스 충돌 해결 |
| `lucide-react` | 아이콘 라이브러리 |

### 3.4 유효성 검증

```bash
npm install zod
```

### 3.5 전체 설치 (한 줄)

위 명령어를 한 번에 실행하려면:

```bash
npm install @supabase/supabase-js @supabase/ssr openai class-variance-authority clsx tailwind-merge lucide-react zod
```

---

## Step 4. shadcn/ui 설정

### 4.1 초기화

```bash
npx shadcn@latest init -y -d
```

**옵션 설명:**
- `-y`: 기본값 자동 선택
- `-d`: 기본 스타일 사용

### 4.2 필수 컴포넌트 설치

```bash
npx shadcn@latest add button input card avatar scroll-area -y
```

**설치되는 컴포넌트:**

| 컴포넌트 | 용도 |
|----------|------|
| `button` | 버튼 (전송, 전화 걸기) |
| `input` | 텍스트 입력창 |
| `card` | 정보 요약 카드 |
| `avatar` | 채팅 아바타 |
| `scroll-area` | 채팅 스크롤 영역 |

### 4.3 확인 사항

- [ ] `components/ui/` 폴더 생성됨
- [ ] `components/ui/button.tsx` 존재
- [ ] `lib/utils.ts` 생성됨

---

## Step 5. 디렉토리 구조 생성

### 5.1 폴더 생성 명령어

```bash
mkdir -p app/api/conversations
mkdir -p app/api/chat
mkdir -p app/api/calls
mkdir -p components/chat
mkdir -p components/call
mkdir -p hooks
mkdir -p lib/supabase
mkdir -p types
```

### 5.2 최종 디렉토리 구조

```
wigtn-call-agent/
├── app/
│   ├── api/
│   │   ├── conversations/    # BE1 담당
│   │   ├── chat/             # BE1 담당
│   │   └── calls/            # BE2 담당
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn 컴포넌트
│   ├── chat/                 # FE1 담당
│   └── call/                 # FE2 담당
├── hooks/                    # FE1 담당
├── lib/
│   ├── supabase/             # BE1 담당
│   └── utils.ts              # shadcn 유틸
├── types/                    # BE1 담당
├── .env.local                # 환경변수
└── package.json
```

---

## Step 6. 환경변수 설정

### 6.1 .env.local 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성합니다:

```bash
touch .env.local
```

### 6.2 환경변수 입력

`.env.local` 파일에 다음 내용을 입력합니다:

```env
# Supabase (Step 1에서 복사한 값)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# OpenAI
OPENAI_API_KEY=sk-...

# ElevenLabs
ELEVENLABS_API_KEY=xi-...
ELEVENLABS_AGENT_ID=agent_xxx
ELEVENLABS_PHONE_NUMBER_ID=phnum_xxx
```

### 6.3 환경변수 설명

| 변수 | 필수 | 설명 | 획득 방법 |
|------|:----:|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key | Supabase Dashboard → Settings → API |
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 | https://platform.openai.com/api-keys |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API 키 | ElevenLabs Dashboard → Profile → API Keys |
| `ELEVENLABS_AGENT_ID` | ✅ | 생성된 Agent ID | ElevenLabs → Conversational AI → Agent 생성 후 |
| `ELEVENLABS_PHONE_NUMBER_ID` | ✅ | Twilio 연동 번호 ID | ElevenLabs → Phone Numbers |
| `ELEVENLABS_MOCK` | ❌ | Mock 모드 (기본: `true`) | `.env.local`에 `ELEVENLABS_MOCK=true` 설정. `false`로 변경 시 실제 ElevenLabs 통화 발신 |

---

## Step 7. 개발 서버 시작

### 7.1 서버 실행

```bash
npm run dev
```

### 7.2 접속 확인

브라우저에서 http://localhost:3000 접속

### 7.3 확인 사항

- [ ] Next.js 기본 페이지 표시됨
- [ ] 콘솔에 에러 없음
- [ ] Tailwind CSS 스타일 적용됨

---

## Phase 0 완료 체크리스트

| 항목 | 담당 | 상태 |
|------|------|:----:|
| Supabase 테이블 생성 | BE1 | ⬜ |
| Next.js 프로젝트 생성 | BE1 | ⬜ |
| 의존성 설치 | BE1 | ⬜ |
| shadcn/ui 설정 | BE1 | ⬜ |
| 디렉토리 구조 생성 | BE1 | ⬜ |
| 환경변수 설정 | 전원 | ⬜ |
| 개발 서버 확인 | 전원 | ⬜ |

**예상 소요 시간: 15분**

---

## 다음 단계

Phase 0 완료 후, 각 역할별로 기능 구현을 시작합니다:

| 역할 | 시작 파일 | Cursor 명령어 |
|------|----------|---------------|
| FE1 | `app/page.tsx` | `/fe1-call-agent` |
| FE2 | `components/call/` | `/fe2-call-agent` |
| BE1 | `app/api/conversations/route.ts` | `/be1-call-agent` |
| BE2 | `app/api/calls/route.ts` | `/be2-call-agent` |

---

## 트러블슈팅

### 문제: `npx create-next-app` 실패

```bash
# Node.js 버전 확인 (18.17.0 이상 필요)
node --version

# npm 캐시 정리
npm cache clean --force
```

### 문제: shadcn 초기화 실패

```bash
# 수동 초기화
npx shadcn@latest init

# 프롬프트에서 선택:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
```

### 문제: Supabase 연결 실패

1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 환경변수 앞뒤 공백 제거
3. 개발 서버 재시작 (`npm run dev`)

### 문제: 타입 에러 발생

```bash
# TypeScript 캐시 정리
rm -rf .next
npm run dev
```

### 문제: Dynamic System Prompt가 무시됨 (ElevenLabs)

**증상**: API에서 system_prompt를 보냈는데 Agent가 Dashboard의 기본 프롬프트로만 동작

**원인**: ElevenLabs Agent Dashboard에서 Override 설정이 꺼져있음

**해결**:
1. ElevenLabs Dashboard → Conversational AI → Agent 선택
2. Settings → Security → **"Enable overrides"** 체크
3. Override Options → **"System prompt"** 체크
4. Agent 저장
5. API 요청의 `conversation_initiation_client_data`에 `conversation_config_override.agent.prompt.prompt` 포함 확인

---

## 보일러플레이트 파일 생성 가이드

> 아래 파일들은 Phase 1 시작 시 BE1이 Cursor를 사용하여 생성합니다.
> 구조와 목적만 기술하며, 실제 코드는 해커톤 당일 작성합니다.

### lib/supabase/client.ts

**목적:** 브라우저에서 사용하는 Supabase 클라이언트

**구조:**
- `createBrowserClient` 사용
- 환경변수에서 URL, Key 로드
- `createClient()` 함수 export

### lib/supabase/server.ts

**목적:** 서버 컴포넌트/API Route에서 사용하는 Supabase 클라이언트

**구조:**
- `createServerClient` 사용
- `cookies()` 연동
- `createClient()` async 함수 export

### lib/supabase/middleware.ts

**목적:** Middleware에서 세션 갱신

**구조:**
- `updateSession()` 함수
- 쿠키 읽기/쓰기 처리
- `supabase.auth.getUser()` 호출

### middleware.ts (루트)

**목적:** 모든 요청에서 세션 갱신

**구조:**
- `updateSession` import
- 정적 파일 제외 matcher 설정

### types/database.ts

**목적:** Supabase 테이블 타입 정의

**포함 타입:**
- `ConversationStatus`: 'COLLECTING' | 'READY' | 'CALLING' | 'COMPLETED' | 'CANCELLED'
- `CallStatus`: 'PENDING' | 'CALLING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
- `CollectedData`: 수집 데이터 인터페이스
- `Conversation`: conversations 테이블 타입
- `Message`: messages 테이블 타입
- `Call`: calls 테이블 타입

---

*이 문서는 해커톤 당일 Phase 0 진행 가이드입니다.*
