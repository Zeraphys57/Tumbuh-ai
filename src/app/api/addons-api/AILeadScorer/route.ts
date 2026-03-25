import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  let aiStartTime = 0;
  
  // Standar Tumbuh.ai: Selalu gunakan gemini-2.5-flash untuk kecepatan dan efisiensi biaya.
  // Model ini sudah sangat mumpuni untuk ekstraksi sentimen dan penilaian probabilitas.
  const AI_MODEL = "gemini-2.5-flash"; 

  try {
    const body = await req.json();
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
    
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
    }
    
    const userClientId = user.user_metadata?.client_id || user.id;
    if (userClientId !== clientId) {
      return NextResponse.json({ error: "Akses ditolak. Tindakan mencurigakan terdeteksi." }, { status: 403 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "Data leads kosong" }, { status: 400 });
    }

    // ========================================================================
    // 2. SANITASI & PEMBATASAN PAYLOAD (ANTI-OVERLOAD & HEMAT BIAYA)
    // ========================================================================
    if (leads.length > 20) {
      return NextResponse.json({ error: "Maksimal 20 leads per radar agar deteksi closing lebih akurat." }, { status: 400 });
    }

    const chatDataToAnalyze = leads.map((lead: any) => ({
      id: lead.id,
      name: lead.customer_name || "Anonim",
      phone: lead.customer_phone || "-",
      chat: (lead.full_chat || "Tidak ada riwayat").slice(0, 500) // 🛡️ BATAS 500 KARAKTER
    }));

    // ========================================================================
    // 3. CEK & POTONG KUOTA GLOBAL
    // ========================================================================
    const quotaCheck = await checkAndDeductQuota(clientId, 1);
    
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: quotaCheck.status });
    }

    // ========================================================================
    // 4. PROSES AI GENERATION
    // ========================================================================
    const model = genAI.getGenerativeModel({ 
      model: AI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Hot Lead Radar" dari Tumbuh.ai, seorang Sales Strategist kelas dunia.
      Tugas Anda adalah membedah riwayat chat untuk mendeteksi "Buying Signals" (Sinyal Beli) dan memberikan skor probabilitas closing.

      === DATA INPUT ===
      Data Chat: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA PENILAIAN (SCORING RULES) ===
      Berikan skor 1-100 berdasarkan kriteria berikut:
      1. Explicit Intent (+40): Pelanggan bertanya harga spesifik, cara bayar, atau nomor rekening.
      2. Urgency (+20): Pelanggan butuh produk segera (contoh: "bisa kirim hari ini?", "besok mau dipakai").
      3. Resolved Objections (+20): Pelanggan sempat ragu tapi sudah diyakinkan dan tetap lanjut bertanya.
      4. High Frequency (+20): Pelanggan aktif bertanya banyak detail teknis.

      Potong Skor jika:
      - Ghosting: Terhenti di pertanyaan harga tanpa respon lanjut (-30).
      - Hard Objection: Mengatakan "mahal banget" atau "cari yang lain dulu" (-40).

      === ATURAN OUTPUT (JSON MURNI) ===
      Pilih maksimal 3 pelanggan dengan closing_score tertinggi.
      Keluarkan output WAJIB JSON ARRAY murni:

      [
        {
          "id": "ID asli",
          "customer_name": "Nama pelanggan",
          "customer_phone": "Nomor HP",
          "closing_score": <angka 1-100>,
          "urgency_level": "High/Medium/Low",
          "ai_reasoning": "Jelaskan sinyal beli apa yang ditemukan (misal: Bertanya ongkir & cara bayar) dan apa hambatan yang masih tersisa."
        }
      ]
    `;

    console.log(`[HOT LEAD RADAR] Memindai probabilitas closing untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING (ANTI-CRASH)
    // ========================================================================
    let scoredLeads;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      scoredLeads = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON dari Gemini:", result.response.text());
      throw new Error("Sistem radar AI mendeteksi anomali pada format."); 
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
    }).catch(err => console.error("❌ Gagal mencatat log telemetry:", err));

    return NextResponse.json({ 
      scoredLeads,
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND LEAD SCORER:", error);

    // 🔴 CCTV PENCATATAN ERROR
    if (aiStartTime > 0) {
      logAiUsage({
        clientId: "unknown", 
        modelUsed: AI_MODEL,
        latencyMs: Math.round(performance.now() - aiStartTime),
        status: 'error'
      }).catch(() => {}); // Silent catch
    }

    return NextResponse.json({ error: "Sistem radar sedang sibuk memproses antrean. Coba sebentar lagi." }, { status: 500 });
  }
}