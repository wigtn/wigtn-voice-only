// =============================================================================
// POST /api/conversations - 대화 시작
// =============================================================================
// BE1 소유 - 새 대화 세션 생성
// API Contract: Endpoint 0-1
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConversation } from '@/lib/supabase/chat';

export async function POST() {
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

    // 2. 대화 세션 생성
    const { conversation, greeting } = await createConversation(user.id);

    // 3. 응답 (snake_case → camelCase 변환)
    return NextResponse.json(
      {
        id: conversation.id,
        userId: conversation.user_id,
        status: conversation.status,
        collectedData: conversation.collected_data,
        greeting,
        createdAt: conversation.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
