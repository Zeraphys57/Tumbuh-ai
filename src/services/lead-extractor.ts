import { SchemaType } from "@google/generative-ai";
import { genAI } from "@/lib/gemini";
import { supabaseAdmin as supabase } from "@/lib/supabase";

const EXTRACTOR_MODEL = "gemini-2.5-flash-lite";
const MAX_GEMINI_INPUT_CHARS = 8000;
const HEAD_CHARS = 2000; // karakter awal yang selalu dipertahankan (perkenalan diri pelanggan)
const VALID_PLATFORMS = ["web", "whatsapp", "instagram"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function runWebLeadExtraction(
  clientUUID: string,
  userMessage: string,
  botReply: string,
  history: any[],
  platformName: string
): Promise<void> {
  // Fix 1 — Validasi UUID sebelum apapun dieksekusi
  if (!UUID_REGEX.test(clientUUID)) {
    console.error(`[LEAD EXTRACTOR] clientUUID tidak valid, skip: "${clientUUID}"`);
    return;
  }

  try {
    const leadSchema: any = {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Nama pelanggan jika disebutkan, isi 'null' jika tidak ada" },
        phone: { type: SchemaType.STRING, description: "Nomor HP / WhatsApp pelanggan jika disebutkan, isi 'null' jika tidak ada" },
        needs: { type: SchemaType.STRING, description: "Inti kebutuhan/keluhan DARI PELANGGAN. MAKSIMAL 2-4 KATA KUNCI. DILARANG KERAS mengutip balasan/template dari Bot. Isi 'null' jika tidak ada." },
        total_people: { type: SchemaType.STRING, description: "Jumlah orang/kuantitas, isi 'null' jika tidak ada" },
        booking_date: { type: SchemaType.STRING, description: "Tanggal reservasi, isi 'null' jika tidak ada" },
        booking_time: { type: SchemaType.STRING, description: "Jam reservasi, isi 'null' jika tidak ada" },
      },
    };

    const extractorModel = genAI.getGenerativeModel({
      model: EXTRACTOR_MODEL,
      generationConfig: { responseMimeType: "application/json", responseSchema: leadSchema },
    });

    // Normalisasi kedua format history:
    // - Happy path  : { role, parts: [{ text }] }  (dari safeHistory route.ts)
    // - Fallback path: { role, content }            (dari body.history mentah)
    const contextForExtraction = history
      .map((m: any) => {
        const text = m.parts?.[0]?.text ?? m.content ?? "";
        if (!text.trim()) return null;
        const label = ["model", "ai", "assistant"].includes(m.role) ? "Bot" : "User";
        return `${label}: ${text}`;
      })
      .filter(Boolean)
      .join("\n");

    // Fix 2 — Head-Tail slicing: simpan 2000 char pertama (perkenalan) + tail sisanya
    // Jangan potong dari awal — pelanggan biasanya sebut nama/nomor di pesan pertama
    const rawChatLog = contextForExtraction + `\nUser: ${userMessage}\nBot: ${botReply}`;
    const fullChatLog = rawChatLog.length > MAX_GEMINI_INPUT_CHARS
      ? rawChatLog.slice(0, HEAD_CHARS) +
        "\n\n...[history tengah dipangkas]...\n\n" +
        rawChatLog.slice(-(MAX_GEMINI_INPUT_CHARS - HEAD_CHARS))
      : rawChatLog;

    const checkPrompt = `Tugas: Ekstrak data pelanggan dari obrolan ini.
ATURAN MUTLAK:
1. Kolom 'needs' HANYA boleh diisi berdasarkan ucapan 'User'.
2. JANGAN PERNAH memasukkan teks template dari 'Bot' ke dalam 'needs'.
3. Buat 'needs' menjadi kata kunci singkat.
4. Jika data sudah ada di chat, JANGAN DIHAPUS.

Chat Historis:
${fullChatLog}`;

    const extractStartTime = performance.now();
    const extractionResult = await extractorModel.generateContent(checkPrompt);
    const extractEndTime = performance.now();

    const rawText = extractionResult.response.text().trim();
    const cleanJson = rawText.replace(/```json|```/g, "").trim();

    // Fix 3 — JSON.parse dalam try-catch terpisah, gagal parse = stop + telemetry error
    let extractedData: any;
    try {
      extractedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("⚠️ Lead Extractor JSON Parse Error:", parseErr);
      const { error: parseLogErr } = await supabase.from("usage_logs").insert({
        client_id: clientUUID,
        model_used: "lead-extractor (flash-lite)",
        latency_ms: Math.round(extractEndTime - extractStartTime),
        status: "error",
      });
      if (parseLogErr) console.error("⚠️ Parse Error telemetry insert failed:", parseLogErr.message);
      return;
    }

    // Log telemetry sukses
    const extractUsage = extractionResult.response.usageMetadata;
    if (extractUsage) {
      const { error: extractLogErr } = await supabase.from("usage_logs").insert({
        client_id: clientUUID,
        model_used: "lead-extractor (flash-lite)",
        tokens_input: extractUsage.promptTokenCount,
        tokens_output: extractUsage.candidatesTokenCount,
        total_tokens: extractUsage.totalTokenCount,
        latency_ms: Math.round(extractEndTime - extractStartTime),
        status: "success",
      });
      if (extractLogErr) console.error("⚠️ Extractor Log Insert Error:", extractLogErr.message);
    }

    // Type guard phone (String() casting agar aman dari halusinasi tipe Gemini)
    const rawPhone = extractedData.phone != null ? String(extractedData.phone) : "null";

    if (rawPhone && rawPhone !== "null" && rawPhone.length > 5) {
      let phoneNumber = rawPhone.replace(/[^0-9]/g, "");
      if (phoneNumber.startsWith("0")) phoneNumber = "62" + phoneNumber.substring(1);
      else if (phoneNumber.startsWith("8")) phoneNumber = "62" + phoneNumber;

      // Validasi panjang: min 10 digit, max 15 digit (standar internasional)
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        console.warn(`⚠️ Nomor tidak valid setelah formatting, skip: "${phoneNumber}"`);
        return;
      }

      const { data: oldLead, error: selectError } = await supabase
        .from("leads")
        .select("id, full_chat, customer_name, customer_needs, total_people, booking_date, booking_time, is_bot_active")
        .eq("client_id", clientUUID)
        .eq("customer_phone", phoneNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) console.error("❌ DB Select Error:", selectError.message);

      const newTurnLog = `User: ${userMessage}\nBot: ${botReply}`;
      let finalChatToSave = oldLead?.full_chat ? oldLead.full_chat + "\n\n" + newTurnLog : newTurnLog;

      const MAX_CHAT_LENGTH = 30000;
      if (finalChatToSave.length > MAX_CHAT_LENGTH) {
        finalChatToSave = "...[History Lama Dipangkas]...\n\n" + finalChatToSave.slice(-MAX_CHAT_LENGTH);
      }

      // Fix 4 — String() casting pada semua field dari Gemini (konsisten, anti-halusinasi tipe)
      const finalName = extractedData.name && extractedData.name !== "null"
        ? String(extractedData.name) : oldLead?.customer_name || "Web User";
      const finalNeeds = extractedData.needs && extractedData.needs !== "null"
        ? String(extractedData.needs) : oldLead?.customer_needs || "-";
      const finalPeople = extractedData.total_people && extractedData.total_people !== "null"
        ? String(extractedData.total_people) : oldLead?.total_people || null;
      const finalDate = extractedData.booking_date && extractedData.booking_date !== "null"
        ? String(extractedData.booking_date) : oldLead?.booking_date || "-";
      const finalTime = extractedData.booking_time && extractedData.booking_time !== "null"
        ? String(extractedData.booking_time) : oldLead?.booking_time || "-";

      const safePlatform = VALID_PLATFORMS.includes(platformName.toLowerCase())
        ? platformName.toLowerCase() : "web";

      const leadPayload = {
        client_id: clientUUID,
        customer_phone: phoneNumber,
        customer_name: finalName,
        customer_needs: finalNeeds,
        total_people: finalPeople,
        booking_date: finalDate,
        booking_time: finalTime,
        full_chat: finalChatToSave,
        is_bot_active: oldLead ? oldLead.is_bot_active : true,
        platform: safePlatform,
      };

      if (oldLead) {
        const { error: updateErr } = await supabase.from("leads").update(leadPayload).eq("id", oldLead.id);
        if (updateErr) console.error("❌ Lead Update Error:", updateErr.message);
      } else {
        const { error: insertErr } = await supabase.from("leads").insert(leadPayload);
        if (insertErr) console.error("❌ Lead Insert Error:", insertErr.message);
      }
    }
  } catch (extractError) {
    // Fix 5 — Hapus void IIFE, gunakan await langsung di catch (fungsi ini sudah async)
    console.error("⚠️ Background Extraction Error:", extractError);
    const { error: catchLogErr } = await supabase.from("usage_logs").insert({
      client_id: clientUUID,
      model_used: "lead-extractor (flash-lite)",
      latency_ms: 0,
      status: "error",
    });
    if (catchLogErr) console.error("⚠️ Error telemetry insert failed:", catchLogErr.message);
  }
}
