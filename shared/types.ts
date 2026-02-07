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
 * CollectedData 병합 (v3 개선: null 보존 강화)
 * - null이 아닌 새 값만 덮어쓰기
 * - 배열은 비어있지 않을 때만 교체
 * - **중요**: incoming에서 명시적으로 null을 보내도 기존 값 유지 (정보 손실 방지)
 * 
 * @param existing - 기존 수집 데이터
 * @param incoming - 새로 수집된 데이터 (LLM 응답)
 * @param preserveExisting - true면 null을 보내도 기존 값 유지 (기본값: true)
 */
export function mergeCollectedData(
  existing: CollectedData,
  incoming: Partial<CollectedData>,
  preserveExisting: boolean = true
): CollectedData {
  // preserveExisting이 true면: null이어도 기존 값 유지
  // preserveExisting이 false면: undefined만 기존 값 유지, null은 명시적 삭제로 처리
  
  const mergeString = (existingVal: string | null, incomingVal: string | null | undefined): string | null => {
    if (preserveExisting) {
      // null을 보내도 기존 값 유지
      return incomingVal !== undefined && incomingVal !== null ? incomingVal : existingVal;
    } else {
      // undefined만 기존 값 유지, null은 null로 설정
      return incomingVal !== undefined ? incomingVal : existingVal;
    }
  };
  
  const mergeNumber = (existingVal: number | null, incomingVal: number | null | undefined): number | null => {
    if (preserveExisting) {
      return incomingVal !== undefined && incomingVal !== null ? incomingVal : existingVal;
    } else {
      return incomingVal !== undefined ? incomingVal : existingVal;
    }
  };
  
  return {
    target_name: mergeString(existing.target_name, incoming.target_name),
    target_phone: mergeString(existing.target_phone, incoming.target_phone),
    scenario_type: incoming.scenario_type !== undefined && incoming.scenario_type !== null
      ? incoming.scenario_type
      : existing.scenario_type,
    primary_datetime: mergeString(existing.primary_datetime, incoming.primary_datetime),
    service: mergeString(existing.service, incoming.service),
    fallback_datetimes:
      incoming.fallback_datetimes && incoming.fallback_datetimes.length > 0
        ? incoming.fallback_datetimes
        : existing.fallback_datetimes,
    fallback_action: incoming.fallback_action !== undefined && incoming.fallback_action !== null
      ? incoming.fallback_action
      : existing.fallback_action,
    customer_name: mergeString(existing.customer_name, incoming.customer_name),
    party_size: mergeNumber(existing.party_size, incoming.party_size),
    special_request: mergeString(existing.special_request, incoming.special_request),
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
  greeting?: string; // POST /api/conversations 응답 시에만 포함
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
// Database Row Types (snake_case - Supabase convention)
// -----------------------------------------------------------------------------

export interface ConversationRow {
  id: string;
  user_id: string;
  status: ConversationStatus;
  collected_data: CollectedData;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CallRow {
  id: string;
  conversation_id: string;
  user_id: string;
  elevenlabs_conversation_id: string | null;
  request_type: ScenarioType;
  target_phone: string;
  target_name: string | null;
  parsed_date: string | null;
  parsed_time: string | null;
  parsed_service: string | null;
  status: CallStatus;
  result: CallResult | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// -----------------------------------------------------------------------------
// API Request/Response Types
// -----------------------------------------------------------------------------

// POST /api/chat
export interface ChatRequest {
  conversationId: string;
  message: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface ChatResponse {
  message: string;
  collected: CollectedData;
  is_complete: boolean;
  conversation_status: ConversationStatus;
  // 대시보드용 추가 필드
  search_results?: NaverPlaceResultBasic[];
  map_center?: {
    lat: number;
    lng: number;
  };
}

// 네이버 장소 검색 결과 (기본 필드)
export interface NaverPlaceResultBasic {
  name: string;
  address: string;
  roadAddress: string;
  telephone: string;
  category: string;
  mapx: number;
  mapy: number;
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
