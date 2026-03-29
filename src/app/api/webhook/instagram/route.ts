import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

import { getGeminiToolsConfig } from "@/app/agentic/agentic-tools";
import { genAI } from "@/lib/gemini";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { checkAndDeductQuota } from "@/lib/quotaManager";
import { detectIntent } from "@/services/intent-detector";
import { executeAgenticTools } from "@/services/agentic-executor";
import { runWebLeadExtraction } from "@/services/lead-extractor";

export const maxDuration = 60;

const AI_MODEL_MAIN = "gemini-2.5-flash";
const MAX_INCOMING_TEXT = 2000;
const MIN_TOKEN_LENGTH = 20;
const IG_ACCOUNT_ID_REGEX = /^\d{1,20}$/;

// ============================================================================
// FUNGSI GET: VERIFIKASI META (INSTAGRAM) — ZONA MERAH, JANGAN DIUBAH
// ============================================================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  if (!VERIFY_TOKEN) {
    console.error("❌ [CONFIG] META_VERIFY_TOKEN tidak ditemukan di env!");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ============================================================================
// FUNGSI POST: THIN CONTROLLER IG WEBHOOK
// ============================================================================
export async function POST(request: Request) {
  let aiStartTime = 0;
  let dbClientId: string | null = null;

  // ── 0. META SIGNATURE GUARD ────────────────────────────────────────────────
  const rawBody = await request.text();
  const appSecret = process.env.META_APP_SECRET;

  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      console.error("❌ [SECURITY IG] Header x-hub-signature-256 tidak ada!");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const expectedSig = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSig);
      const isValid = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
      if (!isValid) {
        console.error("❌ [SECURITY IG] Tanda tangan Meta TIDAK COCOK! Kemungkinan request palsu.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch (sigErr) {
      console.error("❌ [SECURITY IG] Error parsing signature buffer:", sigErr);
      return NextResponse.json({ error: "Invalid signature payload" }, { status: 401 });
    }
  } else {
    console.warn("⚠️ [SECURITY IG] META_APP_SECRET tidak ditemukan di env! Signature verification dilewati.");
  }

  try {
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body.object !== "instagram") {
      return NextResponse.json({ status: "not_instagram" }, { status: 200 });
    }

    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    // Anti-echo + guard payload tanpa pesan
    if (!messaging?.message || messaging.message.is_echo) {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const igAccountId: string = entry.id;
    const customerIgId: string = messaging.sender.id;

    // Validasi format igAccountId sebelum masuk ke URL Meta API
    if (!igAccountId || !IG_ACCOUNT_ID_REGEX.test(igAccountId)) {
      console.error("❌ [SECURITY] igAccountId tidak valid:", igAccountId);
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    // ── SANITASI INPUT ─────────────────────────────────────────────────────────
    const messageText = (messaging.message.text || "").slice(0, MAX_INCOMING_TEXT);
    if (!messageText.trim()) return NextResponse.json({ status: "ignored_empty" }, { status: 200 });

    // ── 1. CARI KLIEN ────────────────────────────────────────────────────────
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, slug, business_name, instagram_access_token, system_prompt, features, is_active")
      .eq("instagram_account_id", igAccountId)
      .single();

    if (clientError || !client) {
      console.log("❌ Klien IG tidak ditemukan untuk account ID:", igAccountId);
      return NextResponse.json({ status: "success" }, { status: 200 });
    }

    dbClientId = client.id;

    // ── 2. KILL SWITCH ────────────────────────────────────────────────────────
    if (client.is_active === false) {
      console.warn(`⛔ Klien ${client.slug} sedang di-suspend.`);
      return NextResponse.json({ status: "suspended" }, { status: 200 });
    }

    // ── 3. VALIDASI TOKEN IG ──────────────────────────────────────────────────
    if (!client.instagram_access_token || client.instagram_access_token.length < MIN_TOKEN_LENGTH) {
      console.error(`❌ [SECURITY] Token IG tidak valid atau terlalu pendek untuk klien: ${client.slug}`);
      return NextResponse.json({ status: "token_invalid" }, { status: 200 });
    }

    // ── 4. CEK SAKLAR AI (Admin Takeover) ─────────────────────────────────────
    const { data: lead } = await supabase
      .from("leads")
      .select("id, is_bot_active")
      .eq("client_id", client.id)
      .eq("customer_phone", customerIgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lead && lead.is_bot_active === false) {
      console.log(`⏸️ AI Paused: Pesan IG dari ${customerIgId} diabaikan bot.`);
      await supabase.from("chat_logs").insert({
        client_id: client.slug, customer_phone: customerIgId,
        message: messageText, platform: "instagram",
        response: "", replied_by: "customer",
      });
      return NextResponse.json({ status: "skipped_by_human_takeover" }, { status: 200 });
    }

    // ── 5. INTENT DETECTION (SATPAM) ──────────────────────────────────────────
    const businessContext = client.system_prompt ? client.system_prompt.slice(0, 300) : "bisnis umum";
    const userIntent = await detectIntent(messageText, businessContext, dbClientId);

    // ── 6. HARD FALLBACK → HANDOFF KE MANUSIA ─────────────────────────────────
    if (
      userIntent.requires_human === true ||
      userIntent.confidence < 60 ||
      ["komplain", "marah_emosi", "out_of_scope"].includes(userIntent.intent)
    ) {
      console.log(`⛔ [FALLBACK IG] Handoff untuk ${customerIgId}`);
      if (lead) await supabase.from("leads").update({ is_bot_active: false }).eq("id", lead.id);

      const fallbackReply = "Mohon maaf kak, untuk pertanyaan ini Kakak akan saya sambungkan dengan tim admin kami ya. Mohon ditunggu sebentar 🙏";
      await supabase.from("chat_logs").insert({
        client_id: client.slug, customer_phone: customerIgId,
        message: messageText, response: fallbackReply, replied_by: "ai", platform: "instagram",
      });
      await sendIgMessage(igAccountId, client.instagram_access_token, customerIgId, fallbackReply);
      runWebLeadExtraction(client.id, messageText, fallbackReply, [], "instagram")
        .catch(e => console.error("⚠️ Extractor Error in Fallback IG:", e));

      return NextResponse.json({ status: "success_handoff" }, { status: 200 });
    }

    // ── 7. QUOTA GATE ──────────────────────────────────────────────────────────
    const quotaResult = await checkAndDeductQuota(dbClientId);
    if (!quotaResult.allowed) {
      console.log(`⚠️ IG Ditolak: Kuota habis untuk klien ${client.slug}`);
      return NextResponse.json({ status: "over_limit" }, { status: 200 });
    }

    // ── 8. ADDON DATA ──────────────────────────────────────────────────────────
    let addonText = "";
    let featuresObj: any = {};
    try {
      featuresObj = typeof client.features === "string" ? JSON.parse(client.features) : client.features || {};
    } catch (e) {
      console.warn("⚠️ Gagal parse features client IG:", e);
    }

    if (featuresObj?.has_addon === true) {
      const { data: addons } = await supabase
        .from("client_addons_data").select("addon_type, content").eq("client_id", client.id);
      if (addons && addons.length > 0) {
        addonText = `\n\n--- INFORMASI BISNIS TAMBAHAN (PENTING) ---\n`;
        addons.forEach((addon) => {
          addonText += `[DATA ${addon.addon_type.toUpperCase()}]:\n${addon.content}\n\n`;
        });
      }
    }

    // ── 9. RAG ENGINE ──────────────────────────────────────────────────────────
    let ragContextText = "";
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embedResult = await embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: messageText }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 1536,
      } as any);

      const queryVector = embedResult.embedding.values;
      const { data: matchedDocs, error: matchError } = await supabase.rpc("match_client_knowledge", {
        query_embedding: queryVector, match_threshold: 0.65, match_count: 3, p_client_id: client.id,
      });

      if (!matchError && matchedDocs && matchedDocs.length > 0) {
        ragContextText = `\n\n=== DOKUMEN REFERENSI DARI KNOWLEDGE BASE ===\n`;
        matchedDocs.forEach((doc: any) => {
          ragContextText += `[Sumber: ${doc.document_name}]:\n${doc.content}\n\n`;
        });
        ragContextText += `INSTRUKSI RAG KHUSUS: \n- JIKA pelanggan bertanya hal yang relevan dengan Dokumen Referensi di atas, WAJIB gunakan data dari dokumen tersebut untuk menjawab!\n- JIKA jawaban tidak ada di Dokumen Referensi dan Konteks Bisnis, ikuti Aturan Besi nomor 1 (Jangan mengarang jawaban).\n`;
      }
    } catch (ragErr) {
      console.error("RAG Search Engine Error IG:", ragErr);
    }

    // ── 10. MASTER PROMPT ──────────────────────────────────────────────────────
    const masterBasePrompt = `Kamu adalah Customer Success & Sales Representative profesional dari bisnis: ${client.business_name}.

INTENT PELANGGAN SAAT INI: [${userIntent.intent.toUpperCase()}] -> Berikan jawaban relevan dan singkat.

=== ATURAN BESI (HUKUM MUTLAK) ===
1. BATASAN PENGETAHUAN (ANTI-HALUSINASI):
- Kamu HANYA TAHU apa yang tertulis di "KONTEKS BISNIS KLIEN", "INFORMASI BISNIS TAMBAHAN", dan "DOKUMEN REFERENSI".
- DILARANG MENGARANG JAWABAN. Jawab: "Mohon maaf kak, untuk detail tersebut saya harus cek dulu ke tim inti kami ya."

2. PROTOKOL ESKALASI:
- Jika pelanggan marah, komplain keras, atau minta bicara manusia/admin/CS, HENTIKAN USAHA MENJAWAB.
- Balas HANYA dengan kata persis ini: [OPER_MANUSIA]

3. GAYA BAHASA (INSTAGRAM DM NATIVE):
- Maksimal 1-3 kalimat. DM IG harus terlihat kasual dan singkat.
- Gunakan 1 atau 2 emoji yang relevan 😊.
- Jangan gunakan format tebal (**) atau bullet point kaku.

4. PROTOKOL CLOSING (LEAD CAPTURE):
- Pancing pelanggan untuk memberikan Nomor WhatsApp mereka agar tim admin bisa follow up.

=== KONTEKS BISNIS KLIEN ===
${client.system_prompt || "Sapa pelanggan dengan ramah."}
${addonText}
${ragContextText}`;

    // ── 11. SETUP MODEL + AGENTIC TOOLS ───────────────────────────────────────
    const { data: enabledTools } = await supabase
      .from("client_agentic_tools").select("tool_name")
      .eq("client_id", client.id).eq("is_active", true);

    const finalTools = enabledTools?.map((t) => t.tool_name) || [];
    const geminiTools = getGeminiToolsConfig(finalTools);
    const modelOptions: any = { model: AI_MODEL_MAIN, systemInstruction: masterBasePrompt };
    if (geminiTools) modelOptions.tools = geminiTools;

    const model = genAI.getGenerativeModel(modelOptions);

    // ── 12. AMBIL HISTORY DARI CHAT LOGS ──────────────────────────────────────
    const { data: chatHistory } = await supabase
      .from("chat_logs").select("message, response")
      .eq("client_id", client.slug).eq("customer_phone", customerIgId)
      .eq("platform", "instagram")
      .order("created_at", { ascending: false }).limit(15);

    const formattedHistory: any[] = [];
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.reverse().forEach((log) => {
        if (log.message?.trim() && log.response?.trim()) {
          formattedHistory.push({ role: "user", parts: [{ text: log.message.slice(0, 1000) }] });
          formattedHistory.push({ role: "model", parts: [{ text: log.response.slice(0, 1000) }] });
        }
      });
    }

    // ── 13. PANGGIL MASTER AI ──────────────────────────────────────────────────
    const chat = model.startChat({ history: formattedHistory });
    aiStartTime = performance.now();
    const result = await chat.sendMessage(messageText);
    let response = result.response;
    let replyText = "";

    // ── 14. EKSEKUSI AGENTIC TOOLS (JIKA ADA) ─────────────────────────────────
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      try {
        ({ response, reply: replyText } = await executeAgenticTools(functionCalls, chat, client));
      } catch (err) {
        console.error("Tool Execution Error IG:", err);
        replyText = "Maaf kak, sistem kami sedang gangguan saat mengecek data tersebut. Coba sebentar lagi ya 🙏";
      }
    } else {
      replyText = response.text();
    }

    const latencyMs = Math.round(performance.now() - aiStartTime);

    // ── 15. CEK ESKALASI MANUAL ────────────────────────────────────────────────
    if (replyText.includes("[OPER_MANUSIA]")) {
      if (lead) await supabase.from("leads").update({ is_bot_active: false }).eq("id", lead.id);
      replyText = "Mohon maaf atas ketidaknyamanannya 🙏. Keluhan/pertanyaan ini akan segera dibantu langsung oleh admin kami via DM ya. Mohon ditunggu.";
      console.log("🚨 Human Handoff IG Triggered untuk:", customerIgId);
    }

    // ── 16. LOGGING + EXTRACTION FIRE-AND-FORGET (SEBELUM KIRIM - ANTI-TIMEOUT)
    const usage = response.usageMetadata;
    supabase.from("chat_logs").insert({
      client_id: client.slug, customer_phone: customerIgId,
      message: messageText, response: replyText, replied_by: "ai", platform: "instagram",
    }).then(({ error }) => { if (error) console.error("⚠️ Chat Log IG Insert Error:", error.message); });

    if (usage) {
      supabase.from("usage_logs").insert({
        client_id: client.id, model_used: AI_MODEL_MAIN,
        tokens_input: usage.promptTokenCount,
        tokens_output: usage.candidatesTokenCount,
        total_tokens: usage.totalTokenCount,
        latency_ms: latencyMs, status: "success",
      }).then(({ error }) => { if (error) console.error("⚠️ Usage Log IG Insert Error:", error.message); });
    }

    runWebLeadExtraction(client.id, messageText, replyText, formattedHistory, "instagram")
      .catch((err) => console.error("⚠️ Extractor Error IG:", err));

    // ── 17. KIRIM DM IG — ZONA MERAH, JANGAN DIUBAH FORMAT JSON-NYA ───────────
    await sendIgMessage(igAccountId, client.instagram_access_token, customerIgId, replyText);

    return NextResponse.json({ status: "success" }, { status: 200 });

  } catch (error) {
    console.error("❌ Fatal Error IG Webhook:", error);
    if (dbClientId && aiStartTime > 0) {
      // Fire-and-forget — jangan await agar Meta tidak timeout
      supabase.from("usage_logs").insert({
        client_id: dbClientId, model_used: AI_MODEL_MAIN,
        latency_ms: Math.round(performance.now() - aiStartTime), status: "error",
      }).then(({ error: logErr }) => { if (logErr) console.error("⚠️ Error Log IG Insert Failed:", logErr.message); });
    }
    return NextResponse.json({ status: "error" }, { status: 200 }); // Tetap 200 agar Meta tidak retry
  }
}

// ============================================================================
// FUNGSI KIRIM DM INSTAGRAM (SULTAN UPGRADE: AUTO-RETRY) — ZONA MERAH
// ============================================================================
async function sendIgMessage(igAccountId: string, accessToken: string, recipientId: string, text: string, retries = 2) {
  const url = `https://graph.facebook.com/v18.0/${igAccountId}/messages`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ [Attempt ${attempt}] Gagal Meta API (IG):`, JSON.stringify(errorData));
        
        if (attempt === retries) throw new Error("Max retries reached");
        await new Promise(res => setTimeout(res, 1000 * attempt)); // Jeda eksponensial
        continue;
      }

      console.log(`✅ DM IG terkirim ke ${recipientId}`);
      return; // Berhasil, keluar dari loop
    } catch (error) {
      if (attempt === retries) {
        console.error(`💥 IG FATAL FAIL setelah ${retries} percobaan ke ${recipientId}:`, error);
      }
    }
  }
}
