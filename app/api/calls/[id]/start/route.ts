// ============================================================================
// BE2-3: POST /api/calls/[id]/start
// ============================================================================
// Owner: BE2
// Purpose: 수집 완료된 Call에 대해 ElevenLabs 전화 발신 시작
// API Contract: Endpoint 4 (api-contract.mdc)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDynamicPrompt } from "@/lib/prompt-generator";
import {
  isMockMode,
  startOutboundCall,
  formatPhoneToE164,
  determineCallResult,
  generateMockSummary,
  startPolling,
} from "@/lib/elevenlabs";
import type { CollectedData } from "@/shared/types";

// --- Types for Supabase query result ---

interface CallWithConversation {
  id: string;
  conversation_id: string;
  user_id: string;
  target_phone: string;
  target_name: string | null;
  status: string;
  parsed_service: string | null;
  conversations: {
    collected_data: CollectedData;
    status: string;
  };
}

// --- POST Handler ---

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // params는 Next.js 15+에서 Promise이므로 반드시 await
  const { id: callId } = await params;

  try {
    const supabase = await createClient();

    // ── 1. Auth check ──
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Call 정보 조회 (conversation의 collected_data 포함) ──
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("*, conversations(collected_data, status)")
      .eq("id", callId)
      .eq("user_id", user.id)
      .single();

    if (callError || !call) {
      console.error("[Start] Call not found:", callError?.message);
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const typedCall = call as unknown as CallWithConversation;

    // ── 3. Call 상태 검증 ──
    if (typedCall.status !== "PENDING") {
      return NextResponse.json(
        { error: `Call is already in status: ${typedCall.status}` },
        { status: 400 },
      );
    }

    // ── 4. collected_data 추출 ──
    const collectedData: CollectedData = typedCall.conversations
      ?.collected_data || {
      target_name: typedCall.target_name,
      target_phone: typedCall.target_phone,
      scenario_type: null,
      primary_datetime: null,
      service: typedCall.parsed_service,
      customer_name: null,
      party_size: null,
      fallback_datetimes: [],
      fallback_action: null,
      special_request: null,
    };

    // ── 5. Call 상태를 CALLING으로 업데이트 ──
    const { error: callingError } = await supabase
      .from("calls")
      .update({
        status: "CALLING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", callId);

    if (callingError) {
      console.error(
        "[Start] Failed to update call status:",
        callingError.message,
      );
      return NextResponse.json(
        { error: "Failed to start call" },
        { status: 500 },
      );
    }

    // Conversation 상태도 CALLING으로 업데이트
    await supabase
      .from("conversations")
      .update({
        status: "CALLING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedCall.conversation_id);

    // ── 6. Dynamic Prompt 생성 ──
    const { systemPrompt, dynamicVariables } =
      generateDynamicPrompt(collectedData);

    console.log(
      "[Start] Dynamic prompt generated for scenario:",
      collectedData.scenario_type,
    );

    // ── 7. 전화번호 E.164 포맷 변환 ──
    const phoneNumber = formatPhoneToE164(typedCall.target_phone);

    // ── 8. ElevenLabs Outbound Call 시작 ──
    let callResponse;
    try {
      callResponse = await startOutboundCall({
        phoneNumber,
        dynamicVariables,
        systemPrompt,
      });
    } catch (error) {
      console.error("[Start] ElevenLabs call failed:", error);

      // 실패 시 Call/Conversation 상태 업데이트
      await updateCallFailed(
        supabase,
        callId,
        typedCall.conversation_id,
        error instanceof Error
          ? error.message
          : "ElevenLabs call initiation failed",
      );

      return NextResponse.json(
        { error: "Failed to start call" },
        { status: 500 },
      );
    }

    const elevenLabsConversationId = callResponse.conversation_id;

    // ── 9. ElevenLabs conversation ID 저장 + IN_PROGRESS 상태 ──
    await supabase
      .from("calls")
      .update({
        elevenlabs_conversation_id: elevenLabsConversationId,
        status: "IN_PROGRESS",
        updated_at: new Date().toISOString(),
      })
      .eq("id", callId);

    // ── 10. Mock / Real 모드별 완료 처리 ──
    if (isMockMode()) {
      handleMockCompletion(
        supabase,
        callId,
        typedCall.conversation_id,
        collectedData,
      );
    } else {
      handleRealCompletion(
        supabase,
        callId,
        typedCall.conversation_id,
        elevenLabsConversationId,
      );
    }

    // ── 11. 즉시 응답 반환 ──
    return NextResponse.json({
      success: true,
      conversationId: elevenLabsConversationId,
    });
  } catch (error) {
    console.error("[Start] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to start call" },
      { status: 500 },
    );
  }
}

// --- Mock Mode: 5초 후 자동 완료 ---

function handleMockCompletion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  callId: string,
  conversationId: string,
  collectedData: CollectedData,
) {
  console.log(
    "[Mock] Scheduling auto-completion in 5 seconds for call:",
    callId,
  );

  setTimeout(async () => {
    try {
      const mockSummary = generateMockSummary(collectedData);

      // Call 완료 처리
      const { error: callUpdateError } = await supabase
        .from("calls")
        .update({
          status: "COMPLETED",
          result: "SUCCESS",
          summary: mockSummary,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", callId);

      if (callUpdateError) {
        console.error("[Mock] Call update failed:", callUpdateError.message);
        return;
      }

      // Conversation 완료 처리
      const { error: convUpdateError } = await supabase
        .from("conversations")
        .update({
          status: "COMPLETED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (convUpdateError) {
        console.error(
          "[Mock] Conversation update failed (non-critical):",
          convUpdateError.message,
        );
      }

      console.log("[Mock] Call auto-completed successfully:", callId);
    } catch (err) {
      console.error("[Mock] Auto-completion error:", err);
    }
  }, 5000);
}

// --- Real Mode: 백그라운드 폴링으로 결과 수집 ---

function handleRealCompletion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  callId: string,
  conversationId: string,
  elevenLabsConversationId: string,
) {
  console.log("[Real] Starting background polling for call:", callId);

  startPolling({
    conversationId: elevenLabsConversationId,

    // 통화 완료 시
    onComplete: async (conversation) => {
      try {
        const result = determineCallResult(conversation);
        const summary = conversation.analysis?.transcript_summary || null;

        console.log(`[Real] Call ${callId} completed. Result: ${result}`);

        // Call 상태 업데이트
        const { error: callErr } = await supabase
          .from("calls")
          .update({
            status: "COMPLETED",
            result,
            summary,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", callId);

        if (callErr) {
          console.error("[Real] Call update failed:", callErr.message);
        }

        // Conversation 상태 업데이트 (실패해도 call 결과는 유지)
        try {
          await supabase
            .from("conversations")
            .update({
              status: "COMPLETED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        } catch (convErr) {
          console.error(
            "[Real] Conversation update failed (non-critical):",
            convErr,
          );
        }
      } catch (err) {
        console.error("[Real] onComplete handler error:", err);
      }
    },

    // 폴링 에러/타임아웃 시
    onError: async (error) => {
      console.error(`[Real] Polling failed for call ${callId}:`, error.message);
      await updateCallFailed(supabase, callId, conversationId, error.message);
    },
  });
}

// --- Helper: Call 실패 처리 ---

async function updateCallFailed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  callId: string,
  conversationId: string,
  errorMessage: string,
) {
  try {
    await supabase
      .from("calls")
      .update({
        status: "FAILED",
        result: "ERROR",
        summary: errorMessage,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", callId);

    // Conversation도 COMPLETED로 (실패도 종료 상태)
    try {
      await supabase
        .from("conversations")
        .update({
          status: "COMPLETED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } catch (convErr) {
      console.error(
        "[Helper] Conversation update failed (non-critical):",
        convErr,
      );
    }
  } catch (err) {
    console.error("[Helper] Failed to update call as FAILED:", err);
  }
}
