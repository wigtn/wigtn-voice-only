// =============================================================================
// WIGVO LLM Response Parser (v2)
// =============================================================================
// BE1 소유 - GPT 응답에서 메시지와 JSON 데이터 분리
// =============================================================================

import { CollectedData, createEmptyCollectedData } from '@/shared/types';

/**
 * 파싱된 LLM 응답
 */
export interface ParsedLLMResponse {
  message: string;
  collected: CollectedData;
  is_complete: boolean;
  next_question?: string;
}

/**
 * GPT 응답에서 메시지와 JSON 데이터를 분리
 *
 * @param content - GPT 응답 전체 텍스트
 * @returns 파싱된 응답 (실패 시 fallback 반환)
 */
export function parseAssistantResponse(content: string): ParsedLLMResponse {
  // JSON 블록 추출 정규식: ```json ... ```
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = content.match(jsonBlockRegex);

  if (!match) {
    // JSON 블록이 없으면 전체를 메시지로 반환
    return {
      message: content.trim(),
      collected: createEmptyCollectedData(),
      is_complete: false,
    };
  }

  try {
    const jsonStr = match[1];
    const parsed = JSON.parse(jsonStr);

    // JSON 블록 제거한 나머지를 메시지로
    const message = content.replace(jsonBlockRegex, '').trim();

    // collected 객체 추출 (없으면 빈 객체)
    const collected: CollectedData = {
      target_name: parsed.collected?.target_name ?? null,
      target_phone: parsed.collected?.target_phone ?? null,
      scenario_type: parsed.collected?.scenario_type ?? null,
      primary_datetime: parsed.collected?.primary_datetime ?? null,
      service: parsed.collected?.service ?? null,
      fallback_datetimes: parsed.collected?.fallback_datetimes ?? [],
      fallback_action: parsed.collected?.fallback_action ?? null,
      customer_name: parsed.collected?.customer_name ?? null,
      party_size: parsed.collected?.party_size ?? null,
      special_request: parsed.collected?.special_request ?? null,
    };

    return {
      message: message || '알겠습니다!',
      collected,
      is_complete: parsed.is_complete ?? false,
      next_question: parsed.next_question,
    };
  } catch {
    // JSON 파싱 실패 시 fallback
    // JSON 블록 제거 시도
    const message = content.replace(jsonBlockRegex, '').trim();

    return {
      message: message || content.trim(),
      collected: createEmptyCollectedData(),
      is_complete: false,
    };
  }
}
