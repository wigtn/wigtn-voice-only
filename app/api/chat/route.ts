// =============================================================================
// POST /api/chat - 메시지 전송
// =============================================================================
// BE1 소유 - 사용자 메시지 처리 + LLM 응답
// API Contract: Endpoint 0-2
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import {
  getConversationHistory,
  saveMessage,
  updateCollectedData,
  getConversationById,
} from '@/lib/supabase/chat';
import { extractAndSaveEntities } from '@/lib/supabase/entities';
import { buildSystemPromptWithContext, buildScenarioPrompt } from '@/lib/prompts';
import { parseAssistantResponse } from '@/lib/response-parser';
import {
  searchNaverPlaces,
  shouldSearchPlaces,
  extractSearchQuery,
  extractLocationContext,
  type NaverPlaceResult,
  type LocationContext,
} from '@/lib/naver-maps';
import {
  ChatRequest,
  CollectedData,
  mergeCollectedData,
} from '@/shared/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- OpenAI Function Calling: 장소 검색 도구 정의 ---
const SEARCH_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_place',
    description:
      '네이버 지역검색으로 가게/장소를 검색합니다. 가게 이름, 전화번호, 주소를 찾을 수 있습니다. 사용자가 장소를 언급하면 반드시 이 도구로 검색하세요.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            '검색어. 지역명 + 가게명 형태가 가장 정확합니다. 예: "강남 수담한정식", "홍대 헤어살롱", "판교 삼성서비스센터"',
        },
      },
      required: ['query'],
    },
  },
};

function isNaverConfigured(): boolean {
  return !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

function formatSearchResultsForTool(results: NaverPlaceResult[]): string {
  if (results.length === 0) {
    return '검색 결과가 없습니다. 사용자에게 가게 이름과 전화번호를 직접 알려달라고 요청하세요.';
  }

  const lines = results.map((r, i) => {
    const tel = r.telephone ? `📞 ${r.telephone}` : '📞 번호 미등록';
    return `${i + 1}. ${r.name} | ${tel} | 📍 ${r.roadAddress || r.address} | ${r.category}`;
  });

  const withPhone = results.filter((r) => r.telephone);
  const withoutPhone = results.filter((r) => !r.telephone);

  let phoneInstruction: string;
  if (withPhone.length > 0 && withoutPhone.length > 0) {
    phoneInstruction = `전화번호가 있는 곳 ${withPhone.length}곳, 미등록 ${withoutPhone.length}곳입니다.\n` +
      `전화번호가 있는 곳은 바로 사용 가능합니다. 없는 곳은 사용자에게 번호를 아는지 물어보세요.`;
  } else if (withPhone.length > 0) {
    phoneInstruction = `모든 결과에 전화번호가 있습니다.`;
  } else {
    phoneInstruction = `검색된 가게들의 전화번호가 네이버에 등록되어 있지 않습니다.\n` +
      `사용자가 선택하면 전화번호를 알고 있는지 확인하세요.`;
  }

  const coreInstruction =
    results.length === 1
      ? `1. 검색 결과가 1건이므로 "어디에 전화할까요?"라고 묻지 마세요. **target_name에 위 가게 이름("${results[0].name}")을 바로 저장**하세요.
2. 전화번호가 없으면 사용자에게 전화번호를 알려달라고 하세요. 있으면 target_phone도 저장하세요.
3. 응답에 반드시 JSON 블록을 포함하세요. target_name을 빠뜨리면 안 됩니다.`
      : `1. 반드시 위 목록을 사용자에게 보여주고, 어디에 전화할지 물어보세요.
2. 사용자가 장소를 선택하면 (예: "1번", "하브 삼성으로 할게"), **반드시 JSON의 target_name에 해당 가게 정확한 이름을 즉시 저장하세요.** 전화번호가 있으면 target_phone도 저장하세요.
3. 응답에 반드시 JSON 블록을 포함하세요. target_name을 빠뜨리면 안 됩니다.`;

  return `검색 결과 ${results.length}건:\n${lines.join('\n')}\n\n[중요 지시]\n${coreInstruction}\n\n${phoneInstruction}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 요청 파싱
    const body = (await request.json()) as ChatRequest;
    const { conversationId, message, location, previousSearchResults } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'conversationId and message are required' },
        { status: 400 }
      );
    }

    // 3. 대화 세션 확인
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // 4. 사용자 메시지 저장
    console.log(`[Chat] 👤 User: ${message}`);
    await saveMessage(conversationId, 'user', message);

    // 5. 대화 기록 조회
    const history = await getConversationHistory(conversationId);

    // 6. 기존 수집 정보 가져오기
    const existingData = conversation.collected_data as CollectedData;
    
    // 7. 장소 검색 필요 여부 확인 및 검색 수행 (위치 정보 활용)
    // 이전 검색 결과가 있으면 초기화 (프론트엔드에서 전달)
    let placeSearchResults: NaverPlaceResult[] = previousSearchResults || [];
    if (placeSearchResults.length > 0) {
      console.log(`[Chat] 📋 이전 검색 결과 ${placeSearchResults.length}건 수신: ${placeSearchResults.map(r => r.name).join(', ')}`);
    }
    if (shouldSearchPlaces(message, !!existingData.target_phone)) {
      try {
        const searchQuery = extractSearchQuery(message);
        // 위치 정보가 있으면 거리순 정렬, 없으면 기본 정렬
        placeSearchResults = await searchNaverPlaces(searchQuery, location);
        
        // 검색 결과가 있으면 로그 출력 (디버깅용)
        if (placeSearchResults.length > 0) {
          console.log(`[Naver Maps] Found ${placeSearchResults.length} places for query: "${searchQuery}"${location ? ' (sorted by distance)' : ''}`);
        }
      } catch (error) {
        // 검색 실패해도 대화는 계속 진행
        console.error('[Naver Maps] Search failed:', error);
      }
    }
    
    // 8. 동적 System Prompt 생성 (v4: 시나리오 기반 프롬프트 우선)
    let systemPrompt: string;
    
    // v4: 시나리오 타입과 서브타입이 모두 있으면 시나리오 기반 프롬프트 사용
    if (existingData.scenario_type && existingData.scenario_sub_type) {
      systemPrompt = buildScenarioPrompt(
        existingData.scenario_type,
        existingData.scenario_sub_type,
        existingData,
        placeSearchResults.length > 0
          ? placeSearchResults.map((p) => ({
              name: p.name,
              telephone: p.telephone,
              address: p.address || p.roadAddress,
            }))
          : undefined
      );
    } else {
      // 기존 방식 (하위 호환성)
      systemPrompt = buildSystemPromptWithContext(
        existingData,
        existingData.scenario_type || undefined,
        placeSearchResults.length > 0
          ? placeSearchResults.map((p) => ({
              name: p.name,
              telephone: p.telephone,
              address: p.address || p.roadAddress,
            }))
          : undefined
      );
    }

    // 9. LLM 메시지 구성 (최근 10개만 포함하여 토큰 절약)
    const llmMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // 10. OpenAI 호출 (Function Calling 지원)
    let assistantContent: string;
    try {
      const tools = isNaverConfigured() ? [SEARCH_TOOL] : undefined;

      let completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: llmMessages,
        temperature: 0.7,
        tools,
      });

      let choice = completion.choices[0];

      // Function Calling 루프: AI가 검색을 요청하면 실행 후 결과 전달
      let loopCount = 0;
      const MAX_TOOL_LOOPS = 3;

      while (
        choice?.finish_reason === 'tool_calls' &&
        choice.message.tool_calls &&
        choice.message.tool_calls.length > 0 &&
        loopCount < MAX_TOOL_LOOPS
      ) {
        loopCount++;
        // 모든 tool_call에 대해 응답 메시지를 넣어야 OpenAI 400 방지
        llmMessages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          const tc = toolCall as {
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          };
          if (tc.type === 'function' && tc.function.name === 'search_place') {
            let formatted: string;
            try {
              const args = JSON.parse(tc.function.arguments);
              console.log(`[Chat] 🔍 AI가 검색 요청: "${args.query}"`);
              const results = await searchNaverPlaces(args.query, location);
              placeSearchResults = results;
              console.log(`[Chat] 🔍 검색 결과: ${results.length}건`);
              results.forEach((r, i) => {
                console.log(`[Chat]   ${i + 1}. ${r.name} | tel: "${r.telephone}" | addr: ${r.roadAddress || r.address} | cat: ${r.category}`);
              });
              formatted = formatSearchResultsForTool(results);
              console.log(`[Chat] 🔍 AI에게 전달:\n${formatted}`);
            } catch (searchErr) {
              console.error('[Chat] 검색 실행 오류:', searchErr);
              formatted = '검색 중 오류가 발생했습니다. 사용자에게 가게 이름과 전화번호를 알려달라고 요청하세요.';
            }
            llmMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: formatted,
            });
          } else {
            llmMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: 'Unknown tool.',
            });
          }
        }

        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: llmMessages,
          temperature: 0.7,
          tools,
        });

        choice = completion.choices[0];
      }

      assistantContent =
        choice?.message?.content ||
        '죄송합니다, 응답을 생성하지 못했어요.';
    } catch (llmError) {
      console.error('OpenAI API error:', llmError);
      assistantContent =
        '죄송합니다, 잠시 오류가 발생했어요. 다시 말씀해주세요.';

      return NextResponse.json({
        message: assistantContent,
        collected: conversation.collected_data,
        is_complete: false,
        conversation_status: conversation.status,
      });
    }

    // 11. 응답 파싱
    console.log(`[Chat] 🤖 Assistant (raw): ${assistantContent.substring(0, 500)}`);
    const parsed = parseAssistantResponse(assistantContent);

    // 11-1. AI가 target_name을 빠뜨렸을 때 검색 결과에서 자동 매칭
    if (
      placeSearchResults.length > 0 &&
      (!parsed.collected?.target_name) &&
      message
    ) {
      let matched: NaverPlaceResult | null = null;

      // 1) "1번", "2번", "첫번째" 등 번호 선택 해석
      const trimmed = message.trim();
      const numMatch = trimmed.match(/^(?:(\d+)\s*번|첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|(\d+))$/);
      const numMap: Record<string, number> = { '첫': 1, '두': 2, '세': 3, '네': 4, '다섯': 5 };
      let index = -1;
      if (numMatch) {
        if (numMatch[1]) index = parseInt(numMatch[1], 10) - 1; // "1번" → 0
        else if (numMatch[2]) index = parseInt(numMatch[2], 10) - 1; // "1" → 0
      } else {
        const firstWord = trimmed.split(/\s/)[0] || '';
        if (/^[一二三四五]$/.test(firstWord) || /^[1-5]$/.test(firstWord)) {
          index = (firstWord === '一' || firstWord === '1') ? 0 : (firstWord === '二' || firstWord === '2') ? 1 : (firstWord === '三' || firstWord === '3') ? 2 : (firstWord === '四' || firstWord === '4') ? 3 : 4;
        } else if (numMap[firstWord] != null) {
          index = numMap[firstWord] - 1;
        }
      }
      if (index >= 0 && index < placeSearchResults.length) {
        matched = placeSearchResults[index];
        console.log(`[Chat] 🔧 번호 선택 해석: "${trimmed}" → ${index + 1}번째 → ${matched.name}`);
      }

      // 2) 메시지에 가게명이 포함된 경우
      if (!matched) {
        matched = placeSearchResults.find((r) =>
          message.includes(r.name) || r.name.includes(message.replace(/으로|에|로|할게|예약|선택|갈게|해줘/g, '').trim())
        ) || null;
        if (matched) console.log(`[Chat] 🔧 서버 자동 매칭: target_name="${matched.name}" (메시지에 가게명 포함)`);
      }

      if (matched) {
        if (!parsed.collected) {
          parsed.collected = {} as any;
        }
        parsed.collected.target_name = matched.name;
        if (matched.telephone) {
          parsed.collected.target_phone = matched.telephone;
        }
      }
    }

    // 11-1-2. AI가 날짜/인원/예약자명을 빠뜨렸을 때 사용자 메시지에서 보정 (카드 노출용)
    const needFallback = parsed.collected && (existingData?.scenario_type === 'RESERVATION' || parsed.collected.scenario_type === 'RESERVATION');
    if (needFallback && message) {
      const m = message.trim();
      if (!parsed.collected!.primary_datetime && /(오늘|내일|모레|다음\s*주|월|일|오전|오후|\d+시)/.test(m) && m.length <= 30) {
        parsed.collected!.primary_datetime = m;
      }
      const partyMatch = m.match(/^(\d+)\s*명$/);
      if (partyMatch && parsed.collected!.party_size == null) {
        parsed.collected!.party_size = parseInt(partyMatch[1], 10);
      }
      if (parsed.collected!.customer_name == null && /^[가-힣]{2,4}$/.test(m) && !/^(오늘|내일|모레|다음|첫번째|두번째)$/.test(m)) {
        parsed.collected!.customer_name = m;
      }
    }

    // 11-1-3. INQUIRY(재고/가능 여부): 사용자 메시지에서 문의 내용 추출해 special_request 보정
    const isInquiryAvailability = (existingData?.scenario_type === 'INQUIRY' && existingData?.scenario_sub_type === 'AVAILABILITY') ||
      (parsed.collected?.scenario_type === 'INQUIRY' && parsed.collected?.scenario_sub_type === 'AVAILABILITY');
    if (parsed.collected && isInquiryAvailability && message && !parsed.collected.special_request) {
      // "OO에 두쫀쿠 남았는지 물어봐줘" → "두쫀쿠 남았는지"
      const inquiryMatch = message.match(/(?:.*에\s+)?(.+?(?:남았는지|있는지|가능한지|있어|되나요))/);
      const phrase = inquiryMatch?.[1]?.replace(/\s*(물어봐|문의해|확인해|전화해).*$/g, '').trim();
      if (phrase && phrase.length >= 2 && phrase.length <= 80) {
        parsed.collected.special_request = phrase;
      }
    }

    // 11-1-4. 사용자 메시지에서 전화번호 추출해 target_phone 보정 (카드 노출용)
    if (parsed.collected && message && (parsed.collected.target_phone == null || parsed.collected.target_phone === '')) {
      const phoneMatch = message.match(/(0\d{1,2}-?\d{3,4}-?\d{4})|(010\d{8})/);
      const raw = phoneMatch ? (phoneMatch[1] || phoneMatch[2] || '').replace(/-/g, '') : '';
      if (raw.length >= 10 && raw.length <= 11 && /^0\d+$/.test(raw)) {
        const withDashes = phoneMatch?.[1]?.includes('-') ? phoneMatch[1] : null;
        parsed.collected.target_phone = withDashes ?? raw;
      }
    }

    // 11-1-5. 검색 결과 1건 + 전화번호 있음 → target_name 누락 시 서버 보정 (카드 노출)
    if (
      placeSearchResults.length === 1 &&
      parsed.collected &&
      !parsed.collected.target_name &&
      (parsed.collected.target_phone || existingData?.target_phone)
    ) {
      parsed.collected.target_name = placeSearchResults[0].name;
      if (placeSearchResults[0].telephone) parsed.collected.target_phone = placeSearchResults[0].telephone;
      console.log(`[Chat] 🔧 검색 1건 + 전화번호 있음 → target_name="${placeSearchResults[0].name}" 보정`);
    }

    // 11-2. 사용자가 검색 결과에 없는 고유 장소명을 지정한 경우 → 추가 검색
    // 오탐 방지: 문맥상 장소가 아닌 단어로 추가 검색하지 않음
    const NOT_PLACE_NAMES = new Set([
      '시로', '명으로', '실제로', '오후', '오늘', '내일', '감사', '문의', '직접', '전화', '예약',
      '정리', '다음', '이번', '주말', '인원', '성함', '이름', '번호', '수정', '맞으면', '버튼',
      '지금은', '어디에', '영업시', '연결을', '도와드릴게요', '호텔의',
      '이곳에', '이곳', '그곳', '저곳', '여기', '거기', '이곳이',
    ]);
    const isLikelyNotPlace = (name: string | null) =>
      !name ||
      name.length <= 2 ||
      NOT_PLACE_NAMES.has(name) ||
      /^\d+명$/.test(name) ||
      /^(오늘|내일|모레)\s/.test(name);

    if (isNaverConfigured() && placeSearchResults.length > 0) {
      // 기존 결과의 모든 가게명
      const existingNames = placeSearchResults.map((r) => r.name);

      // AI 응답에서 고유 장소명 추출 (업종명·대명사 제외, 맥락 고려)
      const genericWords = ['고기집', '갈비집', '미용실', '식당', '카페', '병원', '마트', '센터', '매장', '헤어', '음식점', '치과', '약국'];
      const aiMatch = assistantContent.match(/([가-힣]{2,12})\s*(?:예약|전화|도와)/);
      const aiPlaceName = aiMatch?.[1]?.trim();
      const isGeneric = aiPlaceName && genericWords.some((w) => aiPlaceName.includes(w) || w.includes(aiPlaceName));
      const isPronounOrPlaceholder = aiPlaceName && (NOT_PLACE_NAMES.has(aiPlaceName) || /^(이|그|저)곳|여기|거기/.test(aiPlaceName));

      // collected에 target_name이 있으면 우선 사용. AI 추출은 대명사/장소가 아닌 경우만
      const mentionedName = parsed.collected?.target_name || (!isGeneric && !isPronounOrPlaceholder ? aiPlaceName : null);

      // 기존 결과에 있는지 확인
      const isInExisting = mentionedName && existingNames.some((n) =>
        n.includes(mentionedName) || mentionedName.includes(n)
      );

      if (mentionedName && !isInExisting && !isLikelyNotPlace(mentionedName)) {
        try {
          // 지역 힌트: 사용자 메시지에서 2글자 이상 지역명 추출 (오탐 방지)
          const regionMatches = message.match(/([가-힣]{2,}(?:시|도|구|군|동|읍|면|역))/g) || [];
          const regionPart = regionMatches
            .filter((r) => r.length >= 3 && r !== mentionedName && !mentionedName.includes(r))
            .join(' ');

          // 지역 힌트 없으면 기존 검색 결과 주소에서 추출
          const fallbackRegion = !regionPart && placeSearchResults[0]?.address
            ? (placeSearchResults[0].address.match(/[가-힣]+[시도]\s*[가-힣]+[구군]/)?.[0] || '')
            : '';

          const region = regionPart || fallbackRegion;
          const searchQuery = region ? `${region} ${mentionedName}` : mentionedName;

          console.log(`[Chat] 🔍 새 장소 추가 검색: "${searchQuery}" (장소: ${mentionedName}, 지역: ${region || '없음'})`);
          const newResults = await searchNaverPlaces(searchQuery, location);

          if (newResults.length > 0) {
            // 새 결과에서 매칭되는 것이 있을 때만 결과 교체
            const newMatched = newResults.find((r) =>
              r.name.includes(mentionedName) || mentionedName.includes(r.name)
            );

            if (newMatched) {
              placeSearchResults = newResults;
              if (!parsed.collected) {
                parsed.collected = {} as any;
              }
              parsed.collected.target_name = newMatched.name;
              if (newMatched.telephone) {
                parsed.collected.target_phone = newMatched.telephone;
              }
              console.log(`[Chat] 🔧 추가 검색 매칭: target_name="${newMatched.name}" (${newResults.length}건 중)`);
            } else {
              console.log(`[Chat] 🔍 추가 검색 ${newResults.length}건이지만 "${mentionedName}" 매칭 없음 → 기존 결과 유지`);
            }
          }
        } catch (err) {
          console.error('[Chat] 추가 검색 실패:', err);
        }
      }
    }

    // 12. collected_data 병합 (null 보존 강화)
    const mergedData = mergeCollectedData(existingData, parsed.collected, true);

    // 13. Assistant 메시지 저장
    const savedMessage = await saveMessage(conversationId, 'assistant', parsed.message, {
      collected: parsed.collected,
      is_complete: parsed.is_complete,
    });

    // 14. Entity 추출 및 저장 (Phase 3 고도화)
    if (parsed.collected && savedMessage?.id) {
      try {
        await extractAndSaveEntities(conversationId, savedMessage.id, parsed.collected);
      } catch (entityError) {
        // Entity 저장 실패해도 대화는 계속 진행
        console.warn('[Entity] Failed to save entities:', entityError);
      }
    }

    // 15. collected_data 업데이트 — 전화 걸 수 있을 만큼 채워졌으면 READY로 (카드 노출 보장)
    const canPlaceCall =
      !!mergedData.target_name &&
      !!mergedData.target_phone &&
      (mergedData.scenario_type !== 'RESERVATION' || !!mergedData.primary_datetime);
    const forceReady = !parsed.is_complete && canPlaceCall;
    const newStatus = parsed.is_complete || forceReady ? 'READY' : 'COLLECTING';
    const effectiveComplete = parsed.is_complete || forceReady;
    if (forceReady) {
      console.log(`[Chat] 📋 서버 보정: 전화 가능 데이터 충족 → READY (카드 노출)`);
    }
    await updateCollectedData(conversationId, mergedData, newStatus);
    console.log(`[Chat] 📋 Status: ${newStatus} | Collected:`, JSON.stringify(mergedData, null, 0));

    // 16. 위치 컨텍스트 추출 (검색 결과가 없을 때만 - 검색은 다른 팀원 담당)
    let locationContext: LocationContext | null = null;
    if (placeSearchResults.length === 0) {
      try {
        locationContext = await extractLocationContext(
          {
            target_name: mergedData.target_name,
            special_request: mergedData.special_request,
          },
          message
        );
        if (locationContext) {
          console.log(`[Location] Detected: ${locationContext.region} → (${locationContext.coordinates?.lat}, ${locationContext.coordinates?.lng})`);
        }
      } catch (error) {
        console.warn('[Location] Failed to extract location context:', error);
      }
    }

    // 17. 응답 (검색 결과 또는 위치 컨텍스트 포함)
    return NextResponse.json({
      message: parsed.message,
      collected: mergedData,
      is_complete: effectiveComplete,
      conversation_status: newStatus,
      // 대시보드용 추가 필드
      search_results: placeSearchResults.length > 0 ? placeSearchResults : undefined,
      map_center: placeSearchResults.length > 0 && placeSearchResults[0].mapy && placeSearchResults[0].mapx
        ? {
            lat: placeSearchResults[0].mapy > 1000000 
              ? placeSearchResults[0].mapy / 10000000 
              : placeSearchResults[0].mapy,
            lng: placeSearchResults[0].mapx > 1000000 
              ? placeSearchResults[0].mapx / 10000000 
              : placeSearchResults[0].mapx,
          }
        : locationContext?.coordinates || undefined,
      // 위치 컨텍스트 (지도 줌 레벨 포함)
      location_context: locationContext || undefined,
    });
  } catch (error) {
    console.error('Failed to process chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
