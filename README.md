<p align="center">
  <h1 align="center">WIGVO</h1>
  <p align="center"><strong>WIGTN — Voice Only</strong></p>
  <p align="center">전화가 유일한 관문인 서비스를, AI가 대신 뚫어주는 음성 비서</p>
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
  <br />
  <img src="https://img.shields.io/badge/Hackathon-Cursor_Seoul_2026-F59E0B" alt="Hackathon" />
  <img src="https://img.shields.io/badge/Team-4_members-10B981" alt="Team" />
  <img src="https://img.shields.io/badge/Duration-4_hours-8B5CF6" alt="Duration" />
</p>

---

## Problem: The 'Voice-Only' Barrier

캐치테이블, 네이버 예약이 닿지 않는 **전통적 오프라인 서비스**는 여전히 전화가 유일한 관문입니다.

| 장벽 | 설명 |
|------|------|
| **디지털 파편화** | 부동산 중개소, 수리점, 노포 — 온라인 예약 시스템이 없는 곳이 아직 많음 |
| **심리적 비용** | 거절에 대한 두려움, 복잡한 용건 전달 시 커뮤니케이션 에너지 소모 |
| **정보 비대칭** | 앱에 '광고 중'이지만 실제로는 나간 매물, 확인하려면 전화를 돌려야 하는 비효율 |

## Solution (v2: Dynamic Agent Platform)

> **채팅으로 요구사항 수집 → AI가 Dynamic Prompt 생성 → 실제 전화 → 결과 알림**

```
채팅 대화                           AI 동작                              결과
──────────────                      ──────                              ────
👤 "미용실 예약해줘"               → 🤖 "어디 미용실이에요?"
👤 "강남 OO미용실"                 → 🤖 "전화번호 알려주세요"
👤 "010-1234-5678, 내일 3시"       → 🤖 "정리해볼게요! 전화할게요"
                                   → AI가 미용실에 전화               → "예약 완료!"
```

## Demo Flow (v2)

| Step | 화면 | 설명 |
|------|------|------|
| 1 | **채팅 시작** | AI: "안녕하세요! 어떤 전화를 대신 걸어드릴까요?" |
| 2 | **정보 수집** | 대화를 통해 장소, 전화번호, 시간, 서비스 등 수집 |
| 3 | **확인 요약** | 수집된 정보 요약 표시 → [전화 걸기] 버튼 |
| 4 | **AI 전화** | ElevenLabs가 Dynamic Prompt로 실제 전화 발신 |
| 5 | **결과 알림** | "OO미용실 내일 오후 3시 커트 예약 완료!" |

## Impact

| 영역 | 내용 |
|------|------|
| **사회적 약자 지원** | 콜 포비아, 청각 장애인, 한국어가 서툰 외국인에게 '목소리 비서' 제공 |
| **비즈니스 효율** | 단순 반복 전화 문의를 AI가 처리 → 상호 대기 시간 단축 |
| **확장성** | 부동산 → 긴급 수리 AS → 노포 예약 → 병원 문의 — 전화 관문이 있는 모든 곳 |

## Tech Stack

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS + shadcn/ui | 채팅 UI + 모바일 우선 |
| Backend | Next.js API Routes | REST API |
| Auth | Supabase Auth (Google / Apple / Kakao) | OAuth 소셜 로그인 |
| Database | Supabase PostgreSQL | 대화 + 통화 기록 저장 |
| AI Chat | OpenAI GPT-4o-mini | 채팅 기반 정보 수집 |
| AI Calling | ElevenLabs Conversational AI | Dynamic Prompt + 음성 통화 |
| Phone | Twilio | 실제 전화 발신/수신 |

## Architecture (v2)

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Frontend   │────▶│   API Routes          │────▶│   OpenAI GPT-4o-mini │
│   Chat UI    │     │   /api/conversations  │     │   채팅 정보 수집      │
│   Next.js    │     │   /api/chat           │     └──────────────────────┘
└──────┬───────┘     │   /api/calls          │
       │             └──────────┬────────────┘
       ▼                        │
┌──────────────┐                ▼
│  Supabase    │     ┌──────────────────────┐     ┌──────────────────────┐
│  Auth + DB   │◀───▶│   Supabase PostgreSQL│     │   ElevenLabs + Twilio│
│  (OAuth)     │     │   conversations      │     │   Dynamic Prompt     │
└──────────────┘     │   messages, calls    │     │   AI 음성 통화        │
                     └──────────────────────┘     └──────────────────────┘
```

## Team

| Role | Scope | Branch |
|------|-------|--------|
| **FE1** | 입력/확인 UI | `feat/fe1-input-ui` |
| **FE2** | 통화/결과/기록 UI | `feat/fe2-result-ui` |
| **BE1** | API + DB + Setup Lead | `feat/be1-api` |
| **BE2** | ElevenLabs 연동 | `feat/be2-elevenlabs` |

## Quick Start

### 1. 초기 셋업 (BE1 단독)

BE1이 프로젝트 초기화 후 push합니다. 상세: [docs/SETUP-GUIDE.md](docs/SETUP-GUIDE.md)

### 2. 전원 동시 진행

```bash
git pull                # BE1이 push한 초기 셋업 받기
cp .env.example .env.local  # 환경변수 파일 생성 후 값 입력 (SETUP-GUIDE Step 6 참조)
npm install             # 의존성 설치
npm run dev             # 개발 서버 시작
```

## Judging Criteria

| 기준 | WIGVO의 대응 |
|------|-------------|
| **실용성** | 부동산 허위매물 확인, 수리 AS 접수 등 전화가 유일한 관문인 실제 문제 해결 |
| **창의성** | 챗봇이 아닌 **실제 음성 통화 대행** — ElevenLabs Conversational AI |
| **완성도** | 입력 → 파싱 → 확인 → 통화 → 결과 풀 플로우 + Mock/실제 통화 모드 |
| **임팩트** | 콜 포비아, 청각 장애, 언어 장벽 등 사회적 약자에게 '목소리 비서' 제공 |

## Project Structure

```
.cursor/
  rules/              # Always Apply rules
    api-contract.mdc   # API 요청/응답 스키마 (SSOT)
    team-workflow.mdc  # 파일 오너십 + 충돌 방지
  commands/            # Cursor slash commands
    fe1-call-agent.md  # /fe1-call-agent
    fe2-call-agent.md  # /fe2-call-agent
    be1-call-agent.md  # /be1-call-agent
    be2-call-agent.md  # /be2-call-agent
docs/
  PRD_dynamic-agent-platform.md    # v2 PRD
  TECH_chat-collection-architecture.md  # 채팅 수집 기술 스펙
  DEMO-SCRIPT.md       # 2분 데모 시연 대본
  PITCH.md             # 2분 발표 스크립트
scripts/
  supabase-tables.sql  # Supabase 테이블 생성 SQL
```

## Docs

| Document | Description |
|----------|-------------|
| [PRD (v2)](docs/PRD_dynamic-agent-platform.md) | Dynamic Agent Platform PRD |
| [Setup Guide](docs/SETUP-GUIDE.md) | 프로젝트 초기화 수동 가이드 |
| [Implementation Spec](docs/TECH_implementation-spec.md) | 전체 파이프라인 구현 명세 |
| [Chat Architecture](docs/TECH_chat-collection-architecture.md) | 채팅 수집 + DB 연동 기술 스펙 |
| [Demo Script](docs/DEMO-SCRIPT.md) | 2분 데모 시연 대본 |
| [Pitch](docs/PITCH.md) | 2분 발표 스크립트 |
| [Cursor Guide](.cursor/README.md) | Cursor AI 설정 구조 + 사용 시나리오 |

## License

This project was built for the **Cursor Seoul Hackathon 2026**.
