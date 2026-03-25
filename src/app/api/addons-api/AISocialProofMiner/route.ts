import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  let aiStartTime = 0;
  const AI_MODEL = "gemini-2.5-flash"; 

  try {
    const body = await req.json();
    
    // ⚠️ WAJIB TANGKAP clientId DARI FRONTEND
    const { leads, clientId } = body;

    // ========================================================================
    // 1. GATEKEEPER AUTHENTICATION (ANTI-HIJACKING)
    // ========================================================================
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    
    const userClientId = user.user_metadata?.client_id || user.id;
    if (userClientId !== clientId) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

    // ========================================================================
    // 2. SANITASI & PEMBATASAN PAYLOAD
    // ========================================================================
    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "Data leads kosong" }, { status: 400 });
    }
    
    // GUARDRAIL: Maksimal 20 leads agar akurasi tajam & hemat token
    if (leads.length > 20) {
      return NextResponse.json({ error: "Maksimal 20 leads per deteksi agar testimoni yang digali benar-benar akurat." }, { status: 400 });
    }

    // Ambil data untuk dianalisa (Slice 1000 karakter agar konteksnya cukup)
    const chatDataToAnalyze = leads.map((lead: any) => ({
      name: lead.customer_name || "Pelanggan",
      chat_history: (lead.full_chat || "Tidak ada riwayat chat").slice(0, 1000) 
    }));

    // ========================================================================
    // 3. CEK & POTONG KUOTA GLOBAL
    // ========================================================================
    const quotaCheck = await checkAndDeductQuota(clientId, 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: quotaCheck.status });
    }

    // ========================================================================
    // 4. PROSES AI GENERATION (SOCIAL PROOF MINER)
    // ========================================================================
    // WAJIB PAKAI GEMINI 2.5 FLASH 🚀 + SAFETY JSON
    const model = genAI.getGenerativeModel({ 
      model: AI_MODEL,
      // FITUR SAKTI: Memaksa output menjadi JSON murni
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Social Proof Miner", seorang Social Media Strategist dan Copywriter ahli dalam psikologi konsumen.
      Tugas Anda adalah menambang riwayat chat untuk menemukan "Golden Testimonials"—kalimat yang mengandung kepuasan, kelegaan, atau pujian tulus.

      === DATA INPUT ===
      Data Percakapan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA ANALISIS (SOCIAL PROOF PSYCHOLOGY) ===
      1. Ekstraksi Emosi: Cari kalimat yang menunjukkan "A-ha Moment" (misal: "Wah, ternyata cocok!", "Sakitnya langsung hilang").
      2. Anonymization: Masking nama pelanggan demi privasi (Contoh: "Budi Santoso" -> "Kak B***" atau "Kak B.S.").
      3. Caption Engineering (PAS Framework): 
         - Problem: Angkat masalah yang diceritakan pelanggan di chat.
         - Agitation: Pertegas betapa tidak enaknya masalah itu.
         - Solution: Gunakan testimoni mereka sebagai bukti nyata solusinya.
         - Tambahkan Call to Action (CTA) dan Emoji yang relevan.

      === ATURAN OUTPUT (JSON MURNI) ===
      Pilih maksimal 3 obrolan terbaik.
      Output WAJIB JSON ARRAY murni:

      [
        {
          "customer_initial": "Nama yang sudah disamarkan",
          "original_praise": "Kutipan asli yang paling 'menjual' dari chat tersebut",
          "suggested_caption": "Caption IG/WA Story menggunakan PAS Framework + FOMO + Emojis",
          "rating": <Skor kepuasan 1-5 berdasarkan nada bicaranya di chat>
        }
      ]
    `;

    console.log(`[PROOF MINER] Menambang testimoni untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING (Tetap dijaga untuk mencegah anomali)
    // ========================================================================
    let testimonials;
    try {
      // Meskipun pakai responseMimeType, kadang AI masih nakal ngasih ```json di awal
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim();
      testimonials = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON:", result.response.text());
      throw new Error("Gagal menyusun format testimoni."); 
    }

    // ========================================================================
    // 6. CCTV LOGGING
    // ========================================================================
    logAiUsage({
      clientId,
      modelUsed: AI_MODEL,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      latencyMs,
      status: 'success'
    }).catch(err => console.error("Telemetry error:", err));

    return NextResponse.json({ 
      testimonials,
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND SOCIAL PROOF MINER:", error);
    
    if (aiStartTime > 0) {
      logAiUsage({ clientId: "unknown", modelUsed: AI_MODEL, latencyMs: 0, status: 'error' }).catch(() => {});
    }

    return NextResponse.json({ error: error.message || "Gagal menggali testimoni" }, { status: 500 });
  }
}