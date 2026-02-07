// ============================================================================
// BE2-1: Dynamic Prompt Generator
// ============================================================================
// Owner: BE2
// Purpose: CollectedData → ElevenLabs System Prompt + Dynamic Variables 변환
// ============================================================================

import type { CollectedData } from '@/shared/types';

// --- Public Types ---

export interface DynamicPromptResult {
  /** 완성된 System Prompt 문자열 (ElevenLabs Agent에게 전달) */
  systemPrompt: string;
  /** ElevenLabs dynamic_variables 형식의 key-value 맵 */
  dynamicVariables: Record<string, string>;
}

// --- Main Entry Point ---

/**
 * 채팅에서 수집된 CollectedData를 기반으로
 * ElevenLabs Agent용 Dynamic System Prompt와 Dynamic Variables를 생성합니다.
 */
export function generateDynamicPrompt(data: CollectedData): DynamicPromptResult {
  const systemPrompt = buildSystemPrompt(data);
  const dynamicVariables = formatForElevenLabs(data);
  return { systemPrompt, dynamicVariables };
}

/**
 * CollectedData를 ElevenLabs Dynamic Variables 형식으로 변환합니다.
 * null/undefined 값은 제외됩니다.
 */
export function formatForElevenLabs(data: CollectedData): Record<string, string> {
  const vars: Record<string, string> = {};

  if (data.target_name) vars.target_name = data.target_name;
  if (data.primary_datetime) vars.datetime = data.primary_datetime;
  if (data.service) vars.service = data.service;
  if (data.customer_name) vars.customer_name = data.customer_name;
  if (data.party_size != null) vars.party_size = String(data.party_size);
  if (data.special_request) vars.special_request = data.special_request;
  if (data.scenario_type) vars.scenario_type = data.scenario_type;

  return vars;
}

// --- System Prompt Builder ---

function buildSystemPrompt(data: CollectedData): string {
  const sections: string[] = [
    buildIdentitySection(),
    buildObjectiveSection(data),
    buildKeyInfoSection(data),
    buildConversationFlowSection(data),
    buildFallbackSection(data),
    buildEndingSection(),
    buildRulesSection(),
  ];

  return sections.join('\n\n');
}

// --- Section Builders ---

function buildIdentitySection(): string {
  return `You are a friendly AI phone assistant making a call on behalf of a customer.
You MUST speak in Korean (한국어) using polite speech (해요체).

## Your Identity
- You are calling on behalf of a customer who uses the WIGVO app
- Be polite, clear, and efficient
- Speak naturally like a human assistant, not like a robot
- Keep your sentences concise and easy to understand`;
}

function buildObjectiveSection(data: CollectedData): string {
  const targetName = data.target_name || '상대방';

  switch (data.scenario_type) {
    case 'RESERVATION': {
      const parts = [`Make a reservation at ${targetName}`];
      if (data.primary_datetime) parts.push(`for ${data.primary_datetime}`);
      if (data.service) parts.push(`(${data.service})`);
      return `## Call Objective\n${parts.join(' ')}.`;
    }

    case 'INQUIRY': {
      const subject = data.service || '서비스';
      const detail = data.special_request
        ? `\nSpecific question: ${data.special_request}`
        : '';
      return `## Call Objective\nInquire about ${subject} at ${targetName}.${detail}`;
    }

    case 'AS_REQUEST': {
      const product = data.service || '제품';
      const issue = data.special_request
        ? `\nIssue description: ${data.special_request}`
        : '';
      return `## Call Objective\nRequest AS/repair service at ${targetName} for ${product}.${issue}`;
    }

    default: {
      return `## Call Objective\nContact ${targetName} regarding ${data.service || '용건'}.`;
    }
  }
}

function buildKeyInfoSection(data: CollectedData): string {
  const lines: string[] = ['## Key Information'];

  if (data.target_name) lines.push(`- Target: ${data.target_name}`);
  if (data.service) lines.push(`- Service: ${data.service}`);
  if (data.primary_datetime) lines.push(`- Preferred Time: ${data.primary_datetime}`);
  if (data.customer_name) lines.push(`- Customer Name: ${data.customer_name}`);
  if (data.party_size != null) lines.push(`- Party Size: ${data.party_size}명`);
  if (data.special_request) lines.push(`- Special Request: ${data.special_request}`);

  if (data.fallback_datetimes.length > 0) {
    lines.push(`- Alternative Times: ${data.fallback_datetimes.join(', ')}`);
  }

  return lines.join('\n');
}

function buildConversationFlowSection(data: CollectedData): string {
  switch (data.scenario_type) {
    case 'RESERVATION':
      return buildReservationFlow(data);
    case 'INQUIRY':
      return buildInquiryFlow(data);
    case 'AS_REQUEST':
      return buildAsRequestFlow(data);
    default:
      return buildReservationFlow(data);
  }
}

function buildReservationFlow(data: CollectedData): string {
  const service = data.service || '예약';
  const datetime = data.primary_datetime || '요청한 시간';
  const customerName = data.customer_name || '고객';

  const steps: string[] = [
    `1. Greeting: "안녕하세요, ${service} 문의 드립니다."`,
    `2. Request: "${datetime}에 ${service} 예약 가능할까요?"`,
  ];

  let stepNum = 3;

  if (data.party_size != null) {
    steps.push(`${stepNum}. If asked about party size: "${data.party_size}명입니다."`);
    stepNum++;
  }

  steps.push(
    `${stepNum}. If asked for name: "예약자 이름은 ${customerName}입니다."`,
  );
  stepNum++;

  steps.push(`${stepNum}. Confirm the final reservation details before ending.`);

  return `## Conversation Flow\n${steps.join('\n')}`;
}

function buildInquiryFlow(data: CollectedData): string {
  const service = data.service || '서비스';

  const steps: string[] = [
    `1. Greeting: "안녕하세요, ${service} 관련해서 문의드릴 게 있어서 전화드렸습니다."`,
    `2. Ask your question clearly and wait for the answer.`,
  ];

  if (data.special_request) {
    steps.push(`3. Specific question to ask: "${data.special_request}"`);
    steps.push(`4. Listen carefully and note the answer.`);
    steps.push(`5. Thank them: "알려주셔서 감사합니다."`);
  } else {
    steps.push(`3. Ask about availability, pricing, or other relevant details.`);
    steps.push(`4. Thank them for the information.`);
  }

  return `## Conversation Flow\n${steps.join('\n')}`;
}

function buildAsRequestFlow(data: CollectedData): string {
  const service = data.service || '제품';
  const datetime = data.primary_datetime || '가능한 시간';

  const steps: string[] = [
    `1. Greeting: "안녕하세요, ${service} AS 접수하려고 전화드렸습니다."`,
  ];

  if (data.special_request) {
    steps.push(`2. Describe the issue: "${data.special_request}"`);
  } else {
    steps.push(`2. Describe the issue with ${service}.`);
  }

  steps.push(`3. Request a visit: "${datetime}에 방문 가능하실까요?"`);
  steps.push(`4. Confirm the appointment details and any required preparation.`);

  return `## Conversation Flow\n${steps.join('\n')}`;
}

function buildFallbackSection(data: CollectedData): string {
  const lines: string[] = ['## Fallback Handling'];

  // No fallback info at all
  if (data.fallback_datetimes.length === 0 && !data.fallback_action) {
    lines.push(
      'If the requested time is unavailable, politely end the call and report back.',
    );
    lines.push('Say: "알겠습니다. 확인해서 다시 연락드릴게요."');
    return lines.join('\n');
  }

  lines.push('If the requested time is unavailable:');

  let step = 1;

  // Alternative times
  if (data.fallback_datetimes.length > 0) {
    const alternatives = data.fallback_datetimes.join(', ');
    lines.push(
      `${step}. Try these alternative times in order: ${alternatives}`,
    );
    step++;
  }

  // Fallback action
  switch (data.fallback_action) {
    case 'ASK_AVAILABLE':
      lines.push(
        `${step}. Ask "그럼 언제가 가능하세요?" and note the available times to report back.`,
      );
      step++;
      break;

    case 'NEXT_DAY':
      lines.push(
        `${step}. Ask if the next day works: "그럼 다음 날은 가능할까요?"`,
      );
      step++;
      break;

    case 'CANCEL':
      lines.push(
        `${step}. If no alternatives work, politely end the call: "알겠습니다. 감사합니다."`,
      );
      step++;
      break;
  }

  // Final fallback
  lines.push(
    `${step}. If none of the above works, say "알겠습니다. 확인해서 다시 연락드릴게요." and end the call.`,
  );

  return lines.join('\n');
}

function buildEndingSection(): string {
  return `## Ending the Call
- Always confirm the final details before ending.
- Success: "감사합니다. 좋은 하루 되세요."
- Partial success (alternative accepted): "네, 알겠습니다. 감사합니다."
- Failed (nothing available): "알겠습니다. 확인해서 다시 연락드릴게요."`;
}

function buildRulesSection(): string {
  return `## Important Rules
- ALWAYS speak in Korean (한국어) using polite speech (해요체)
- Never reveal you are an AI unless directly asked
- If you can't understand after 2 attempts, ask them to repeat slowly: "죄송한데, 다시 한 번 말씀해주시겠어요?"
- If conversation goes off-track, politely redirect to the main purpose
- Confirm important details by repeating them back
- Keep the conversation concise and focused
- If the other party is rude or hangs up, end gracefully`;
}
