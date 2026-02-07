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
import { COLLECTION_SYSTEM_PROMPT } from '@/lib/prompts';
import { parseAssistantResponse } from '@/lib/response-parser';
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
    const { conversationId, message } = body;

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

    // 6. LLM 메시지 구성
    const llmMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: COLLECTION_SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // 7. OpenAI 호출
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

    // 8. 응답 파싱
    const parsed = parseAssistantResponse(assistantContent);

    // 9. collected_data 병합
    const existingData = conversation.collected_data as CollectedData;
    const mergedData = mergeCollectedData(existingData, parsed.collected);

    // 10. Assistant 메시지 저장
    await saveMessage(conversationId, 'assistant', parsed.message, {
      collected: parsed.collected,
      is_complete: parsed.is_complete,
    });

    // 11. collected_data 업데이트
    const newStatus = parsed.is_complete ? 'READY' : 'COLLECTING';
    await updateCollectedData(conversationId, mergedData, newStatus);

    // 12. 응답
    return NextResponse.json({
      message: parsed.message,
      collected: mergedData,
      is_complete: parsed.is_complete,
      conversation_status: newStatus,
    });
  } catch (error) {
    console.error('Failed to process chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
