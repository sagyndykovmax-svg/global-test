import { NextResponse } from "next/server";
import { classifyTnVedWithLLM } from "@/lib/tnved-llm";
import { deriveTnVedCode, type ProductRow } from "@/templates/declaration-eaeu-light/compose";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const row = body as ProductRow;
    if (!row.product_name || typeof row.product_name !== "string" || !row.product_name.trim()) {
      return NextResponse.json({ error: "product_name required" }, { status: 400 });
    }

    // Always compute rule-based code — it knows EAEU last-4 specifics from EAEU_LAST_4_OVERRIDES
    const ruleCode = deriveTnVedCode(row);

    // Try LLM classification — usually more accurate at HS-level (first 6 digits)
    const llmResult = await classifyTnVedWithLLM(row);

    if (llmResult && ruleCode) {
      // Hybrid: trust LLM for first 6 digits (HS subposition), trust rule-based for last 4
      // if it has an EAEU-specific override (non-0000). Otherwise use LLM's full code.
      const llmFirst6 = llmResult.code.slice(0, 6);
      const ruleFirst6 = ruleCode.slice(0, 6);
      const ruleLast4 = ruleCode.slice(6);

      if (llmFirst6 === ruleFirst6 && ruleLast4 !== "0000") {
        // Same HS subposition, rule has specific EAEU last-4 → use rule's full code
        return NextResponse.json({
          code: ruleCode,
          source: "llm-eaeu-refined",
          rationale: llmResult.rationale,
        });
      }
      // Otherwise trust LLM (it may know better at HS level)
      return NextResponse.json({
        code: llmResult.code,
        source: llmResult.source,
        rationale: llmResult.rationale,
      });
    }

    if (llmResult) {
      return NextResponse.json({
        code: llmResult.code,
        source: llmResult.source,
        rationale: llmResult.rationale,
      });
    }

    // No LLM → return rule-based
    return NextResponse.json({
      code: ruleCode || "",
      source: "fallback",
    });
  } catch (err) {
    console.error("[/api/tnved-suggest] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
