-- =============================================================================
-- WIGVO Supabase Tables (v3 - Enhanced)
-- =============================================================================
-- Phase 3 고도화: 구조화된 Entity 저장 + 검색 결과 캐싱
-- Supabase Dashboard → SQL Editor에서 실행
-- v2 테이블이 이미 생성된 경우에만 실행 (기존 테이블과 병행 운영)
-- =============================================================================

-- =============================================================================
-- 1. 구조화된 Entity 저장 테이블
-- =============================================================================
-- collected_data JSONB와 병행 운영 (점진적 마이그레이션)
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversation_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- 'target_name', 'target_phone', 'service', etc.
  entity_value TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,  -- LLM이 확신하는 정도 (0.0-1.0)
  source_message_id UUID REFERENCES messages(id),  -- 어느 메시지에서 추출했는지
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, entity_type)  -- 같은 타입은 하나만
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_entities_conversation ON conversation_entities(conversation_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON conversation_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_message ON conversation_entities(source_message_id);

-- RLS 활성화
ALTER TABLE conversation_entities ENABLE ROW LEVEL SECURITY;

-- RLS 정책 - 본인 대화의 entities만 접근 가능
CREATE POLICY "Users can access own conversation entities"
  ON conversation_entities FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. 검색 결과 캐싱 테이블
-- =============================================================================
-- 네이버지도 API 호출 최소화를 위한 캐싱
-- =============================================================================

CREATE TABLE IF NOT EXISTS place_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,  -- query의 해시값 (SHA256)
  query_text TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cache_query_hash ON place_search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON place_search_cache(expires_at);

-- 만료된 캐시 자동 삭제를 위한 함수 (선택적)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM place_search_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS는 필요 없음 (공용 캐시, 사용자별 구분 불필요)

-- =============================================================================
-- 3. 유용한 뷰 (선택적)
-- =============================================================================

-- 대화별 수집된 Entity 요약 뷰
CREATE OR REPLACE VIEW conversation_entities_summary AS
SELECT 
  conversation_id,
  jsonb_object_agg(entity_type, entity_value) as entities,
  jsonb_object_agg(entity_type, confidence) as confidences,
  MAX(updated_at) as last_updated
FROM conversation_entities
GROUP BY conversation_id;
