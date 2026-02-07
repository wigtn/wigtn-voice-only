# Scripts

해커톤 당일 사용할 SQL 스크립트입니다.

## 스크립트 목록

| 스크립트 | 용도 | 실행 시점 |
|---------|------|----------|
| `supabase-tables.sql` | Supabase 테이블 생성 | Phase 0 (Dashboard에서) |

---

## 프로젝트 초기화

프로젝트 초기화는 수동으로 진행합니다.

**설정 가이드:** [docs/SETUP-GUIDE.md](../docs/SETUP-GUIDE.md)

---

## supabase-tables.sql 실행 방법

### 1. Supabase Dashboard 접속

https://supabase.com/dashboard

### 2. SQL Editor 열기

프로젝트 선택 → 좌측 메뉴 → **SQL Editor**

### 3. SQL 실행

`scripts/supabase-tables.sql` 내용을 복사하여 실행

```sql
-- 생성되는 테이블:
-- 1. conversations (대화 세션)
-- 2. messages (대화 메시지)
-- 3. calls (전화 기록)
-- + 인덱스 + RLS 정책
```

### 4. 확인

**Table Editor**에서 3개 테이블 생성 확인

---

## 환경변수 체크리스트

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs API 키 |
| `ELEVENLABS_AGENT_ID` | ✅ | ElevenLabs Agent ID |
| `ELEVENLABS_PHONE_NUMBER_ID` | ✅ | Twilio 번호 ID |

---

## 문서 링크

| 문서 | 설명 |
|------|------|
| [SETUP-GUIDE.md](../docs/SETUP-GUIDE.md) | 프로젝트 초기화 수동 가이드 |
| [TECH_implementation-spec.md](../docs/TECH_implementation-spec.md) | 전체 파이프라인 구현 명세 |
| [TECH_chat-collection-architecture.md](../docs/TECH_chat-collection-architecture.md) | 채팅 수집 아키텍처 |

