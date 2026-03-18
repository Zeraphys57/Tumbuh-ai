import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// --- IMPORT GUDANG PERKAKAS AGENTIC ---
import { getGeminiToolsConfig, executeAgenticCall } from "@/app/agentic/index"; // Sesuaikan path jika pakai index.ts

export const maxDuration = 60;
// ============================================================================
// INISIALISASI PRODUCTION (VIP PASS)
// ============================================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const rateLimitMap = new Map();

export async function POST(req: Request) {
  try {
    const { message, clientId, history } = await req.json();

    // 1. RATE LIMITING (ANTI SPAM)
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const now = Date.now();
    const lastRequest = rateLimitMap.get(ip);
    if (lastRequest && now - lastRequest < 2000) { 
      return NextResponse.json({ reply: "Ketiknya pelan-pelan saja ya Kak... 🙏" }, { status: 429 });
    }
    rateLimitMap.set(ip, now);

    // 2. AMBIL DATA KLIEN DARI SLUG
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, system_prompt, features, is_active") 
      .eq("slug", clientId)
      .single();

    if (clientError || !client) throw new Error(`Client dengan slug ${clientId} tidak ditemukan`);
    
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
      // a. Ubah chat user jadi Vektor (Angka) dengan 1536 dimensi (Sesuai upgrade Bos!)
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const embedResult = await embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: message }] },
        taskType: "RETRIEVAL_QUERY", // Optimasi khusus untuk pencarian pertanyaan
        outputDimensionality: 1536   // Disesuaikan dengan batas aman Supabase HNSW
      } as any); // "Surat Sakti" Anti-TypeScript Error
      
      const queryVector = embedResult.embedding.values;

      // b. Cari di tabel client_knowledge via RPC Supabase
      const { data: matchedDocs, error: matchError } = await supabase.rpc("match_client_knowledge", {
        query_embedding: queryVector,
        match_threshold: 0.65, // Ambil dokumen yang kemiripannya minimal 65%
        match_count: 3, // Ambil maksimal 3 potongan dokumen agar AI tidak kepenuhan memori
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
      // Sistem tetap berjalan normal menggunakan Master Prompt biasa jika RAG gagal
    }

    // 4. MASTER PROMPT SINKRONISASI (GABUNGAN SEMUA OTAK)
    const masterBasePrompt = `Kamu adalah Customer Success & Sales Representative profesional dari sebuah bisnis.

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
${ragContextText}`; // <-- INI RAG NYA DISUNTIKKAN KE SINI BOS!

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

    const safeHistory = history
      ? history.filter((msg: any, index: number) => !(index === 0 && msg.role === "ai"))
               .map((msg: any) => ({ role: msg.role === "ai" ? "model" : "user", parts: [{ text: msg.content }] }))
      : [];

    const chat = model.startChat({ history: safeHistory });
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

    const extractPromise = runWebLeadExtraction(clientData.id, message, reply, safeHistory);

    await Promise.all([extractPromise, logPromise]).catch(err => console.error("Web Extractor Error:", err));

    return NextResponse.json({ reply, isHandoff });

  } catch (error: any) {
    console.error("Chat Error:", error.message);
    return NextResponse.json({ reply: "Duh, sepertinya server sedang sibuk. Coba sebentar lagi ya!" }, { status: 500 });
  }
}

// ============================================================================
// FUNGSI BACKGROUND EKSTRAKSI LEAD (TETAP SAMA SEPERTI MILIK BOS)
// ============================================================================
async function runWebLeadExtraction(clientUUID: string, userMessage: string, botReply: string, history: any[]) {
  try {
    const leadSchema: any = {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Nama pelanggan jika disebutkan, isi 'null' jika tidak ada" },
        phone: { type: SchemaType.STRING, description: "Nomor HP / WhatsApp pelanggan jika disebutkan, isi 'null' jika tidak ada" },
        needs: { type: SchemaType.STRING, description: "Kebutuhan utama/keluhan, isi 'null' jika tidak ada" },
        total_people: { type: SchemaType.STRING, description: "Jumlah orang/kuantitas, isi 'null' jika tidak ada" },
        booking_date: { type: SchemaType.STRING, description: "Tanggal reservasi, isi 'null' jika tidak ada" },
        booking_time: { type: SchemaType.STRING, description: "Jam reservasi, isi 'null' jika tidak ada" },
      },
    };

    const extractorModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      generationConfig: { responseMimeType: "application/json", responseSchema: leadSchema } 
    });

    const contextForExtraction = history.slice(-15).map((m: any) => `${m.role === "model" ? "Bot" : "User"}: ${m.parts[0].text}`).join("\n");
    const fullChatLog = contextForExtraction + `\nUser: ${userMessage}\nBot: ${botReply}`;

    const checkPrompt = `Tugas: Ekstrak data pelanggan dari obrolan ini. Jika data (seperti nomor telepon atau nama) sudah pernah disebutkan di chat sebelumnya, JANGAN DIHAPUS (wajib ditulis ulang). \n\nChat Historis:\n${fullChatLog}`;

    const extractionResult = await extractorModel.generateContent(checkPrompt);
    const extractedData = JSON.parse(extractionResult.response.text());

    if (extractedData.phone && extractedData.phone !== "null" && extractedData.phone.length > 5) {
      
      let phoneNumber = String(extractedData.phone).replace(/[^0-9]/g, ""); 
      if (phoneNumber.startsWith("0")) phoneNumber = "62" + phoneNumber.substring(1);
      else if (phoneNumber.startsWith("8")) phoneNumber = "62" + phoneNumber;

      const { data: oldLead } = await supabase
        .from("leads")
        .select("*")
        .eq("client_id", clientUUID)
        .eq("customer_phone", phoneNumber)
        .maybeSingle();

      let finalChatToSave = fullChatLog;

      if (oldLead && oldLead.full_chat) {
        const sessionSignature = fullChatLog.substring(0, 50);

        if (oldLead.full_chat.includes(sessionSignature)) {
           const spliceIndex = oldLead.full_chat.lastIndexOf(sessionSignature);
           const preservedOldHistory = oldLead.full_chat.substring(0, spliceIndex); 
           finalChatToSave = preservedOldHistory + fullChatLog;
        } else {
           finalChatToSave = oldLead.full_chat + "\n\n--- Sesi Obrolan Baru ---\n\n" + fullChatLog;
        }
      }

      const finalName = (extractedData.name && extractedData.name !== "null") ? extractedData.name : (oldLead?.customer_name || "Web User");
      const finalNeeds = (extractedData.needs && extractedData.needs !== "null") ? extractedData.needs : (oldLead?.customer_needs || userMessage);
      const finalPeople = (extractedData.total_people && extractedData.total_people !== "null") ? extractedData.total_people : (oldLead?.total_people || null);
      const finalDate = (extractedData.booking_date && extractedData.booking_date !== "null") ? extractedData.booking_date : (oldLead?.booking_date || "-");
      const finalTime = (extractedData.booking_time && extractedData.booking_time !== "null") ? extractedData.booking_time : (oldLead?.booking_time || "-");

      const { error: upsertError } = await supabase
        .from("leads")
        .upsert({
          id: oldLead?.id, 
          client_id: clientUUID,
          customer_phone: phoneNumber,
          customer_name: finalName,
          customer_needs: finalNeeds,
          total_people: finalPeople,
          booking_date: finalDate,
          booking_time: finalTime,
          full_chat: finalChatToSave, 
          is_bot_active: oldLead ? oldLead.is_bot_active : true, 
          platform: 'web'
        }, {
          onConflict: 'client_id, customer_phone', 
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error("❌ Gagal Smart Upsert Web Lead:", upsertError.message);
      } else {
        console.log(`✅ Smart Upsert Web Sukses: ${phoneNumber}`);
      }
    }
  } catch (extractError) {
     console.error("⚠️ Background Extraction Error:", extractError);
  }
}