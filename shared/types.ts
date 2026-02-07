// =============================================================================
// WIGVO Shared Types (v2)
// =============================================================================
// BE1 소유 - 모든 역할이 READ
// API Contract (api-contract.mdc) 기반
// =============================================================================

// -----------------------------------------------------------------------------
// Conversation Status
// -----------------------------------------------------------------------------
export type ConversationStatus =
  | 'COLLECTING'
  | 'READY'
  | 'CALLING'
  | 'COMPLETED'
  | 'CANCELLED';

// -----------------------------------------------------------------------------
// Scenario Type
// -----------------------------------------------------------------------------
export type ScenarioType = 'RESERVATION' | 'INQUIRY' | 'AS_REQUEST';

// -----------------------------------------------------------------------------
// Fallback Action
// -----------------------------------------------------------------------------
export type FallbackAction = 'ASK_AVAILABLE' | 'NEXT_DAY' | 'CANCEL';

// -----------------------------------------------------------------------------
// Call Status
// -----------------------------------------------------------------------------
export type CallStatus =
  | 'PENDING'
  | 'CALLING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

// -----------------------------------------------------------------------------
// Call Result
// -----------------------------------------------------------------------------
export type CallResult = 'SUCCESS' | 'NO_ANSWER' | 'REJECTED' | 'ERROR';

// -----------------------------------------------------------------------------
// Collected Data (정보 수집 결과)
// -----------------------------------------------------------------------------
export interface CollectedData {
  target_name: string | null;
  target_phone: string | null;
  scenario_type: ScenarioType | null;
  primary_datetime: string | null;
  service: string | null;
  fallback_datetimes: string[];
  fallback_action: FallbackAction | null;
  customer_name: string | null;
  party_size: number | null;
  special_request: string | null;
}

/**
 * 빈 CollectedData 객체 생성
 * - string 필드: null
 * - 배열 필드: []
 * - number 필드: null
 */
export function createEmptyCollectedData(): CollectedData {
  return {
    target_name: null,
    target_phone: null,
    scenario_type: null,
    primary_datetime: null,
    service: null,
    fallback_datetimes: [],
    fallback_action: null,
    customer_name: null,
    party_size: null,
    special_request: null,
  };
}

/**
 * CollectedData 병합
 * - null이 아닌 새 값만 덮어쓰기
 * - 배열은 비어있지 않을 때만 교체
 */
export function mergeCollectedData(
  existing: CollectedData,
  incoming: Partial<CollectedData>
): CollectedData {
  return {
    target_name: incoming.target_name ?? existing.target_name,
    target_phone: incoming.target_phone ?? existing.target_phone,
    scenario_type: incoming.scenario_type ?? existing.scenario_type,
    primary_datetime: incoming.primary_datetime ?? existing.primary_datetime,
    service: incoming.service ?? existing.service,
    fallback_datetimes:
      incoming.fallback_datetimes && incoming.fallback_datetimes.length > 0
        ? incoming.fallback_datetimes
        : existing.fallback_datetimes,
    fallback_action: incoming.fallback_action ?? existing.fallback_action,
    customer_name: incoming.customer_name ?? existing.customer_name,
    party_size: incoming.party_size ?? existing.party_size,
    special_request: incoming.special_request ?? existing.special_request,
  };
}

// -----------------------------------------------------------------------------
// Message
// -----------------------------------------------------------------------------
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Conversation
// -----------------------------------------------------------------------------
export interface Conversation {
  id: string;
  userId: string;
  status: ConversationStatus;
  collectedData: CollectedData;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Call
// -----------------------------------------------------------------------------
export interface Call {
  id: string;
  userId: string;
  conversationId: string | null;
  requestType: ScenarioType;
  targetName: string | null;
  targetPhone: string;
  parsedDate: string | null;
  parsedTime: string | null;
  parsedService: string | null;
  status: CallStatus;
  result: CallResult | null;
  summary: string | null;
  elevenLabsConversationId: string | null;
  createdAt: string;
  completedAt: string | null;
}

// -----------------------------------------------------------------------------
// API Request/Response Types
// -----------------------------------------------------------------------------

// POST /api/chat
export interface ChatRequest {
  conversationId: string;
  message: string;
}

export interface ChatResponse {
  message: string;
  collected: CollectedData;
  is_complete: boolean;
  conversation_status: ConversationStatus;
}

// POST /api/calls
export interface CreateCallRequest {
  conversationId: string;
}

// POST /api/conversations response
export interface CreateConversationResponse {
  id: string;
  userId: string;
  status: ConversationStatus;
  collectedData: CollectedData;
  greeting: string;
  createdAt: string;
}

// GET /api/calls response
export interface CallsListResponse {
  calls: Call[];
}
