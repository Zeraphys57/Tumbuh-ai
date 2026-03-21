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
    if (now - timestamp > 60000) rateLimitMap.delete(key); // Hapus memori tiap menit
  });
}, 60 * 1000);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ========================================================================
    // [FIX 🟡]: WHITELIST & VALIDASI SOURCE PLATFORM (ANTI-MANIPULASI)
    // ========================================================================
    const VALID_PLATFORMS = ["WEB", "WHATSAPP", "INSTAGRAM"];
    const rawSource = String(body.source || "WEB").toUpperCase();
    const platformName = VALID_PLATFORMS.includes(rawSource) ? rawSource : "WEB";

    const { message, clientId, history } = body;

    // ========================================================================
    // VALIDASI INPUT KERAS (KEAMANAN & BIAYA)
    // ========================================================================
    if (!message || !clientId) {
      return NextResponse.json({ reply: "Sistem membutuhkan data yang lengkap." }, { status: 400 });
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ reply: "Pesan tidak boleh kosong ya Kak 😊" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ reply: "Wah, pesannya kepanjangan nih Kak. Bisa diringkas sedikit? 😊" }, { status: 400 });
    }

    // ========================================================================
    // 1. RATE LIMITING (ANTI SPAM) - [FIX 🟡]: 2 DETIK UNTUK UX WEB CHAT
    // ========================================================================
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rateLimitKey = `${clientId}_${ip}`; 
    const now = Date.now();
    const lastRequest = rateLimitMap.get(rateLimitKey);
    
    // Diubah jadi 2000ms agar lebih nyaman buat user biasa
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

    // [FIX 🔴]: MENCEGAH INTERNAL ERROR LEAK KE USER LOG
    if (clientError || !client) {
      console.error(`[CHAT API] Client tidak valid atau tidak ditemukan. Slug: ${clientId}`);
      return NextResponse.json({ 
        reply: "Sistem sedang memuat data atau asisten tidak tersedia. Silakan coba lagi nanti." 
      }, { status: 404 });
    }
    
    if (client.is_active === false) {
      console.log(`⛔ Web Chat Ditolak: Klien ${clientId} sedang di-suspend.`);
      return NextResponse.json({ 
        reply: "Mohon maaf, layanan asisten virtual untuk bisnis ini sedang ditangguhkan sementara waktu. 🙏" 
      });
    }

    const clientData = client; 

    // --- LOGIKA ADDON LAMA (STATIC) ---
    let addonText = "";
    let featuresObj: any = {};
    try {
      featuresObj = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {});
    } catch (e) {}

    if (featuresObj?.has_addon === true) {
      const { data: addons } = await supabase.from("client_addons_data").select("addon_type, content").eq("client_id", clientData.id);
      if (addons && addons.length > 0) {
        addonText = `\n\n--- INFORMASI BISNIS TAMBAHAN (PENTING) ---\n`;
        addons.forEach(addon => {
          addonText += `[DATA ${addon.addon_type.toUpperCase()}]:\n${addon.content}\n\n`;
        });
      }
    }

    // ========================================================================
    // 🧠 3. RAG ENGINE: PENCARIAN DOKUMEN (KNOWLEDGE BASE) 🧠
    // ========================================================================
    let ragContextText = "";
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      
      // RAG tetap MURNI menggunakan pesan user agar pencocokan vektor akurat
      const embedResult = await embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: message }] },
        taskType: "RETRIEVAL_QUERY", 
        outputDimensionality: 1536 
      } as any); 
      
      const queryVector = embedResult.embedding.values;

      const { data: matchedDocs, error: matchError } = await supabase.rpc("match_client_knowledge", {
        query_embedding: queryVector,
        match_threshold: 0.65, 
        match_count: 3, 
        p_client_id: clientData.id
      });

      if (matchError) {
         console.error("RPC Error:", matchError);
      } else if (matchedDocs && matchedDocs.length > 0) {
        ragContextText = `\n\n=== DOKUMEN REFERENSI DARI KNOWLEDGE BASE ===\n`;
        matchedDocs.forEach((doc: any) => {
          ragContextText += `[Sumber: ${doc.document_name}]:\n${doc.content}\n\n`;
        });
        ragContextText += `INSTRUKSI RAG KHUSUS: 
- JIKA pelanggan bertanya hal yang relevan dengan Dokumen Referensi di atas, WAJIB gunakan data dari dokumen tersebut untuk menjawab!
- JIKA jawaban tidak ada di Dokumen Referensi dan Konteks Bisnis, ikuti Aturan Besi nomor 1 (Jangan mengarang jawaban).\n`;
      }
    } catch (ragErr) {
      console.error("RAG Search Engine Error:", ragErr);
    }

    // ========================================================================
    // 4. MASTER PROMPT SINKRONISASI (GABUNGAN SEMUA OTAK)
    // ========================================================================
    const masterBasePrompt = `Kamu adalah Customer Success & Sales Representative profesional dari sebuah bisnis.

=== INFORMASI PLATFORM (SANGAT PENTING) ===
[PLATFORM: ${platformName}]
Pesan ini datang dari platform ${platformName}. Kamu WAJIB mengikuti instruksi khusus untuk platform ini (terutama cara meminta nomor WhatsApp/HP) seperti yang tertulis di bagian KONTEKS BISNIS KLIEN.

=== ATURAN BESI (HUKUM MUTLAK, DILARANG KERAS DILANGGAR) ===
1. BATASAN PENGETAHUAN (ANTI-HALUSINASI):
- Kamu HANYA TAHU apa yang tertulis di bagian "KONTEKS BISNIS KLIEN", "INFORMASI TAMBAHAN", dan "DOKUMEN REFERENSI".
- JIKA pelanggan bertanya harga, spesifikasi, atau layanan yang TIDAK TERTULIS di konteks, DILARANG MENGARANG JAWABAN.
- Jawab dengan: "Mohon maaf kak, untuk detail tersebut saya harus cek dulu ke tim inti kami ya. Ada hal lain yang bisa saya bantu?"

2. PROTOKOL ESKALASI (OPER KE MANUSIA):
- Jika pelanggan mulai marah, komplain keras, atau meminta bicara dengan manusia/admin/CS/dokter, HENTIKAN USAHA MENJAWAB.
- Balas HANYA dengan kata persis ini: [OPER_MANUSIA]

3. GAYA BAHASA & FORMAT CHAT:
- Gunakan 1 atau 2 emoji yang relevan 😊.
- Diizinkan menggunakan cetak tebal (**) HANYA untuk kata kunci penting seperti Harga, Nama Produk, atau Jadwal.
- JANGAN gunakan format list pakai bullet/hashtag kaku.
- JIKA JAWABANMU TERDIRI DARI DUA POIN/PIKIRAN YANG BERBEDA (Misal: Menjawab harga, lalu bertanya balik), PISAHKAN kedua kalimat tersebut dengan ENTER GANDA (dua kali baris baru).

4. PROTOKOL CLOSING (LEAD CAPTURE):
- Pancing pelanggan untuk memberikan Nama & Nomor WhatsApp mereka agar tim manusia bisa mem-follow up.

=== KONTEKS BISNIS KLIEN (INSTRUKSI UTAMA) ===
${clientData.system_prompt || "Bot sedang dalam tahap konfigurasi. Mohon sapa pelanggan dengan ramah."}
${addonText}
${ragContextText}`;

    // ========================================================================
    // 🌟 SETUP AGENTIC TOOLS (DYNAMIC LOADING DARI DATABASE) 🌟
    // ========================================================================
    const { data: enabledTools } = await supabase
      .from("client_agentic_tools")
      .select("tool_name")
      .eq("client_id", clientData.id)
      .eq("is_active", true); 

    const activeToolNames = enabledTools?.map(t => t.tool_name) || [];
    const finalTools = activeToolNames;
    const geminiTools = getGeminiToolsConfig(finalTools);

    const modelOptions: any = { model: "gemini-2.5-flash", systemInstruction: masterBasePrompt };
    if (geminiTools) {
      modelOptions.tools = geminiTools;
    }

    const model = genAI.getGenerativeModel(modelOptions);

    // ========================================================================
    // [FIX 🟢]: FILTER HISTORY KETAT & SELANG-SELING (ANTI ERROR GEMINI)
    // ========================================================================
    const MAX_HISTORY = 30; 
    let safeHistory: any[] = [];

    if (history && Array.isArray(history)) {
      // 1. Bersihkan elemen kosong & standarisasi role ('user' atau 'model')
      const rawCleaned = history
        .filter((msg: any) => msg.content && msg.content.trim() !== "") 
        .map((msg: any) => ({ 
           role: (msg.role === "ai" || msg.role === "assistant" || msg.role === "model") ? "model" : "user", 
           parts: [{ text: msg.content }] 
        }));

      // 2. Gabungkan role yang berurutan (Gemini WAJIB User -> Model -> User)
      for (const msg of rawCleaned) {
        if (safeHistory.length === 0) {
          safeHistory.push(msg);
        } else {
          const lastMsg = safeHistory[safeHistory.length - 1];
          // Jika role-nya sama dengan pesan sebelumnya (tabrakan)
          if (lastMsg.role === msg.role) {
            lastMsg.parts[0].text += "\n\n" + msg.parts[0].text; // Gabungkan teksnya
          } else {
            safeHistory.push(msg); // Jika beda, masukkan secara normal
          }
        }
      }

      // 3. Pangkas history agar tidak kepanjangan
      safeHistory = safeHistory.slice(-MAX_HISTORY);
    }

    const chat = model.startChat({ history: safeHistory });

    // [FIX 🔴]: MENGIRIM PESAN USER SECARA MURNI, TANPA EMBEL-EMBEL LABEL
    console.log(`[OMNICHANNEL ROUTER] Meneruskan pesan ke Gemini dengan mode platform: ${platformName}`);
    const result = await chat.sendMessage(message);
    let response = await result.response;
    let reply: string = "";

    // ========================================================================
    // 🌟 THE AGENTIC INTERCEPTION (MENANGKAP FUNGSI AI) 🌟
    // ========================================================================
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      console.log(`[AGENTIC] 🤖 Gemini meminta eksekusi tool: ${call.name} dengan args:`, call.args);

      try {
        const toolResult = await executeAgenticCall(call.name, call.args, clientData);
        
        const step2Result = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: toolResult
          }
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

    let isHandoff = false;
    if (reply.includes("[OPER_MANUSIA]")) {
      reply = "Mohon maaf atas ketidaknyamanannya 🙏.\n\nPertanyaan/keluhan ini membutuhkan bantuan lebih lanjut. Silakan tinggalkan Nama dan Nomor WhatsApp Anda, tim CS manusia kami akan segera menghubungi Anda kembali.";
      isHandoff = true; 
    }

    // 5. EKSTRAKSI LEAD & USAGE LOG
    const usage = response.usageMetadata;
    const logPromise = usage ? supabase.from("usage_logs").insert({
      client_id: clientData.id,
      tokens_input: usage.promptTokenCount,
      tokens_output: usage.candidatesTokenCount,
      total_tokens: usage.totalTokenCount
    }) : Promise.resolve();

    const extractPromise = runWebLeadExtraction(clientData.id, message, reply, safeHistory, platformName);

    await Promise.all([extractPromise, logPromise]).catch(err => console.error("Web Extractor Error:", err));

    return NextResponse.json({ reply, isHandoff });

  } catch (error: any) {
    console.error("Chat Error:", error.message);
    return NextResponse.json({ reply: "Duh, sepertinya server sedang sibuk. Coba sebentar lagi ya!" }, { status: 500 });
  }
}

// ============================================================================
// 🌟 FUNGSI BACKGROUND EKSTRAKSI LEAD (REVISI ANTI-HALUSINASI & SNIPER SEARCH) 🌟
// ============================================================================
async function runWebLeadExtraction(clientUUID: string, userMessage: string, botReply: string, history: any[], platformName: string) {
  try {
    const leadSchema: any = {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Nama pelanggan jika disebutkan, isi 'null' jika tidak ada" },
        phone: { type: SchemaType.STRING, description: "Nomor HP / WhatsApp pelanggan jika disebutkan, isi 'null' jika tidak ada" },
        // [FIX 1]: Paksa AI merangkum jadi 2-4 kata kunci agar mudah di-search
        needs: { type: SchemaType.STRING, description: "Inti kebutuhan/keluhan DARI PELANGGAN. MAKSIMAL 2-4 KATA KUNCI (Contoh: 'Tanya Harga', 'Komplain Pengiriman'). DILARANG KERAS mengutip balasan/template dari Bot. Isi 'null' jika tidak ada." },
        total_people: { type: SchemaType.STRING, description: "Jumlah orang/kuantitas, isi 'null' jika tidak ada" },
        booking_date: { type: SchemaType.STRING, description: "Tanggal reservasi, isi 'null' jika tidak ada" },
        booking_time: { type: SchemaType.STRING, description: "Jam reservasi, isi 'null' jika tidak ada" },
      },
    };

    const extractorModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite", 
      generationConfig: { responseMimeType: "application/json", responseSchema: leadSchema } 
    });

    const contextForExtraction = history.map((m: any) => `${m.role === "model" ? "Bot" : "User"}: ${m.parts[0].text}`).join("\n");    
    const fullChatLog = contextForExtraction + `\nUser: ${userMessage}\nBot: ${botReply}`;

    // [FIX 2]: Tambahkan Aturan Besi di Prompt Ekstraktor
    const checkPrompt = `Tugas: Ekstrak data pelanggan dari obrolan ini.
ATURAN MUTLAK:
1. Kolom 'needs' HANYA boleh diisi berdasarkan ucapan 'User'.
2. JANGAN PERNAH memasukkan teks template dari 'Bot' (seperti "Silakan tinggalkan Nama dan Nomor WhatsApp") ke dalam 'needs'.
3. Buat 'needs' menjadi kata kunci singkat agar mudah dicari di database.
4. Jika data (telepon/nama/needs sebelumnya) sudah ada di chat, JANGAN DIHAPUS (pertahankan/gabungkan dengan rapi).

Chat Historis:
${fullChatLog}`;

    const extractionResult = await extractorModel.generateContent(checkPrompt);
    
    const rawText = extractionResult.response.text().trim();
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(cleanJson);

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
      // [FIX 3]: Jangan sembarangan masukin userMessage mentah ke database
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

      // ... kode payload sebelumnya ...

      // [FIX 4]: Kembalikan Error Handling Spesifik Supabase untuk Debugging
      if (oldLead) {
         const { error: updateErr } = await supabase.from("leads").update(leadPayload).eq("id", oldLead.id);
         if (updateErr) console.error("❌ Update DB Error:", updateErr.message);
      } else {
         const { error: insertErr } = await supabase.from("leads").insert(leadPayload);
         if (insertErr) console.error("❌ Insert DB Error:", insertErr.message);
      }
    }
  } catch (extractError) {
     console.error("⚠️ Background Extraction Error:", extractError);
  }
}