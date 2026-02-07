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

    // 10. OpenAI 호출
    let assistantContent: string;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: llmMessages,
        temperature: 0.7,
      });

      assistantContent =
        completion.choices[0]?.message?.content ||
        '죄송합니다, 응답을 생성하지 못했어요.';
    } catch (llmError) {
      console.error('OpenAI API error:', llmError);
      // LLM 실패 시 fallback
      assistantContent =
        '죄송합니다, 잠시 오류가 발생했어요. 다시 말씀해주세요.';

      // 기존 상태 유지하며 에러 응답
      return NextResponse.json({
        message: assistantContent,
        collected: conversation.collected_data,
        is_complete: false,
        conversation_status: conversation.status,
      });
    }

    // 11. 응답 파싱
    const parsed = parseAssistantResponse(assistantContent);

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
