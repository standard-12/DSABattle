import { NextRequest, NextResponse } from "next/server";

import { executeCode } from "@/lib/judge0/execute";

export async function POST(req: NextRequest) {
  try {
    const { code, language,stdin } = await req.json();

    if (!code || !language) {
      return NextResponse.json(
        {
          error: "Code and language are required",
        },
        {
          status: 400,
        }
      );
    }

    const result = await executeCode({
      sourceCode: code,
      language,
      stdin 
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Execution API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}