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
const PHONE_ID_REGEX = /^\d{1,20}$/;
const SENDER_PHONE_REGEX = /^\d{8,15}$/;

// ============================================================================
// FUNGSI GET: VERIFIKASI META — ZONA MERAH, JANGAN DIUBAH
// ============================================================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // FIX 4: Hapus fallback hardcode — jika env tidak di-set, langsung 403
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!VERIFY_TOKEN) {
    console.error("❌ [CONFIG] WHATSAPP_VERIFY_TOKEN tidak ditemukan di env!");
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Verified by Meta!");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ============================================================================
// FUNGSI POST: THIN CONTROLLER WA WEBHOOK
// ============================================================================
export async function POST(request: Request) {
  let aiStartTime = 0;
  let dbClientId: string | null = null;

  // ── 0. META SIGNATURE GUARD (CRITICAL) ────────────────────────────────────
  // Raw body harus dibaca sebelum JSON.parse agar HMAC bisa dihitung
  const rawBody = await request.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      console.error("❌ [SECURITY] Header x-hub-signature-256 tidak ada!");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // FIX 1: Bungkus komparasi crypto dalam try-catch — Buffer.from bisa throw pada input non-UTF8
    try {
      const expectedSig = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSig);
      const isValid = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
      if (!isValid) {
        console.error("❌ [SECURITY] Tanda tangan Meta TIDAK COCOK! Kemungkinan request palsu/replay attack.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch (sigErr) {
      console.error("❌ [SECURITY] Error saat parsing signature buffer:", sigErr);
      return NextResponse.json({ error: "Invalid signature payload" }, { status: 401 });
    }
  } else {
    // FIX 1 (MEDIUM 6): Warn jelas jika env var tidak di-set
    console.warn("⚠️ [SECURITY] WHATSAPP_APP_SECRET tidak ditemukan di env! Signature verification dilewati.");
  }

  try {
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;
      const businessPhoneId = value?.metadata?.phone_number_id;

      // FIX 2: Abaikan payload tanpa pesan (status receipts, dll) — lebih aman dari cek statuses
      // karena Meta bisa mengirim statuses dan messages dalam satu batch
      if (!value?.messages || value.messages.length === 0) {
        return NextResponse.json({ status: "no_message" }, { status: 200 });
      }

      // ── VALIDASI PHONE ID ───────────────────────────────────────────────────
      if (!businessPhoneId || !PHONE_ID_REGEX.test(businessPhoneId)) {
        console.error("❌ [SECURITY] businessPhoneId tidak valid:", businessPhoneId);
        return NextResponse.json({ status: "ignored" }, { status: 200 });
      }

      if (messages && messages.length > 0 && messages[0].type === "text") {
        const message = messages[0];
        const messageId = message.id;

        // FIX 5: Validasi format senderPhone — strip non-digits, cek panjang 8-15
        const rawSenderPhone: string = message.from;
        const senderPhone = rawSenderPhone.replace(/\D/g, "");
        if (!SENDER_PHONE_REGEX.test(senderPhone)) {
          console.warn(`[SECURITY WA] Format senderPhone tidak valid, diabaikan: "${rawSenderPhone}"`);
          return NextResponse.json({ status: "ignored" }, { status: 200 });
        }

        // ── SANITASI INPUT ─────────────────────────────────────────────────────
        const incomingText = (message.text.body as string).slice(0, MAX_INCOMING_TEXT);
        if (!incomingText.trim()) return NextResponse.json({ status: "ignored_empty" }, { status: 200 });

        const rawUserName: string = value.contacts?.[0]?.profile?.name || "Pelanggan";
        const userName = rawUserName.replace(/[<>"'`;{}\\/\[\]()|$#@^*!?~]/g, "").slice(0, 50).trim() || "Pelanggan";

        // ── 1. CARI KLIEN ────────────────────────────────────────────────────
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("id, slug, name, whatsapp_access_token, system_prompt, features, is_active")
          .eq("whatsapp_phone_number_id", businessPhoneId)
          .single();

        if (clientError || !client) {
          console.error("❌ Klien tidak ditemukan untuk Phone ID:", businessPhoneId);
          return NextResponse.json({ error: "Client Not Found" }, { status: 404 });
        }

        dbClientId = client.id;

        // ── 2. KILL SWITCH ────────────────────────────────────────────────────
        if (client.is_active === false) {
          console.log(`⛔ WA Ditolak: Klien ${client.name} sedang di-suspend.`);
          return NextResponse.json({ status: "suspended" }, { status: 200 });
        }

        // ── 3. VALIDASI TOKEN WA ──────────────────────────────────────────────
        if (!client.whatsapp_access_token || client.whatsapp_access_token.length < MIN_TOKEN_LENGTH) {
          console.error(`❌ [SECURITY] Token WA tidak valid atau terlalu pendek untuk klien: ${client.name}`);
          return NextResponse.json({ status: "token_invalid" }, { status: 200 });
        }

        // ── 4. CEK SAKLAR AI (Admin Takeover) ─────────────────────────────────
        const { data: lead } = await supabase
          .from("leads")
          .select("id, is_bot_active")
          .eq("client_id", client.id)
          .eq("customer_phone", senderPhone)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lead && lead.is_bot_active === false) {
          console.log(`⏸️ AI Paused: Pesan dari ${userName} diabaikan bot.`);
          await supabase.from("chat_logs").insert({
            client_id: client.slug,
            customer_phone: senderPhone,
            message: incomingText,
            response: "",
            replied_by: "customer",
            platform: "whatsapp",
          });
          return NextResponse.json({ status: "skipped_by_human_takeover" }, { status: 200 });
        }

        // ── 5. CENTANG BIRU INSTAN ────────────────────────────────────────────
        markMessageAsRead(businessPhoneId, client.whatsapp_access_token, messageId).catch(console.error);

        // ── 6. PROMPT INJECTION GUARD ─────────────────────────────────────────
        if (hasInjectionPattern(incomingText)) {
          console.warn(`[SECURITY WA] Potensi prompt injection dari ${senderPhone}`);
          const injectionFallback = "Mohon maaf Kak, untuk pertanyaan spesifik, keluhan, atau hal ini agar lebih aman dan akurat Kakak akan saya sambungkan langsung dengan tim admin/CS kami ya. Mohon ditunggu sebentar 🙏";
          await sendWhatsAppMessage(businessPhoneId, client.whatsapp_access_token, senderPhone, injectionFallback);
          return NextResponse.json({ status: "success_handoff" }, { status: 200 });
        }

        // ── 7. INTENT DETECTION (SATPAM) ──────────────────────────────────────
        const businessContext = client.system_prompt ? client.system_prompt.slice(0, 300) : "bisnis umum";
        const userIntent = await detectIntent(incomingText, businessContext, dbClientId);

        // ── 8. HARD FALLBACK → HANDOFF KE MANUSIA ─────────────────────────────
        if (
          userIntent.requires_human === true ||
          userIntent.confidence < 60 ||
          ["komplain", "marah_emosi", "out_of_scope"].includes(userIntent.intent)
        ) {
          console.log(`⛔ [FALLBACK WA] Eksekusi Handoff untuk ${senderPhone}`);
          if (lead) await supabase.from("leads").update({ is_bot_active: false }).eq("id", lead.id);

          const fallbackReply = "Mohon maaf Kak, untuk pertanyaan spesifik, keluhan, atau hal ini agar lebih aman dan akurat Kakak akan saya sambungkan langsung dengan tim admin/CS kami ya. Mohon ditunggu sebentar 🙏";

          await supabase.from("chat_logs").insert({
            client_id: client.slug, customer_phone: senderPhone, message: incomingText,
            response: fallbackReply, replied_by: "ai", platform: "whatsapp",
          });
          await sendWhatsAppMessage(businessPhoneId, client.whatsapp_access_token, senderPhone, formatForWhatsApp(fallbackReply));
          runWebLeadExtraction(client.id, incomingText, fallbackReply, [], "whatsapp")
            .catch(e => console.error("⚠️ Extractor Error in Fallback WA:", e));

          return NextResponse.json({ status: "success_handoff" }, { status: 200 });
        }

        // ── 9. QUOTA GATE ──────────────────────────────────────────────────────
        const quotaResult = await checkAndDeductQuota(dbClientId);
        if (!quotaResult.allowed) {
          console.log(`⚠️ WA Ditolak: Kuota habis untuk klien ${client.name}`);
          return NextResponse.json({ status: "over_limit" }, { status: 200 });
        }

        // ── 10. ADDON DATA ──────────────────────────────────────────────────────
        let addonText = "";
        let featuresObj: any = {};
        try {
          featuresObj = typeof client.features === "string" ? JSON.parse(client.features) : client.features || {};
        } catch (e) {
          console.warn("⚠️ Gagal parse features client WA:", e);
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

        // ── 11. RAG ENGINE ─────────────────────────────────────────────────────
        let ragContextText = "";
        try {
          const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
          const embedResult = await embeddingModel.embedContent({
            content: { role: "user", parts: [{ text: incomingText }] },
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
          console.error("RAG Search Engine Error WA:", ragErr);
        }

        // ── 12. MASTER PROMPT ──────────────────────────────────────────────────
        const masterBasePrompt = `Kamu adalah Customer Success & Sales Representative profesional dari sebuah bisnis.
Pelanggan yang sedang chat denganmu di WhatsApp bernama: ${userName}.

INTENT PELANGGAN SAAT INI: [${userIntent.intent.toUpperCase()}] -> Fokuslah memberikan jawaban yang relevan dengan intent ini secara singkat (Maksimal 2-3 kalimat).

=== ATURAN BESI (HUKUM MUTLAK) ===
1. BATASAN PENGETAHUAN (ANTI-HALUSINASI):
- Kamu HANYA TAHU apa yang tertulis di bagian "KONTEKS BISNIS", "INFORMASI TAMBAHAN", dan "DOKUMEN REFERENSI".
- DILARANG MENGARANG JAWABAN. Jawab: "Mohon maaf kak, untuk detail tersebut saya harus cek dulu ke tim inti kami ya."

2. PROTOKOL ESKALASI:
- Jika pelanggan meminta bicara dengan manusia/admin/CS/dokter, HENTIKAN USAHA MENJAWAB.
- Balas HANYA dengan kata persis ini: [OPER_MANUSIA]

3. GAYA BAHASA & FORMAT:
- Maksimal 2-3 kalimat. Singkat, padat, jelas.
- Gunakan 1 atau 2 emoji 😊.
- PISAHKAN dua kalimat yang idenya berbeda dengan ENTER GANDA.

4. PROTOKOL CLOSING (LEAD CAPTURE):
- Pancing pelanggan untuk memberikan Nama & Nomor WhatsApp mereka.

=== KONTEKS BISNIS KLIEN ===
${client.system_prompt || "Bot sedang dalam tahap konfigurasi."}
${addonText}
${ragContextText}`;

        // ── 13. SETUP MODEL + AGENTIC TOOLS ───────────────────────────────────
        const { data: enabledTools } = await supabase
          .from("client_agentic_tools").select("tool_name")
          .eq("client_id", client.id).eq("is_active", true);

        const finalTools = enabledTools?.map((t) => t.tool_name) || [];
        const geminiTools = getGeminiToolsConfig(finalTools);
        const modelOptions: any = { model: AI_MODEL_MAIN, systemInstruction: masterBasePrompt };
        if (geminiTools) modelOptions.tools = geminiTools;

        const model = genAI.getGenerativeModel(modelOptions);

        // ── 14. AMBIL HISTORY DARI CHAT LOGS ──────────────────────────────────
        const { data: chatHistory } = await supabase
          .from("chat_logs").select("message, response")
          .eq("client_id", client.slug).eq("customer_phone", senderPhone)
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

        // ── 15. PANGGIL MASTER AI ──────────────────────────────────────────────
        const chat = model.startChat({ history: formattedHistory });
        aiStartTime = performance.now();

        const result = await chat.sendMessage(incomingText);
        let response = result.response;
        let replyText = "";

        // ── 16. EKSEKUSI AGENTIC TOOLS (JIKA ADA) ─────────────────────────────
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          try {
            ({ response, reply: replyText } = await executeAgenticTools(functionCalls, chat, client));
          } catch (err) {
            console.error("Tool Execution Error WA:", err);
            replyText = "Maaf, sistem internal kami sedang gangguan saat mengecek data tersebut ya Kak. Mohon tunggu sebentar.";
          }
        } else {
          replyText = response.text();
        }

        const latencyMs = Math.round(performance.now() - aiStartTime);

        // ── 17. CEK ESKALASI MANUAL ────────────────────────────────────────────
        if (replyText.includes("[OPER_MANUSIA]")) {
          if (lead) await supabase.from("leads").update({ is_bot_active: false }).eq("id", lead.id);
          replyText = "Mohon maaf atas ketidaknyamanannya 🙏.\n\nKeluhan/pertanyaan ini akan segera dibantu langsung oleh tim CS manusia kami sesaat lagi ya. Mohon ditunggu.";
          console.log("🚨 Human Handoff Triggered WA untuk:", senderPhone);
        }

        // ── 18. FORMAT REPLY ───────────────────────────────────────────────────
        const formattedReply = formatForWhatsApp(replyText);
        const MAX_BUBBLES = 4;
        const splitMessages = formattedReply.split(/\n\s*\n/).filter((msg) => msg.trim() !== "").slice(0, MAX_BUBBLES);

        // ── 19. LOGGING FIRE-AND-FORGET SEBELUM KIRIM (FIX 3: ANTI-TIMEOUT) ────
        // Dipindah ke SEBELUM loop agar data tidak hilang jika Vercel timeout di tengah bubble
        const usage = response.usageMetadata;
        supabase.from("chat_logs").insert({
          client_id: client.slug, customer_phone: senderPhone,
          message: incomingText, response: formattedReply, replied_by: "ai", platform: "whatsapp",
        }).then(({ error }) => { if (error) console.error("⚠️ Chat Log WA Insert Error:", error.message); });

        if (usage) {
          supabase.from("usage_logs").insert({
            client_id: client.id, model_used: AI_MODEL_MAIN,
            tokens_input: usage.promptTokenCount,
            tokens_output: usage.candidatesTokenCount,
            total_tokens: usage.totalTokenCount,
            latency_ms: latencyMs, status: "success",
          }).then(({ error }) => { if (error) console.error("⚠️ Usage Log WA Insert Error:", error.message); });
        }

        runWebLeadExtraction(client.id, incomingText, formattedReply, formattedHistory, "whatsapp")
          .catch((err) => console.error("⚠️ Extractor Error WA:", err));

        // ── 20. KIRIM PESAN DENGAN JEDA ANTAR BUBBLE ──────────────────────────
        for (let i = 0; i < splitMessages.length; i++) {
          await sendWhatsAppMessage(businessPhoneId, client.whatsapp_access_token, senderPhone, splitMessages[i].trim());
          if (i < splitMessages.length - 1) {
            const delay = Math.min(Math.max(splitMessages[i].length * 10, 200), 600);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });

  } catch (error) {
    console.error("❌ Fatal Webhook Error WA:", error);
    if (dbClientId && aiStartTime > 0) {
      // Fire-and-forget — jangan await agar Meta tidak timeout
      supabase.from("usage_logs").insert({
        client_id: dbClientId, model_used: AI_MODEL_MAIN,
        latency_ms: Math.round(performance.now() - aiStartTime), status: "error",
      }).then(({ error: logErr }) => { if (logErr) console.error("⚠️ Error Log WA Insert Failed:", logErr.message); });
    }
    return NextResponse.json({ status: "error" }, { status: 200 }); // Tetap 200 agar Meta tidak retry
  }
}

// ============================================================================
// 🛡️ PROMPT INJECTION PATTERN DETECTOR
// ============================================================================
function hasInjectionPattern(text: string): boolean {
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

// ============================================================================
// FUNGSI CENTANG BIRU WA — ZONA MERAH, JANGAN DIUBAH
// ============================================================================
async function markMessageAsRead(phoneId: string, waToken: string, messageId: string) {
  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
    });
    if (!response.ok) console.error("❌ Gagal centang biru:", await response.json());
  } catch (error) {
    console.error("❌ Request centang biru gagal:", error);
  }
}

// ============================================================================
// FUNGSI PENGIRIMAN WA — ZONA MERAH, JANGAN DIUBAH
// ============================================================================
async function sendWhatsAppMessage(phoneId: string, waToken: string, to: string, messageBody: string) {
  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { preview_url: false, body: messageBody },
      }),
    });
    if (!response.ok) console.error("❌ Gagal mengirim pesan WA:", await response.json());
    else console.log(`✅ Balasan AI terkirim ke ${to}`);
  } catch (error) {
    console.error("❌ Koneksi ke Meta API gagal:", error);
  }
}

// ============================================================================
// FUNGSI FORMAT MARKDOWN → WHATSAPP — ZONA MERAH, JANGAN DIUBAH
// ============================================================================
function formatForWhatsApp(text: string) {
  if (!text) return "";
  let formatted = text;
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "*$1*");
  formatted = formatted.replace(/^(#{1,4})\s+(.*$)/gim, "*$2*");
  return formatted;
}
