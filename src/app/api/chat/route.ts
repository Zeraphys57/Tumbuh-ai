import { NextResponse } from "next/server";

import { getGeminiToolsConfig } from "@/app/agentic/agentic-tools";
import { checkAndDeductQuota } from "@/lib/quotaManager";
import { genAI } from "@/lib/gemini";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { detectIntent } from "@/services/intent-detector";
import { executeAgenticTools } from "@/services/agentic-executor";
import { runWebLeadExtraction } from "@/services/lead-extractor";

export const maxDuration = 60;

const AI_MODEL_MAIN = "gemini-2.5-flash";

// TODO: Migrasi ke Redis/Upstash — Map ini tidak persistent di Vercel Serverless
// (setiap cold start reset, tidak ter-share antar instance paralel)
const rateLimitMap = new Map<string, number>();
// TODO: setInterval tidak berjalan reliably di Vercel Serverless (stateless, no long-running process)
// Solusi: pindah ke Redis dengan TTL otomatis
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((timestamp, key) => {
    if (now - timestamp > 60000) rateLimitMap.delete(key);
  });
}, 60 * 1000);

// ============================================================================
// POST /api/chat
// ============================================================================
export async function POST(req: Request) {
  let aiStartTime = 0;
  let dbClientId: string | null = null;

  try {
    const body = await req.json();

    // ── 1. VALIDASI PLATFORM & INPUT ─────────────────────────────────────────
    const VALID_PLATFORMS = ["WEB", "WHATSAPP", "INSTAGRAM"];
    const rawSource = String(body.source || "WEB").toUpperCase();
    const platformName = VALID_PLATFORMS.includes(rawSource) ? rawSource : "WEB";

    const { message, clientId, history } = body;

    if (!message || !clientId)
      return NextResponse.json({ reply: "Sistem membutuhkan data yang lengkap." }, { status: 400 });
    if (typeof message !== "string" || message.trim().length === 0)
      return NextResponse.json({ reply: "Pesan tidak boleh kosong ya Kak 😊" }, { status: 400 });
    if (message.length > 2000)
      return NextResponse.json({ reply: "Wah, pesannya kepanjangan nih Kak. Bisa diringkas sedikit? 😊" }, { status: 400 });

    // ── 2. RATE LIMITING ─────────────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rateLimitKey = `${clientId}_${ip}`;
    const now = Date.now();
    const lastRequest = rateLimitMap.get(rateLimitKey);
    if (lastRequest && now - lastRequest < 2000) {
      return NextResponse.json({ reply: "Ketiknya pelan-pelan saja ya Kak... 🙏" }, { status: 429 });
    }
    rateLimitMap.set(rateLimitKey, now);

    // ── 3. PROMPT INJECTION GUARD ─────────────────────────────────────────────
    if (hasInjectionPattern(message)) {
      console.warn(`[SECURITY] Potensi prompt injection terdeteksi. ClientId: ${clientId}`);
      return NextResponse.json({
        reply: "Mohon maaf Kak, untuk pertanyaan spesifik, keluhan, atau hal ini agar lebih aman dan akurat Kakak akan saya sambungkan langsung dengan tim admin/CS kami ya. Boleh tinggalkan nomor WhatsApp Kakak agar segera kami hubungi? 🙏",
        isHandoff: true,
      });
    }

    // ── 4. AMBIL DATA KLIEN ───────────────────────────────────────────────────
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, system_prompt, features, is_active")
      .eq("slug", clientId)
      .single();

    if (clientError || !client) {
      console.error(`[CHAT API] Client tidak ditemukan. Slug: ${clientId}`);
      return NextResponse.json(
        { reply: "Sistem sedang memuat data atau asisten tidak tersedia. Silakan coba lagi nanti." },
        { status: 404 }
      );
    }
    if (client.is_active === false) {
      return NextResponse.json(
        { reply: "Mohon maaf, layanan asisten virtual untuk bisnis ini sedang ditangguhkan sementara waktu. 🙏" },
        { status: 403 }
      );
    }

    const clientData = client;
    dbClientId = clientData.id;

    // ── 5. INTENT DETECTION (SATPAM) ─────────────────────────────────────────
    const businessContext = clientData.system_prompt ? clientData.system_prompt.slice(0, 300) : "bisnis umum";
    const userIntent = await detectIntent(message, businessContext, dbClientId);

    // ── 6. HARD FALLBACK → HANDOFF KE MANUSIA ────────────────────────────────
    if (
      userIntent.requires_human === true ||
      userIntent.confidence < 60 ||
      ["komplain", "marah_emosi", "out_of_scope"].includes(userIntent.intent)
    ) {
      console.log(`⛔ [FALLBACK TRIGGERED] Eksekusi Handoff.`);
      const fallbackReply =
        "Mohon maaf Kak, untuk pertanyaan spesifik, keluhan, atau hal ini agar lebih aman dan akurat Kakak akan saya sambungkan langsung dengan tim admin/CS kami ya. Boleh tinggalkan nomor WhatsApp Kakak agar segera kami hubungi? 🙏";
      runWebLeadExtraction(clientData.id, message, fallbackReply, history || [], platformName).catch((e) =>
        console.error("⚠️ Extractor Error in Fallback:", e)
      );
      return NextResponse.json({ reply: fallbackReply, isHandoff: true });
    }

    // ── 7. QUOTA GATE ─────────────────────────────────────────────────────────
    const quotaResult = await checkAndDeductQuota(dbClientId!);
    if (!quotaResult.allowed) {
      return NextResponse.json(
        { reply: quotaResult.error, isQuotaExceeded: true },
        { status: quotaResult.status || 403 }
      );
    }

    // ── 8. ADDON DATA ─────────────────────────────────────────────────────────
    let addonText = "";
    let featuresObj: any = {};
    try {
      featuresObj = typeof clientData.features === "string" ? JSON.parse(clientData.features) : clientData.features || {};
    } catch (e) {
      console.warn("⚠️ Gagal parse features client:", e);
    }

    if (featuresObj?.has_addon === true) {
      const { data: addons } = await supabase
        .from("client_addons_data")
        .select("addon_type, content")
        .eq("client_id", clientData.id);
      if (addons && addons.length > 0) {
        addonText = `\n\n--- INFORMASI BISNIS TAMBAHAN (PENTING) ---\n`;
        addons.forEach((addon) => {
          addonText += `[DATA ${addon.addon_type.toUpperCase()}]:\n${addon.content}\n\n`;
        });
      }
    }

    // ── 9. RAG ENGINE ─────────────────────────────────────────────────────────
    let ragContextText = "";
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embedResult = await embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: message }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 1536,
      } as any);

      const queryVector = embedResult.embedding.values;
      const { data: matchedDocs, error: matchError } = await supabase.rpc("match_client_knowledge", {
        query_embedding: queryVector,
        match_threshold: 0.65,
        match_count: 3,
        p_client_id: clientData.id,
      });

      if (!matchError && matchedDocs && matchedDocs.length > 0) {
        ragContextText = `\n\n=== DOKUMEN REFERENSI DARI KNOWLEDGE BASE ===\n`;
        matchedDocs.forEach((doc: any) => {
          ragContextText += `[Sumber: ${doc.document_name}]:\n${doc.content}\n\n`;
        });
        ragContextText += `INSTRUKSI RAG KHUSUS: \n- JIKA pelanggan bertanya hal yang relevan dengan Dokumen Referensi di atas, WAJIB gunakan data dari dokumen tersebut untuk menjawab!\n- JIKA jawaban tidak ada di Dokumen Referensi dan Konteks Bisnis, ikuti Aturan Besi nomor 1 (Jangan mengarang jawaban).\n`;
      }
    } catch (ragErr) {
      console.error("RAG Search Engine Error:", ragErr);
    }

    // ── 10. MASTER PROMPT ─────────────────────────────────────────────────────
    const masterBasePrompt = `Kamu adalah Customer Success & Sales Representative profesional dari sebuah bisnis.
INTENT PELANGGAN SAAT INI: [${userIntent.intent.toUpperCase()}] -> Fokuslah memberikan jawaban yang relevan dengan intent ini secara singkat (Maksimal 2-3 kalimat).

=== INFORMASI PLATFORM ===
[PLATFORM: ${platformName}]
Kamu WAJIB mengikuti instruksi khusus untuk platform ini (terutama cara meminta nomor WhatsApp) seperti tertulis di KONTEKS BISNIS.

=== ATURAN BESI (HUKUM MUTLAK) ===
1. BATASAN PENGETAHUAN (ANTI-HALUSINASI):
- Kamu HANYA TAHU apa yang tertulis di bagian "KONTEKS BISNIS", "INFORMASI TAMBAHAN", dan "DOKUMEN REFERENSI".
- DILARANG MENGARANG JAWABAN. Jawab: "Mohon maaf kak, untuk detail tersebut saya harus cek dulu ke tim inti kami ya."

2. PROTOKOL ESKALASI:
- Jika pelanggan meminta bicara dengan manusia/admin/dokter, HENTIKAN USAHA MENJAWAB.
- Balas HANYA dengan kata persis ini: [OPER_MANUSIA]

3. GAYA BAHASA & FORMAT:
- Maksimal 2-3 kalimat. Singkat, padat, jelas.
- Gunakan 1 atau 2 emoji 😊.
- PISAHKAN dua kalimat yang idenya berbeda dengan ENTER GANDA.

=== KONTEKS BISNIS KLIEN ===
${clientData.system_prompt || "Bot sedang dalam tahap konfigurasi."}
${addonText}
${ragContextText}`;

    // ── 11. SETUP MODEL + AGENTIC TOOLS ──────────────────────────────────────
    const { data: enabledTools } = await supabase
      .from("client_agentic_tools")
      .select("tool_name")
      .eq("client_id", clientData.id)
      .eq("is_active", true);

    const finalTools = enabledTools?.map((t) => t.tool_name) || [];
    const geminiTools = getGeminiToolsConfig(finalTools);

    const modelOptions: any = { model: AI_MODEL_MAIN, systemInstruction: masterBasePrompt };
    if (geminiTools) modelOptions.tools = geminiTools;

    const model = genAI.getGenerativeModel(modelOptions);

    // ── 12. FILTER & MERGE HISTORY ────────────────────────────────────────────
    const MAX_HISTORY = 30;
    const MAX_MERGED_CHARS = 1500;
    let safeHistory: any[] = [];

    if (history && Array.isArray(history)) {
      const rawCleaned = history
        .filter((msg: any) => msg.content && msg.content.trim() !== "")
        .map((msg: any) => ({
          role: ["ai", "assistant", "model"].includes(msg.role) ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

      for (const msg of rawCleaned) {
        if (safeHistory.length === 0) {
          safeHistory.push(msg);
        } else {
          const lastMsg = safeHistory[safeHistory.length - 1];
          if (lastMsg.role === msg.role) {
            const merged = lastMsg.parts[0].text + "\n\n" + msg.parts[0].text;
            lastMsg.parts[0].text =
              merged.length > MAX_MERGED_CHARS
                ? "...[dipangkas]...\n\n" + merged.slice(-MAX_MERGED_CHARS)
                : merged;
          } else {
            safeHistory.push(msg);
          }
        }
      }
      safeHistory = safeHistory.slice(-MAX_HISTORY);
    }

    // ── 13. PANGGIL MASTER AI ─────────────────────────────────────────────────
    const chat = model.startChat({ history: safeHistory });
    aiStartTime = performance.now();

    const result = await chat.sendMessage(message);
    let response = result.response;
    let reply = "";

    // ── 14. EKSEKUSI AGENTIC TOOLS (JIKA ADA) ────────────────────────────────
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      try {
        ({ response, reply } = await executeAgenticTools(functionCalls, chat, clientData));
      } catch (err) {
        console.error("Tool Execution Error:", err);
        reply = "Maaf, sistem internal kami sedang gangguan saat mengecek data tersebut ya Kak. Mohon tunggu sebentar.";
      }
    } else {
      reply = response.text();
    }

    const latencyMs = Math.round(performance.now() - aiStartTime);

    // ── 15. CEK ESKALASI MANUAL ───────────────────────────────────────────────
    let isHandoff = false;
    if (reply.includes("[OPER_MANUSIA]")) {
      reply =
        "Mohon maaf atas ketidaknyamanannya 🙏.\n\nPertanyaan/keluhan ini membutuhkan bantuan lebih lanjut. Silakan tinggalkan Nama dan Nomor WhatsApp Anda, tim CS manusia kami akan segera menghubungi Anda kembali.";
      isHandoff = true;
    }

    // ── 16. USAGE LOG + LEAD EXTRACTION (BACKGROUND) ─────────────────────────
    const usage = response.usageMetadata;
    const logPromise = usage
      ? supabase
          .from("usage_logs")
          .insert({
            client_id: clientData.id,
            model_used: AI_MODEL_MAIN,
            tokens_input: usage.promptTokenCount,
            tokens_output: usage.candidatesTokenCount,
            total_tokens: usage.totalTokenCount,
            latency_ms: latencyMs,
            status: "success",
          })
          .then(({ error }) => {
            if (error) console.error("⚠️ Usage Log Insert Error:", error.message);
          })
      : Promise.resolve();

    const extractPromise = runWebLeadExtraction(clientData.id, message, reply, safeHistory, platformName);
    await Promise.all([extractPromise, logPromise]).catch((err) =>
      console.error("Web Extractor/Telemetry Error:", err)
    );

    return NextResponse.json({ reply, isHandoff });

  } catch (error: any) {
    console.error("Chat Error:", error.message);
    if (dbClientId && aiStartTime > 0) {
      // Fire-and-forget — jangan await agar error response tidak tertahan
      supabase.from("usage_logs").insert({
        client_id: dbClientId,
        model_used: AI_MODEL_MAIN,
        latency_ms: Math.round(performance.now() - aiStartTime),
        status: "error",
      }).then(({ error: logErr }) => {
        if (logErr) console.error("⚠️ Error Log Insert Failed:", logErr.message);
      });
    }
    return NextResponse.json({ reply: "Duh, sepertinya server sedang sibuk. Coba sebentar lagi ya!" }, { status: 500 });
  }
}

// ============================================================================
// 🛡️ PROMPT INJECTION PATTERN DETECTOR
// ============================================================================
function hasInjectionPattern(text: string): boolean {
  // Hanya pattern yang benar-benar spesifik untuk serangan injection.
  // Pattern seperti /kamu sekarang adalah/, /you are now/, /system prompt/
  // dihapus karena terlalu broad dan menyebabkan false positive pada
  // percakapan normal UMKM (contoh: "kamu sekarang adalah pilihan terbaik saya").
  const patterns = [
    /ignore (all |previous |prior )?instructions?/gi,
    /abaikan (semua |instruksi )?sebelumnya/gi,
    /new persona/gi,
    /pretend (you are|to be)/gi,
    /act as (a |an )?(different|new|another)/gi,
    /jailbreak/gi,
    /\[system\]/gi,
    /<system>/gi,
  ];
  return patterns.some((p) => p.test(text));
}
