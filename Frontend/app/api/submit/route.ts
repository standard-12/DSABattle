import { NextRequest, NextResponse } from "next/server";
import { judgeSubmission } from "@/lib/judge0/judgeSubmission";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { problemId, sourceCode, language } =
      await req.json();

    if (!problemId || !sourceCode || !language) {
      return NextResponse.json(
        {
          error:
            "problemId, sourceCode and language are required",
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