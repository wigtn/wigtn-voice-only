-- =============================================================================
-- WIGVO Supabase Tables (v2)
-- =============================================================================
-- Supabase Dashboard → SQL Editor에서 실행
-- 순서대로 실행 (테이블 → 인덱스 → RLS)
-- =============================================================================

-- 1. 대화 세션
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'COLLECTING',  -- COLLECTING, READY, CALLING, COMPLETED, CANCELLED
  collected_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 대화 메시지
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 전화 기록
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES auth.users(id),
  elevenlabs_conversation_id TEXT,
  request_type TEXT DEFAULT 'RESERVATION',  -- RESERVATION, INQUIRY, AS_REQUEST
  target_phone TEXT NOT NULL,
  target_name TEXT,
  parsed_date TEXT,
  parsed_time TEXT,
  parsed_service TEXT,
  status TEXT DEFAULT 'PENDING',  -- PENDING, CALLING, IN_PROGRESS, COMPLETED, FAILED
  result TEXT,                    -- SUCCESS, NO_ANSWER, REJECTED, ERROR
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. 인덱스
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_calls_conversation ON calls(conversation_id);
CREATE INDEX idx_calls_user ON calls(user_id);

-- 5. RLS (Row Level Security) 활성화
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 - 본인 데이터만 접근 가능
CREATE POLICY "Users can access own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access own messages"
  ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access own calls"
  ON calls FOR ALL
  USING (auth.uid() = user_id);
