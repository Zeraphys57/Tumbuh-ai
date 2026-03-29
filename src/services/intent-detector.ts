import { SchemaType } from "@google/generative-ai";
import { genAI } from "@/lib/gemini";
import { supabaseAdmin as supabase } from "@/lib/supabase";

const AI_MODEL_ROUTER = "gemini-2.5-flash-lite";

export interface IntentResult {
  intent: string;
  confidence: number;
  requires_human: boolean;
}

const INTENT_FALLBACK: IntentResult = { intent: "out_of_scope", confidence: 0, requires_human: true };

export async function detectIntent(
  message: string,
  businessContext: string,
  dbClientId: string
): Promise<IntentResult> {
  const intentSchema = {
    type: SchemaType.OBJECT,
    properties: {
      intent: {
        type: SchemaType.STRING,
        description: "Pilih SATU: 'tanya_produk', 'tanya_harga', 'booking_reservasi', 'komplain', 'marah_emosi', atau 'out_of_scope'",
      },
      confidence: {
        type: SchemaType.NUMBER,
        description: "Angka 1-100 seberapa yakin dengan klasifikasi intent ini",
      },
      requires_human: {
        type: SchemaType.BOOLEAN,
        description: "True jika ini keluhan berat, marah-marah, nego harga ekstrem, atau bahasan di luar konteks bisnis",
      },
    },
    required: ["intent", "confidence", "requires_human"],
  };

  const intentModel = genAI.getGenerativeModel({
    model: AI_MODEL_ROUTER,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: intentSchema as any,
    },
    systemInstruction: `Tugasmu HANYA membaca pesan terakhir user dan mengkategorikan niatnya (intent) dalam konteks: "${businessContext}". Jangan membalas pesannya, cukup deteksi niatnya saja.`,
  });

  // Bungkus seluruh Gemini call — jika API error, langsung return fallback (tidak boleh throw)
  let intentResult;
  try {
    const intentStartTime = performance.now();
    intentResult = await intentModel.generateContent(message);
    const intentEndTime = performance.now();

    // Safe JSON parsing
    const rawIntentText = intentResult.response.text().trim();
    const cleanIntentJson = rawIntentText.replace(/```json|```/g, "").trim();
    let userIntent: IntentResult = { ...INTENT_FALLBACK };
    try {
      userIntent = JSON.parse(cleanIntentJson);
    } catch (parseError) {
      console.error("⚠️ Intent JSON Parse Error, fallback ke handoff:", parseError);
      return INTENT_FALLBACK;
    }

    console.log(
      `[INTENT DETECTED]: ${userIntent.intent} (Yakin: ${userIntent.confidence}%) | Butuh Manusia: ${userIntent.requires_human}`
    );

    // Fire-and-forget telemetry
    const intentUsage = intentResult.response.usageMetadata;
    if (intentUsage) {
      supabase
        .from("usage_logs")
        .insert({
          client_id: dbClientId,
          model_used: "intent-router (flash-lite)",
          tokens_input: intentUsage.promptTokenCount,
          tokens_output: intentUsage.candidatesTokenCount,
          total_tokens: intentUsage.totalTokenCount,
          latency_ms: Math.round(intentEndTime - intentStartTime),
          status: "success",
        })
        .then(({ error }) => {
          if (error) console.error("⚠️ Intent Telemetry Error:", error.message);
        });
    }

    return userIntent;
  } catch (geminiError) {
    console.error("⚠️ Intent Detector Gemini Error, fallback ke handoff:", geminiError);
    return INTENT_FALLBACK;
  }
}
