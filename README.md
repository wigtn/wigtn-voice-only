<p align="center">
  <h1 align="center">WIGVO</h1>
  <p align="center"><strong>What I Gotta Voice-Only</strong></p>
  <p align="center">전화해야만 해결되는 일, AI가 대신 걸어드립니다</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <br />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/ElevenLabs-Conversational_AI-000000?logo=elevenlabs&logoColor=white" alt="ElevenLabs" />
  <img src="https://img.shields.io/badge/Twilio-Voice-F22F46?logo=twilio&logoColor=white" alt="Twilio" />
  <img src="https://img.shields.io/badge/Naver_Maps-API-03C75A?logo=naver&logoColor=white" alt="Naver Maps" />
</p>

---

## Problem: The 'Voice-Only' Barrier

캐치테이블, 네이버 예약이 닿지 않는 **전통적 오프라인 서비스**는 여전히 전화가 유일한 관문입니다.

| 장벽 | 설명 |
|------|------|
| **디지털 파편화** | 부동산 중개소, 수리점, 노포 — 온라인 예약 시스템이 없는 곳이 아직 많음 |
| **심리적 비용** | 거절에 대한 두려움, 복잡한 용건 전달 시 커뮤니케이션 에너지 소모 |
| **정보 비대칭** | 앱에 '광고 중'이지만 실제로는 나간 매물, 확인하려면 전화를 돌려야 하는 비효율 |

## Solution

> **시나리오 선택 → 채팅으로 정보 수집 → AI가 Dynamic Prompt 생성 → 실제 전화 → 결과 알림**

```
사용자                              AI 동작                              결과
──────────                          ──────                              ────
📅 "예약하기 > 미용실" 선택        → 🤖 "어느 미용실에 예약하시겠어요?"
👤 "강남 OO미용실"                 → 🗺️ 네이버 지도에서 검색 + 전화번호 자동 입력
👤 "내일 오후 3시, 커트"           → 🤖 "정리해볼게요!"
                                   → 📋 수집 정보 요약 → [전화 걸기]
                                   → AI가 미용실에 전화               → ✅ "예약 완료!"
```

## Features

- **시나리오 기반 대화** — 예약 / 문의 / AS 접수, 3개 대분류 + 12개 세부 유형에서 선택하면 맞춤형 정보 수집 시작
- **채팅 정보 수집** — GPT-4o-mini가 시나리오별 필수 항목(장소명, 전화번호, 일시, 인원 등)을 대화로 자연스럽게 수집
- **네이버 지도 연동** — 장소명을 말하면 네이버 지도에서 자동 검색, 전화번호·주소 자동 입력, 지도에서 직접 확인
- **AI 음성 전화** — ElevenLabs Conversational AI + Twilio로 수집된 정보를 기반으로 실제 전화 발신
- **대시보드** — 대화 목록, 사이드바 네비게이션, 모바일 드로어까지 반응형 UI
- **다국어 지원** — 한국어/영어 전환 (next-intl)
- **소셜 로그인** — Google / Apple / Kakao OAuth (Supabase Auth)

## Use Cases

| 시나리오 | 예시 |
|----------|------|
| **식당 예약** | "강남 OO식당 내일 저녁 7시 4명 예약해줘" |
| **미용실 예약** | "홍대 OO미용실 토요일 오후 2시 커트" |
| **병원/치과** | "OO치과 다음주 월요일 스케일링" |
| **부동산 매물 확인** | "OO공인중개사 네이버에 올라온 월세 매물 아직 있는지 확인" |
| **영업시간/가격 문의** | "OO식당 일요일 영업하나요?" |
| **가전 AS 접수** | "삼성 에어컨 AS 접수, 냉방 안 됨" |
| **수리/설치** | "보일러 수리 가능한 날짜 확인" |

## Tech Stack

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS 4 + shadcn/ui | 채팅 UI + 대시보드 + 모바일 반응형 |
| State | Zustand | 대시보드 상태 관리 |
| i18n | next-intl | 한국어/영어 다국어 |
| Backend | Next.js API Routes | REST API |
| Auth | Supabase Auth (Google / Apple / Kakao) | OAuth 소셜 로그인 |
| Database | Supabase PostgreSQL | 대화 + 메시지 + 통화 기록 + Entity 저장 |
| AI Chat | OpenAI GPT-4o-mini | 시나리오 기반 정보 수집 + Entity 추출 |
| AI Calling | ElevenLabs Conversational AI | Dynamic Prompt 생성 + 음성 통화 |
| Phone | Twilio | 실제 전화 발신/수신 |
| Maps | Naver Maps API | 장소 검색 + 전화번호 자동 조회 + 지도 표시 |

## Architecture

```
┌────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────┐
│   Frontend         │────▶│   API Routes             │────▶│   OpenAI GPT-4o-mini │
│   Chat UI          │     │   /api/conversations     │     │   시나리오 기반       │
│   Dashboard        │     │   /api/chat              │     │   정보 수집 + 추출    │
│   Naver Map        │     │   /api/calls             │     └──────────────────────┘
│   Next.js 16       │     │   /api/calls/[id]/start  │
└────────┬───────────┘     └───────────┬──────────────┘
         │                             │
         ▼                             ▼
┌────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────┐
│  Supabase          │     │   Supabase PostgreSQL    │     │  ElevenLabs + Twilio │
│  Auth + OAuth      │◀───▶│   conversations          │     │  Dynamic Prompt      │
│  (Google/Apple/    │     │   messages               │     │  AI 음성 통화         │
│   Kakao)           │     │   calls                  │     └──────────────────────┘
└────────────────────┘     │   entities               │
                           └──────────────────────────┘
         ┌────────────────────┐
         │   Naver Maps API   │
         │   장소 검색 + 지도  │
         └────────────────────┘
```

## Quick Start

```bash
# 1. 저장소 클론
git clone https://github.com/your-org/wigtn-voice-only.git
cd wigtn-voice-only

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 실제 값 입력 (아래 Environment Variables 섹션 참조)

# 4. Supabase 테이블 생성
# Supabase Dashboard → SQL Editor → scripts/supabase-tables.sql 실행

# 5. 개발 서버 시작
npm run dev
```

## Environment Variables

`.env.example`을 `.env.local`로 복사한 후 값을 입력합니다.

| 변수 | 필수 | 설명 |
|------|:----:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 (GPT-4o-mini) |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API 키 |
| `ELEVENLABS_AGENT_ID` | ✅ | ElevenLabs Agent ID |
| `ELEVENLABS_PHONE_NUMBER_ID` | — | Twilio 전화번호 ID (Real 모드 시 필요) |
| `ELEVENLABS_MOCK` | — | `true`: Mock 모드 (기본값, API 호출 없이 테스트), `false`: 실제 전화 발신 |
| `NEXT_PUBLIC_BASE_URL` | — | 앱 URL (기본: `http://localhost:3000`) |
| `NAVER_CLIENT_ID` | — | 네이버 클라우드 플랫폼 Client ID (장소 검색 시 필요) |
| `NAVER_CLIENT_SECRET` | — | 네이버 클라우드 플랫폼 Client Secret |

> **Mock 모드** (`ELEVENLABS_MOCK=true`): ElevenLabs/Twilio 없이 5초 후 자동 완료로 시뮬레이션. 처음 셋업 시 권장.
>
> **Real 모드** (`ELEVENLABS_MOCK=false`): 실제 AI 음성 통화 발신. ElevenLabs + Twilio 설정 필요.

## Project Structure

```
app/
  api/
    calls/           # 전화 생성/조회/발신 API
    chat/            # AI 채팅 (GPT-4o-mini 정보 수집)
    conversations/   # 대화 세션 CRUD
  auth/              # Supabase Auth 콜백
  login/             # 로그인 페이지
  signup/            # 회원가입 페이지
  history/           # 통화 기록
components/
  auth/              # LoginForm, OAuthButtons
  call/              # CallingStatus, ResultCard, HistoryList
  chat/              # ChatContainer, ChatInput, ChatMessage,
                     # ScenarioSelector, CollectionSummary, InfoPanel
  common/            # LanguageSwitcher
  dashboard/         # DashboardLayout, Sidebar, ConversationList,
                     # MobileDrawer, SidebarMenu
  layout/            # Header, Sidebar
  map/               # NaverMapContainer
  place/             # PlaceInfoPanel
  providers/         # I18nProvider
  ui/                # shadcn/ui (Button, Card, Input, ...)
hooks/
  useChat.ts         # 채팅 로직
  useCallPolling.ts  # 전화 상태 폴링
  useDashboard.ts    # 대시보드 상태 (Zustand)
  useGeolocation.ts  # 위치 정보
lib/
  scenarios/         # 시나리오 설정 + 응답 처리
  supabase/          # Supabase 클라이언트 + 서버 + 엔티티
  naver-maps.ts      # 네이버 지도 API
  prompt-generator.ts # Dynamic Prompt 생성
  response-parser.ts # AI 응답 파싱
  i18n.ts            # next-intl 설정
messages/
  ko.json            # 한국어
  en.json            # 영어
scripts/
  supabase-tables.sql # Supabase 테이블 생성 SQL
docs/                # 프로젝트 문서
```

## Docs

| Document | Description |
|----------|-------------|
| [PRD](docs/01_PRD.md) | Product Requirements Document |
| [Chat Collection Architecture](docs/02_ARCHITECTURE_chat-collection.md) | 채팅 수집 + DB 연동 기술 스펙 |
| [Implementation Spec](docs/03_ARCHITECTURE_implementation-spec.md) | 전체 파이프라인 구현 명세 |
| [Setup Guide](docs/04_SETUP-GUIDE.md) | 프로젝트 초기화 가이드 |
| [Pitch](docs/05_PITCH.md) | 프로젝트 소개 스크립트 |
| [Demo Script](docs/06_DEMO-SCRIPT.md) | 데모 시연 대본 |
| [Backend Enhancement](docs/07_BACKEND_ENHANCEMENT.md) | 백엔드 기능 개선 문서 |
| [Implementation Summary](docs/08_IMPLEMENTATION_SUMMARY.md) | 구현 내용 요약 |
| [Naver Maps Setup](docs/09_NAVER_MAPS_SETUP.md) | 네이버 지도 설정 가이드 |
| [Dashboard UI Plan](docs/10_DASHBOARD_UI_PLAN.md) | 대시보드 UI 계획 |

## License

MIT
