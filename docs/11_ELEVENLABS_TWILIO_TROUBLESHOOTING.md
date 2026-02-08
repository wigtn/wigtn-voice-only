# ElevenLabs + Twilio 전화 끊김 문제 해결

> "해외에서 걸려온 전화입니다" 멘트 후 끊기거나, **전화를 받은 뒤 곧바로 끊기는** 경우 대응 방법입니다.

---

## 0. 전화 받은 후 곧바로 끊김 (status: failed)

**증상**: 상대가 전화를 받고 "네, OOO입니다"라고 하는데, 곧 끊기고 앱에는 **Result: ERROR**로 표시됨. 터미널에 `[ElevenLabs Poll] Terminal status reached: failed` 로그가 보임.

**call_duration_secs: 2** 처럼 2~3초 만에 끊기면 → **Turn Timeout이 2초로 설정돼 있을 가능성이 큽니다.**

### 🔴 필수 조치: Turn Timeout 늘리기

1. **ElevenLabs Dashboard** → **Conversational AI** → 사용 중인 **Agent** 선택
2. **Advanced** 탭 → **Turn Timeout** (또는 **Conversation flow** → Timeout) 찾기
3. 값을 **최소 10초** (권장 **15초**)로 변경 후 저장  
   - 기본값이 2초인 경우가 있어, 전화 받은 직후 침묵으로 바로 종료될 수 있음

### 기타 가능 원인과 조치

| 원인 | 확인 방법 | 조치 |
|------|-----------|------|
| **오디오 코덱 불일치** | 통화가 1–2초 만에 끊김 | 아래 "1. 오디오 포맷" 반드시 적용 (μ-law 8kHz) |
| **말 겹침 / 바지인** | 상대가 인사하는 동안 에이전트가 말함 | First message를 짧게 유지("잠시만 기다려 주세요"). 프롬프트에 "상대가 말 끝낼 때까지 기다리기" 있음 |
| **Twilio/네트워크 끊김** | 로그에 call_duration_secs가 매우 짧음 (1–3초) | Twilio 콘솔에서 해당 Call SID 로그 확인, ElevenLabs 대시보드에서 해당 conversation 상세 확인 |

**디버깅**: 서버 로그에 `[Result] transcript_summary`, `call_duration_secs`가 출력됩니다. ElevenLabs Dashboard → Conversational AI → 해당 conversation에서 **실제 끊김 사유**(오디오 에러, silence 등)를 확인할 수 있습니다.

---

## 1. 오디오 포맷 (가장 흔한 원인)

Twilio는 **μ-law 8000 Hz** 코덱을 사용합니다. ElevenLabs Agent가 다른 포맷이면 **연결 직후 끊김**이 발생할 수 있습니다.

### 확인 및 수정

1. **ElevenLabs Dashboard** → Conversational AI → 사용 중인 **Agent** 선택
2. **Voice** 섹션 → **TTS Output** (또는 Output format) → **μ-law 8000 Hz** 선택
3. **Advanced** 섹션 → **Input format** → **μ-law 8000 Hz** 선택
4. 저장 후 다시 전화 테스트

---

## 2. First message override

API에서 `first_message`를 넘기려면 대시보드에서 Override가 켜져 있어야 합니다.

1. **Agent** → **Settings** → **Security**
2. **Override Options** → **"First message"** 체크
3. 저장

이렇게 해야 코드에서 설정한 "안녕하세요. 고객님을 대신해서 전화드린 AI 비서입니다..."가 적용됩니다. 연결되자마자 이 문장을 말해 끊김을 줄입니다.

---

## 3. 해외 전화 안내 멘트

"해외에서 걸려온 전화 입니다"는 **통신사에서 자동 재생**하는 안내입니다.  
Twilio 번호가 해외(미국 등)이기 때문에 발생합니다. 이 안내가 끝난 뒤 약간의 침묵이 있으면, **First message**를 설정해 두었을 때 에이전트가 바로 인사하므로 끊김 가능성이 줄어듭니다.

---

## 4. 체크리스트 요약

| 항목 | 위치 | 설정 |
|------|------|------|
| System prompt override | Agent → Security → Override | ✅ 체크 |
| First message override | Agent → Security → Override | ✅ 체크 |
| TTS Output | Agent → Voice | **μ-law 8000 Hz** |
| Input format | Agent → Advanced | **μ-law 8000 Hz** |

위 설정 후에도 끊기면:

1. **ElevenLabs Dashboard** → Conversational AI → 해당 **conversation** 클릭 → 상세 로그/에러 메시지 확인  
2. **Twilio Console** → Monitor → Logs → 해당 Call SID로 음성 스트림/끊김 시점 확인  
3. 필요 시 ElevenLabs 지원에 conversation_id와 증상(수신 후 N초 만에 끊김 등) 전달
