import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Inisialisasi Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============================================================================
// FUNGSI GET: VERIFIKASI META (INSTAGRAM)
// ============================================================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ============================================================================
// FUNGSI POST: ENGINE UTAMA INSTAGRAM
// ============================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object !== "instagram") {
      return NextResponse.json({ error: "Not an IG event" }, { status: 404 });
    }

    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (messaging && messaging.message && !messaging.message.is_echo) {
      const igAccountId = entry.id; 
      const customerIgId = messaging.sender.id; 
      const messageText = messaging.message.text;

      console.log(`📩 Pesan IG masuk dari ${customerIgId}: ${messageText}`);

      // --------------------------------------------------------------------
      // 1. CARI KLIEN DI DATABASE
      // --------------------------------------------------------------------
      // [FIX 1]: Tarik juga is_active dan monthly_limit untuk Gembok Bisnis
      const { data: client } = await supabase
        .from("clients")
        .select("id, slug, business_name, instagram_access_token, system_prompt, features, is_active, monthly_limit")
        .eq("instagram_account_id", igAccountId)
        .single();

      if (!client) {
        console.log("Klien IG tidak ditemukan di database.");
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // ====================================================================
      // [FIX 2 DARI PAK CLAUDE]: GEMBOK BISNIS (Kill Switch & Rate Limit)
      // ====================================================================
      if (client.is_active === false) {
        console.warn(`🛑 Klien ${client.slug} sedang di-suspend/nonaktif.`);
        return NextResponse.json({ status: "suspended" }, { status: 200 });
      }

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabase
        .from("usage_logs")
        .select('*', { count: 'exact', head: true })
        .eq("client_id", client.id)
        .gte("created_at", startOfMonth);

      if (count !== null && client.monthly_limit && count >= client.monthly_limit) {
        console.warn(`⚠️ Klien ${client.slug} sudah mencapai limit bulanan (${client.monthly_limit}).`);
        return NextResponse.json({ status: "over_limit" }, { status: 200 });
      }

      // --------------------------------------------------------------------
      // 2. CEK SAKLAR AI & DATA LEAD
      // --------------------------------------------------------------------
      // [FIX 3]: Tarik 'full_chat' untuk keperluan Append di Extractor nanti
      let { data: lead } = await supabase
        .from("leads")
        .select("id, is_bot_active, created_at, full_chat") 
        .eq("client_id", client.id)
        .eq("customer_phone", customerIgId) 
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lead && lead.is_bot_active === false) {
        console.log(`⏸️ AI Paused: Pesan IG dari ${customerIgId} diabaikan bot.`);
        await supabase.from("chat_logs").insert({
          client_id: client.slug,
          customer_phone: customerIgId,
          message: messageText,
          platform: "instagram",
          response: "", 
          replied_by: "customer"
        });
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // --------------------------------------------------------------------
      // 3. PANGGIL GEMINI ENGINE (Chat & Ekstraksi Lead)
      // --------------------------------------------------------------------
      console.log("🤖 Gemini sedang berpikir untuk membalas IG...");
      const aiResult = await runGeminiAgentIG(client, messageText, customerIgId);

      // --- LAPIS 3: TRIGGER HUMAN HANDOFF ---
      let finalResponseText = aiResult.text;
      if (finalResponseText.includes("[OPER_MANUSIA]")) {
         if (lead) await supabase.from("leads").update({ is_bot_active: false }).eq("id", lead.id);
         
         finalResponseText = "Mohon maaf atas ketidaknyamanannya 🙏. Keluhan/pertanyaan ini akan segera dibantu langsung oleh admin kami via DM ya. Mohon ditunggu.";
         console.log("🚨 Human Handoff IG Triggered untuk:", customerIgId);
      }

      // --------------------------------------------------------------------
      // 4. KIRIM DM IG & SIMPAN DATABASE (PARALLEL)
      // --------------------------------------------------------------------
      const sendIgTask = fetch(`https://graph.facebook.com/v18.0/${igAccountId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${client.instagram_access_token}` },
        body: JSON.stringify({ recipient: { id: customerIgId }, message: { text: finalResponseText } }),
      });

      const saveChatTask = supabase.from("chat_logs").insert({
        client_id: client.slug,
        customer_phone: customerIgId,
        message: messageText,
        response: finalResponseText,
        replied_by: "ai",
        platform: "instagram"
      });

      const saveUsageTask = supabase.from("usage_logs").insert({
        client_id: client.id,
        tokens_input: aiResult.inputTokens,
        tokens_output: aiResult.outputTokens,
        total_tokens: aiResult.totalTokens
      });

      // Jalankan tugas update Leads di background
      runLeadExtractionBackgroundIG(client, lead, customerIgId, messageText, finalResponseText, aiResult.chatHistory);

      await Promise.all([sendIgTask, saveChatTask, saveUsageTask]);
      console.log("✅ Berhasil membalas pesan IG otomatis pakai AI!");
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Fatal Error IG Webhook AI:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// ============================================================================
// MESIN GEMINI INSTAGRAM (DENGAN RAG & MEMORI)
// ============================================================================
async function runGeminiAgentIG(client: any, userMessage: string, customerIgId: string) {
  try {
    let addonText = "";
    let featuresObj: any = {};
    try {
      featuresObj = typeof client.features === 'string' ? JSON.parse(client.features) : (client.features || {});
    } catch (e) {}

    if (featuresObj?.has_addon === true) {
      const { data: addons } = await supabase.from("client_addons_data").select("addon_type, content").eq("client_id", client.id);
      if (addons && addons.length > 0) {
        addonText = `\n\n--- INFORMASI BISNIS TAMBAHAN (PENTING) ---\n`;
        addons.forEach(addon => {
          addonText += `[DATA ${addon.addon_type.toUpperCase()}]:\n${addon.content}\n\n`;
        });
      }
    }

    const masterBasePrompt = `Kamu adalah Customer Success & Sales Representative profesional dari bisnis: ${client.business_name}.

=== ATURAN BESI (HUKUM MUTLAK, DILARANG KERAS DILANGGAR) ===
1. BATASAN PENGETAHUAN (ANTI-HALUSINASI):
- Kamu HANYA TAHU apa yang tertulis di bagian "KONTEKS BISNIS KLIEN" dan "INFORMASI BISNIS TAMBAHAN".
- JIKA pelanggan bertanya harga, spesifikasi, atau layanan yang TIDAK TERTULIS di konteks, DILARANG MENGARANG JAWABAN.
- Jawab dengan: "Mohon maaf kak, untuk detail tersebut saya harus cek dulu ke tim inti kami ya."

2. PROTOKOL ESKALASI (OPER KE MANUSIA):
- Jika pelanggan mulai marah, komplain keras, atau meminta bicara dengan manusia/admin/CS/dokter, HENTIKAN USAHA MENJAWAB.
- Balas HANYA dengan kata persis ini: [OPER_MANUSIA]

3. GAYA BAHASA (INSTAGRAM DM NATIVE):
- JAWABAN HARUS PENDEK. Maksimal 1-3 kalimat saja per balasan. DM IG harus terlihat kasual.
- Gunakan 1 atau 2 emoji yang relevan 😊.
- Jangan gunakan format tebal (**) atau bullet point kaku.

4. PROTOKOL CLOSING (LEAD CAPTURE):
- Pancing pelanggan untuk memberikan Nomor WhatsApp mereka agar tim admin bisa mem-follow up lebih mudah.
- Contoh: "Harganya 150rb kak. Boleh dibantu nama dan nomor WA-nya agar saya bantu reservasikan?"

=== KONTEKS BISNIS KLIEN (INSTRUKSI UTAMA) ===
${client.system_prompt || "Sapa pelanggan dengan ramah."}
${addonText}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: masterBasePrompt });

    const { data: chatHistory } = await supabase
      .from("chat_logs")
      .select("message, response")
      .eq("client_id", client.slug)
      .eq("customer_phone", customerIgId)
      .eq("platform", "instagram") 
      .order("created_at", { ascending: false })
      .limit(15);

    const formattedHistory: any[] = [];
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.reverse().forEach((log) => {
        if (log.message && log.message.trim() !== "" && log.response && log.response.trim() !== "") {
          formattedHistory.push({ role: "user", parts: [{ text: log.message }] });
          formattedHistory.push({ role: "model", parts: [{ text: log.response }] });
        }
      });
    }

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const usageMetadata = response.usageMetadata;

    return {
      text: response.text(),
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
      totalTokens: usageMetadata?.totalTokenCount || 0,
      chatHistory: formattedHistory
    };
  } catch (error) {
    console.error("❌ Gemini API Error IG:", error);
    return { text: "Mohon maaf kak, sistem kami sedang ada gangguan jaringan. Coba sebentar lagi ya 🙏", inputTokens: 0, outputTokens: 0, totalTokens: 0, chatHistory: [] };
  }
}

// ============================================================================
// EKSTRAKTOR LEAD INSTAGRAM (BACKGROUND TASK)
// ============================================================================
async function runLeadExtractionBackgroundIG(client: any, existingLead: any, customerIgId: string, userMsg: string, aiReply: string, history: any[]) {
  try {
    const extractorModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite", 
      generationConfig: { responseMimeType: "application/json" } 
    });

    const contextForExtraction = history.map((m: any) => `${m.role === "model" ? "Bot" : "User"}: ${m.parts[0].text}`).join("\n");
    const currentChatLog = contextForExtraction + `\nUser: ${userMsg}\nBot: ${aiReply}`;

    const checkPrompt = `Tugas: Ekstrak data prospek pelanggan dari riwayat obrolan DM Instagram ini.
Riwayat chat:
${currentChatLog}

ATURAN PENTING:
1. Jika "nomor telepon/WA", "nama", atau "detail reservasi" SUDAH ADA di riwayat chat sebelumnya, WAJIB dituliskan kembali. DILARANG mereset menjadi null.
2. Format JSON murni (Karena ini dari IG, nomor HP/WA mungkin belum ada di awal, cari di dalam teks obrolan):
{
  "name": "nama pelanggan atau null", 
  "phone": "nomor wa/hp atau null",
  "needs": "kebutuhan utama/keluhan atau null", 
  "total_people": "jumlah orang atau null", 
  "booking_date": "tanggal atau null", 
  "booking_time": "jam atau null"
}`;

    const extractionResult = await extractorModel.generateContent(checkPrompt);
    const cleanJson = extractionResult.response.text().replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(cleanJson);

    let finalNeeds = extractedData.needs && extractedData.needs !== "null" ? extractedData.needs : "";
    if (extractedData.phone && extractedData.phone !== "null") {
       finalNeeds = `[WA Diberikan: ${extractedData.phone}] ` + finalNeeds;
    }

    // ====================================================================
    // [FIX 4 DARI PAK CLAUDE]: APPEND FULL CHAT (Bukan Overwrite)
    // ====================================================================
    const newTurnLog = `User: ${userMsg}\nBot: ${aiReply}`;
    const finalChatToSave = existingLead?.full_chat 
       ? existingLead.full_chat + "\n\n" + newTurnLog 
       : newTurnLog;

    if (existingLead) {
      const updatePayload: any = { full_chat: finalChatToSave };
      if (extractedData.name && extractedData.name !== "null") updatePayload.customer_name = extractedData.name;
      
      if (finalNeeds) updatePayload.customer_needs = finalNeeds;
      if (extractedData.total_people && extractedData.total_people !== "null") updatePayload.total_people = extractedData.total_people;
      if (extractedData.booking_date && extractedData.booking_date !== "null") updatePayload.booking_date = extractedData.booking_date;
      if (extractedData.booking_time && extractedData.booking_time !== "null") updatePayload.booking_time = extractedData.booking_time;

      await supabase.from("leads").update(updatePayload).eq("id", existingLead.id);
      console.log("🔄 Background IG: Lead Diperbarui!");
    } else {
      await supabase.from("leads").insert({
        client_id: client.id,
        customer_name: extractedData.name && extractedData.name !== "null" ? extractedData.name : "IG User " + customerIgId.substring(0, 5),
        customer_phone: customerIgId, 
        customer_needs: finalNeeds || userMsg,
        total_people: extractedData.total_people && extractedData.total_people !== "null" ? extractedData.total_people : null,
        booking_date: extractedData.booking_date && extractedData.booking_date !== "null" ? extractedData.booking_date : "-", 
        booking_time: extractedData.booking_time && extractedData.booking_time !== "null" ? extractedData.booking_time : "-",
        platform: "instagram",
        full_chat: finalChatToSave, // Gunakan string append yang sama
        is_bot_active: true
      });
      console.log("✨ Background IG: Lead Baru Ditambahkan!");
    }
  } catch (e) {
    console.error("⚠️ Background Extraction Error IG:", e);
  }
}