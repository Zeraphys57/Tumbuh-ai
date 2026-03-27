import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// --- IMPORT GUDANG PERKAKAS AGENTIC ---
import { getGeminiToolsConfig, executeAgenticCall } from "@/app/agentic/agentic-tools";
export const maxDuration = 60;

// ============================================================================
// INISIALISASI PRODUCTION (VIP PASS)
// ============================================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// RATE LIMIT MAP DENGAN AUTO-CLEANUP (ANTI MEMORY LEAK)
const rateLimitMap = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((timestamp, key) => {
    if (now - timestamp > 60000) rateLimitMap.delete(key); 
  });
}, 60 * 1000);

export async function POST(req: Request) {
  let aiStartTime = 0;
  let dbClientId: string | null = null;
  const AI_MODEL_MAIN = "gemini-2.5-flash"; 
  const AI_MODEL_ROUTER = "gemini-2.5-flash-lite"; // Satpam Pintu Depan

  try {
    const body = await req.json();
    
    // ========================================================================
    // 1. WHITELIST & VALIDASI SOURCE PLATFORM 
    // ========================================================================
    const VALID_PLATFORMS = ["WEB", "WHATSAPP", "INSTAGRAM"];
    const rawSource = String(body.source || "WEB").toUpperCase();
    const platformName = VALID_PLATFORMS.includes(rawSource) ? rawSource : "WEB";

    const { message, clientId, history } = body;

    // VALIDASI INPUT KERAS 
    if (!message || !clientId) return NextResponse.json({ reply: "Sistem membutuhkan data yang lengkap." }, { status: 400 });
    if (typeof message !== 'string' || message.trim().length === 0) return NextResponse.json({ reply: "Pesan tidak boleh kosong ya Kak 😊" }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ reply: "Wah, pesannya kepanjangan nih Kak. Bisa diringkas sedikit? 😊" }, { status: 400 });

    // RATE LIMITING (2 DETIK)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rateLimitKey = `${clientId}_${ip}`; 
    const now = Date.now();
    const lastRequest = rateLimitMap.get(rateLimitKey);
    
    if (lastRequest && now - lastRequest < 2000) { 
      return NextResponse.json({ reply: "Ketiknya pelan-pelan saja ya Kak... 🙏" }, { status: 429 });
    }
    rateLimitMap.set(rateLimitKey, now);

    // ========================================================================
    // 2. AMBIL DATA KLIEN DARI SLUG
    // ========================================================================
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, system_prompt, features, is_active") 
      .eq("slug", clientId)
      .single();

    if (clientError || !client) {
      console.error(`[CHAT API] Client tidak valid/tidak ditemukan. Slug: ${clientId}`);
      return NextResponse.json({ reply: "Sistem sedang memuat data atau asisten tidak tersedia. Silakan coba lagi nanti." }, { status: 404 });
    }
    
    if (client.is_active === false) {
      return NextResponse.json({ reply: "Mohon maaf, layanan asisten virtual untuk bisnis ini sedang ditangguhkan sementara waktu. 🙏" });
    }

    const clientData = client; 
    dbClientId = clientData.id;

    // ========================================================================
    // 🚀 2.5 [THE GAME CHANGER] INTENT DETECTOR (SANG SATPAM - MULTI TENANT) 🚀
    // ========================================================================
    const intentSchema = {
      type: SchemaType.OBJECT,
      properties: {
        intent: { type: SchemaType.STRING, description: "Pilih SATU: 'tanya_produk', 'tanya_harga', 'booking_reservasi', 'komplain', 'marah_emosi', atau 'out_of_scope'" },
        confidence: { type: SchemaType.NUMBER, description: "Angka 1-100 seberapa yakin dengan klasifikasi intent ini" },
        requires_human: { type: SchemaType.BOOLEAN, description: "True jika ini keluhan berat, marah-marah, nego harga ekstrem, atau bahasan di luar konteks bisnis" }
      }
    };

    // [FIX ✅]: Konteks Dinamis dari Database Klien (Max 300 char agar token hemat)
    const businessContext = clientData.system_prompt ? clientData.system_prompt.slice(0, 300) : "bisnis umum";

    const intentModel = genAI.getGenerativeModel({
      model: AI_MODEL_ROUTER,
      generationConfig: { 
        responseMimeType: "application/json", 
        responseSchema: intentSchema as any // [FIX 1]: Tambahkan "as any" di sini
      },
      systemInstruction: `Tugasmu HANYA membaca pesan terakhir user dan mengkategorikan niatnya (intent) dalam konteks: "${businessContext}". Jangan membalas pesannya, cukup deteksi niatnya saja.`
    });

    const intentStartTime = performance.now();
    const intentResult = await intentModel.generateContent(message);
    const intentEndTime = performance.now();
    
    // Parsing Hasil Satpam
    const rawIntentText = intentResult.response.text().trim();
    const cleanIntentJson = rawIntentText.replace(/```json|```/g, "").trim();
    const userIntent = JSON.parse(cleanIntentJson);

    console.log(`[INTENT DETECTED]: ${userIntent.intent} (Yakin: ${userIntent.confidence}%) | Butuh Manusia: ${userIntent.requires_human}`);

    // LOG CCTV UNTUK SATPAM (FIRE-AND-FORGET)
    const intentUsage = intentResult.response.usageMetadata;
    if (intentUsage) {
       // [FIX 2]: Gunakan .then() alih-alih .catch() untuk Supabase Fire-and-Forget
       supabase.from("usage_logs").insert({
         client_id: dbClientId,
         model_used: "intent-router (flash-lite)",
         tokens_input: intentUsage.promptTokenCount,
         tokens_output: intentUsage.candidatesTokenCount,
         total_tokens: intentUsage.totalTokenCount,
         latency_ms: Math.round(intentEndTime - intentStartTime),
         status: 'success'
       }).then(({ error }) => {
         if (error) console.error("⚠️ Intent Telemetry Error:", error.message);
       });
    }

    // ========================================================================
    // 🛡️ HARD FALLBACK (EKSEKUSI LANGSUNG TANPA MIKIR)
    // ========================================================================
    // [FIX ✅]: Array intent disesuaikan dengan schema generic
    if (userIntent.requires_human === true || userIntent.confidence < 60 || ['komplain', 'marah_emosi', 'out_of_scope'].includes(userIntent.intent)) {
      console.log(`⛔ [FALLBACK TRIGGERED] Pesan diblokir oleh Intent Router. Eksekusi Handoff.`);
      
      // [FIX ✅]: Pesan Handoff Generic untuk semua jenis bisnis
      const fallbackReply = "Mohon maaf Kak, untuk pertanyaan spesifik, keluhan, atau hal ini agar lebih aman dan akurat Kakak akan saya sambungkan langsung dengan tim admin/CS kami ya. Boleh tinggalkan nomor WhatsApp Kakak agar segera kami hubungi? 🙏";
      
      // Tetap jalankan background ekstraksi agar chat log tersimpan! (Fire and forget)
      runWebLeadExtraction(clientData.id, message, fallbackReply, history || [], platformName).catch(e => console.error("⚠️ Extractor Error in Fallback:", e));
      
      return NextResponse.json({ reply: fallbackReply, isHandoff: true });
    }

    // ========================================================================
    // JIKA LOLOS SATPAM, BARU LANJUT KE PROSES BERAT (RAG & MASTER AI)
    // ========================================================================
    
    // --- LOGIKA ADDON LAMA (STATIC) ---
    let addonText = "";
    let featuresObj: any = {};
    try { featuresObj = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {}); } catch (e) {}

    if (featuresObj?.has_addon === true) {
      const { data: addons } = await supabase.from("client_addons_data").select("addon_type, content").eq("client_id", clientData.id);
      if (addons && addons.length > 0) {
        addonText = `\n\n--- INFORMASI BISNIS TAMBAHAN (PENTING) ---\n`;
        addons.forEach(addon => { addonText += `[DATA ${addon.addon_type.toUpperCase()}]:\n${addon.content}\n\n`; });
      }
    }

    // ========================================================================
    // 🧠 3. RAG ENGINE 
    // ========================================================================
    let ragContextText = "";
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embedResult = await embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: message }] },
        taskType: "RETRIEVAL_QUERY", 
        outputDimensionality: 1536 
      } as any); 
      
      const queryVector = embedResult.embedding.values;
      const { data: matchedDocs, error: matchError } = await supabase.rpc("match_client_knowledge", {
        query_embedding: queryVector, match_threshold: 0.65, match_count: 3, p_client_id: clientData.id
      });

      if (!matchError && matchedDocs && matchedDocs.length > 0) {
        ragContextText = `\n\n=== DOKUMEN REFERENSI DARI KNOWLEDGE BASE ===\n`;
        matchedDocs.forEach((doc: any) => { ragContextText += `[Sumber: ${doc.document_name}]:\n${doc.content}\n\n`; });
        ragContextText += `INSTRUKSI RAG KHUSUS: \n- JIKA pelanggan bertanya hal yang relevan dengan Dokumen Referensi di atas, WAJIB gunakan data dari dokumen tersebut untuk menjawab!\n- JIKA jawaban tidak ada di Dokumen Referensi dan Konteks Bisnis, ikuti Aturan Besi nomor 1 (Jangan mengarang jawaban).\n`;
      }
    } catch (ragErr) { console.error("RAG Search Engine Error:", ragErr); }

    // ========================================================================
    // 4. MASTER PROMPT SINKRONISASI
    // ========================================================================
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

    // ========================================================================
    // 🌟 SETUP AGENTIC TOOLS 
    // ========================================================================
    const { data: enabledTools } = await supabase
      .from("client_agentic_tools")
      .select("tool_name")
      .eq("client_id", clientData.id)
      .eq("is_active", true); 

    const finalTools = enabledTools?.map(t => t.tool_name) || [];
    const geminiTools = getGeminiToolsConfig(finalTools);

    const modelOptions: any = { model: AI_MODEL_MAIN, systemInstruction: masterBasePrompt };
    if (geminiTools) modelOptions.tools = geminiTools;

    const model = genAI.getGenerativeModel(modelOptions);

    // ========================================================================
    // FILTER HISTORY KETAT
    // ========================================================================
    const MAX_HISTORY = 30; 
    let safeHistory: any[] = [];

    if (history && Array.isArray(history)) {
      const rawCleaned = history
        .filter((msg: any) => msg.content && msg.content.trim() !== "") 
        .map((msg: any) => ({ 
           role: (msg.role === "ai" || msg.role === "assistant" || msg.role === "model") ? "model" : "user", 
           parts: [{ text: msg.content }] 
        }));

      for (const msg of rawCleaned) {
        if (safeHistory.length === 0) {
          safeHistory.push(msg);
        } else {
          const lastMsg = safeHistory[safeHistory.length - 1];
          if (lastMsg.role === msg.role) {
            lastMsg.parts[0].text += "\n\n" + msg.parts[0].text; 
          } else {
            safeHistory.push(msg); 
          }
        }
      }
      safeHistory = safeHistory.slice(-MAX_HISTORY);
    }

    const chat = model.startChat({ history: safeHistory });

    aiStartTime = performance.now(); 
    
    const result = await chat.sendMessage(message);
    let response = await result.response;
    let reply: string = "";

    // ========================================================================
    // 🌟 THE AGENTIC INTERCEPTION (TOOL EXECUTION)
    // ========================================================================
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      console.log(`[AGENTIC] 🤖 Eksekusi tool: ${call.name}`);

      try {
        const toolResult = await executeAgenticCall(call.name, call.args, clientData);
        const step2Result = await chat.sendMessage([{
          functionResponse: { name: call.name, response: toolResult }
        }]);

        response = await step2Result.response;
        reply = response.text();
      } catch (err) {
        console.error("Tool Execution Error:", err);
        reply = "Maaf, sistem internal kami sedang gangguan saat mengecek data tersebut ya Kak. Mohon tunggu sebentar.";
      }
    } else {
      reply = response.text();
    }

    const aiEndTime = performance.now();
    const latencyMs = Math.round(aiEndTime - aiStartTime);

    let isHandoff = false;
    if (reply.includes("[OPER_MANUSIA]")) {
      reply = "Mohon maaf atas ketidaknyamanannya 🙏.\n\nPertanyaan/keluhan ini membutuhkan bantuan lebih lanjut. Silakan tinggalkan Nama dan Nomor WhatsApp Anda, tim CS manusia kami akan segera menghubungi Anda kembali.";
      isHandoff = true; 
    }

    // ========================================================================
    // 5. EKSTRAKSI LEAD & USAGE LOG
    // ========================================================================
    const usage = response.usageMetadata;
    const logPromise = usage ? supabase.from("usage_logs").insert({
      client_id: clientData.id,
      model_used: AI_MODEL_MAIN,       
      tokens_input: usage.promptTokenCount,
      tokens_output: usage.candidatesTokenCount,
      total_tokens: usage.totalTokenCount,
      latency_ms: latencyMs,          
      status: 'success'                
    }) : Promise.resolve();

    const extractPromise = runWebLeadExtraction(clientData.id, message, reply, safeHistory, platformName);

    await Promise.all([extractPromise, logPromise]).catch(err => console.error("Web Extractor/Telemetry Error:", err));

    return NextResponse.json({ reply, isHandoff });

  } catch (error: any) {
    console.error("Chat Error:", error.message);
    
    if (dbClientId && aiStartTime > 0) {
      const errorEndTime = performance.now();
      await supabase.from("usage_logs").insert({
        client_id: dbClientId,
        model_used: AI_MODEL_MAIN,
        latency_ms: Math.round(errorEndTime - aiStartTime),
        status: 'error'
      });
    }

    return NextResponse.json({ reply: "Duh, sepertinya server sedang sibuk. Coba sebentar lagi ya!" }, { status: 500 });
  }
}

// ============================================================================
// 🌟 BACKGROUND EKSTRAKSI LEAD (TETAP SAMA SEPERTI SEBELUMNYA)
// ============================================================================
async function runWebLeadExtraction(clientUUID: string, userMessage: string, botReply: string, history: any[], platformName: string) {
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

    const EXTRACTOR_MODEL = "gemini-2.5-flash-lite"; 
    const extractorModel = genAI.getGenerativeModel({ 
      model: EXTRACTOR_MODEL, 
      generationConfig: { responseMimeType: "application/json", responseSchema: leadSchema } 
    });

    const contextForExtraction = history.map((m: any) => `${m.role === "model" ? "Bot" : "User"}: ${m.parts[0].text}`).join("\n");    
    const fullChatLog = contextForExtraction + `\nUser: ${userMessage}\nBot: ${botReply}`;

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
    const extractedData = JSON.parse(cleanJson);

    const extractUsage = extractionResult.response.usageMetadata;
    if (extractUsage) {
       await supabase.from("usage_logs").insert({
         client_id: clientUUID,
         model_used: "lead-extractor (flash-lite)",
         tokens_input: extractUsage.promptTokenCount,
         tokens_output: extractUsage.candidatesTokenCount,
         total_tokens: extractUsage.totalTokenCount,
         latency_ms: Math.round(extractEndTime - extractStartTime),
         status: 'success'
       });
    }

    if (extractedData.phone && extractedData.phone !== "null" && extractedData.phone.length > 5) {
      let phoneNumber = String(extractedData.phone).replace(/[^0-9]/g, ""); 
      if (phoneNumber.startsWith("0")) phoneNumber = "62" + phoneNumber.substring(1);
      else if (phoneNumber.startsWith("8")) phoneNumber = "62" + phoneNumber;

      const { data: oldLead, error: selectError } = await supabase
        .from("leads")
        .select("id, full_chat, customer_name, customer_needs, total_people, booking_date, booking_time, is_bot_active")
        .eq("client_id", clientUUID)
        .eq("customer_phone", phoneNumber)
        .order('created_at', { ascending: false }) 
        .limit(1) 
        .maybeSingle(); 

      if (selectError) console.error("❌ DB Select Error:", selectError.message);

      const newTurnLog = `User: ${userMessage}\nBot: ${botReply}`;
      let finalChatToSave = oldLead?.full_chat ? oldLead.full_chat + "\n\n" + newTurnLog : newTurnLog;

      const MAX_CHAT_LENGTH = 30000; 
      if (finalChatToSave.length > MAX_CHAT_LENGTH) {
        finalChatToSave = "...[History Lama Dipangkas]...\n\n" + finalChatToSave.slice(-MAX_CHAT_LENGTH);
      }

      const finalName = (extractedData.name && extractedData.name !== "null") ? extractedData.name : (oldLead?.customer_name || "Web User");
      const finalNeeds = (extractedData.needs && extractedData.needs !== "null") ? extractedData.needs : (oldLead?.customer_needs || "-");
      const finalPeople = (extractedData.total_people && extractedData.total_people !== "null") ? extractedData.total_people : (oldLead?.total_people || null);
      const finalDate = (extractedData.booking_date && extractedData.booking_date !== "null") ? extractedData.booking_date : (oldLead?.booking_date || "-");
      const finalTime = (extractedData.booking_time && extractedData.booking_time !== "null") ? extractedData.booking_time : (oldLead?.booking_time || "-");

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
        platform: platformName.toLowerCase()
      };

      if (oldLead) {
         await supabase.from("leads").update(leadPayload).eq("id", oldLead.id);
      } else {
         await supabase.from("leads").insert(leadPayload);
      }
    }
  } catch (extractError) {
     console.error("⚠️ Background Extraction Error:", extractError);
     await supabase.from("usage_logs").insert({
         client_id: clientUUID,
         model_used: "lead-extractor (flash-lite)",
         latency_ms: 0,
         status: 'error'
     }); 
  }
}