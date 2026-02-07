# 네이버지도 API 연동 가이드

> **목적**: 네이버지도 검색을 통한 장소 정보 자동 수집
> **작성일**: 2026-02-07

---

## 필요한 것들

### 1. 네이버 클라우드 플랫폼 계정 및 API 키

**발급 절차:**

1. **네이버 클라우드 플랫폼 가입**
   - https://www.ncloud.com 접속
   - 회원가입 (네이버 계정으로 간편 가입 가능)

2. **Application 등록**
   - 콘솔 → Application → Application 등록
   - Application 이름: "WIGVO" (또는 원하는 이름)
   - 서비스: "AI·NAVER API" 선택

3. **Client ID / Client Secret 발급**
   - Application 상세 페이지에서 확인
   - **Client ID**: `your_client_id`
   - **Client Secret**: `your_client_secret`

4. **Local Search API 활성화**
   - 콘솔 → AI·NAVER API → 검색 → Local Search
   - 사용 신청 (무료 할당량: 월 25,000건)

**참고:**
- 무료 할당량: 월 25,000건
- 초과 시: 1,000건당 100원
- 상세: https://www.ncloud.com/product/applicationService/aiService/localSearch

---

### 2. 환경변수 설정

`.env.local` 파일에 추가:

```bash
# --- Naver Maps API (장소 검색) ---
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
```

`.env.example`에도 추가 (팀원 참고용)

---

### 3. 코드 통합

이미 구현된 파일:
- ✅ `lib/naver-maps.ts` - 검색 함수들
- ⏳ `app/api/chat/route.ts` - 검색 로직 통합 필요
- ⏳ `lib/prompts.ts` - System Prompt에 검색 기능 설명 추가 필요

---

## 동작 방식

### 시나리오 1: 상호명만 입력

```
사용자: "강남역 근처 미용실 예약해줘"
→ 검색 필요 감지 (shouldSearchPlaces)
→ 네이버지도 검색: "강남역 미용실"
→ 검색 결과를 LLM 컨텍스트에 추가
→ LLM이 검색 결과를 사용자에게 보여주고 선택하게 함
```

### 시나리오 2: 전화번호 포함

```
사용자: "강남역 OO미용실 02-1234-5678로 예약해줘"
→ 전화번호가 있으므로 검색 불필요
→ 기존 로직대로 진행
```

### 시나리오 3: 사용자 선택

```
AI: "강남역 근처 미용실을 검색해볼게요! 몇 개 찾았어요:
1. OO미용실 (02-1234-5678) - 강남대로 123
2. XX미용실 (02-2345-6789) - 테헤란로 456
어느 곳으로 예약할까요?"

사용자: "1번" 또는 "첫 번째" 또는 "OO미용실"
→ LLM이 선택을 인식하고 해당 정보를 collected_data에 저장
```

---

## 테스트 방법

### 1. 환경변수 설정 확인

```bash
# .env.local에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 설정 확인
cat .env.local | grep NAVER
```

### 2. API 테스트

```bash
# 직접 API 호출 테스트
curl "https://openapi.naver.com/v1/search/local.json?query=강남역%20미용실&display=5" \
  -H "X-Naver-Client-Id: $NAVER_CLIENT_ID" \
  -H "X-Naver-Client-Secret: $NAVER_CLIENT_SECRET"
```

### 3. 통합 테스트

1. 채팅 화면에서 "강남역 근처 미용실 예약해줘" 입력
2. 검색 결과가 AI 응답에 포함되는지 확인
3. 사용자가 번호 선택 시 정보가 저장되는지 확인

---

## 주의사항

1. **API 할당량 관리**
   - 월 25,000건 무료 할당량
   - 캐싱 전략 고려 (향후 구현)

2. **에러 처리**
   - API 키가 없으면 검색 기능 자동 비활성화 (에러 없이 진행)
   - API 호출 실패 시 검색 없이 기존 로직 진행

3. **개인정보**
   - 검색어는 로그에 남을 수 있음
   - 민감한 정보는 검색어에서 제외

---

## 향후 개선

1. **캐싱 전략**
   - 검색 결과를 DB에 캐시 (7일 유효)
   - 동일 검색어는 캐시에서 조회

2. **위치 기반 검색**
   - 사용자 위치(IP 또는 브라우저 geolocation) 활용
   - 거리순 정렬

3. **검색 결과 개선**
   - 카테고리 필터링 (미용실만, 식당만 등)
   - 평점/리뷰 정보 포함
