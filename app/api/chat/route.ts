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

  const coreInstruction = `1. 반드시 위 목록을 사용자에게 보여주고, 어디에 전화할지 물어보세요.
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
    const { conversationId, message, location } = body;

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
    let placeSearchResults: NaverPlaceResult[] = [];
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
        loopCount < MAX_TOOL_LOOPS
      ) {
        loopCount++;
        const toolCall = choice.message.tool_calls[0] as {
          id: string;
          type: 'function';
          function: { name: string; arguments: string };
        };

        if (toolCall.type === 'function' && toolCall.function.name === 'search_place') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`[Chat] 🔍 AI가 검색 요청: "${args.query}"`);

          const results = await searchNaverPlaces(args.query, location);
          // Function Calling 검색 결과를 프론트엔드로도 전달
          placeSearchResults = results;
          // 디버깅: 네이버 API에서 실제로 무엇을 반환했는지 확인
          console.log(`[Chat] 🔍 검색 결과: ${results.length}건`);
          results.forEach((r, i) => {
            console.log(`[Chat]   ${i + 1}. ${r.name} | tel: "${r.telephone}" | addr: ${r.roadAddress || r.address} | cat: ${r.category}`);
          });
          const formatted = formatSearchResultsForTool(results);
          console.log(`[Chat] 🔍 AI에게 전달:\n${formatted}`);

          llmMessages.push(choice.message);
          llmMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: formatted,
          });

          completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: llmMessages,
            temperature: 0.7,
            tools,
          });

          choice = completion.choices[0];
        } else {
          break;
        }
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
      message // 사용자 메시지에서 가게명 찾기
    ) {
      const matched = placeSearchResults.find((r) =>
        message.includes(r.name) || r.name.includes(message.replace(/으로|에|로|할게|예약|선택|갈게|해줘/g, '').trim())
      );
      if (matched) {
        if (!parsed.collected) {
          parsed.collected = {} as any;
        }
        parsed.collected.target_name = matched.name;
        if (matched.telephone) {
          parsed.collected.target_phone = matched.telephone;
        }
        console.log(`[Chat] 🔧 서버 자동 매칭: target_name="${matched.name}" (AI가 JSON 누락)`);
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

    // 15. collected_data 업데이트
    const newStatus = parsed.is_complete ? 'READY' : 'COLLECTING';
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
      is_complete: parsed.is_complete,
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
