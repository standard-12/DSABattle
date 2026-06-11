import { NextRequest, NextResponse } from "next/server";
import { judgeSubmission } from "@/lib/judge0/judgeSubmission";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { problemId, sourceCode, language } = await req.json();

    if (!problemId || !sourceCode || !language) {
      return NextResponse.json(
        {
          error: "problemId, sourceCode and language are required",
        },
        { status: 400 }
      );
    }

    const { data: testcases, error } = await supabaseAdmin
      .from("problem_test_cases")
      .select("input, expected_output")
      .eq("problem_id", problemId)
      .order("order_index", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const result = await judgeSubmission({
      sourceCode,
      language,
      testcases: testcases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expected_output,
      })),
    });

    // Persist the practice submission (battle_id = null distinguishes it from
    // battle submissions, which the WS server writes with a battle_id).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: insertError } = await supabaseAdmin.from("submissions").insert({
        battle_id: null, // practice submission
        user_id: user.id,
        problem_id: problemId,
        source_code: sourceCode,
        language,
        verdict: result.verdict,
        runtime_ms: result.runtimeMs,
        memory_kb: result.memoryKb,
        passed_testcases: result.passedTestcases,
        total_testcases: result.totalTestcases,
      });

      if (insertError) {
        // Don't fail the request — the user still gets their verdict.
        console.error("Failed to persist practice submission:", insertError.message);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
