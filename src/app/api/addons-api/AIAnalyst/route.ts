import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  let aiStartTime = 0;
  
  // Catatan: Untuk laporan Markdown standar, Flash seringkali sudah sangat pintar dan jauh lebih murah.
  // Tapi jika analisa bisnisnya kurang tajam, silakan naikkan ke "gemini-2.5-pro".
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
      return NextResponse.json({ error: "Maksimal 20 leads per analisis agar laporan fokus dan akurat." }, { status: 400 });
    }

    // Hanya ambil data yang diperlukan dan potong history chat yang terlalu panjang
    const sanitizedLeads = leads.map((lead: any) => ({
      name: lead.customer_name || "Anonim",
      needs: lead.customer_needs || "Tidak spesifik",
      chat: (lead.full_chat || "").slice(0, 500) // 🛡️ BATAS 500 KARAKTER PER LEAD
    }));

    // ========================================================================
    // 3. CEK & POTONG KUOTA GLOBAL
    // ========================================================================
    const quotaCheck = await checkAndDeductQuota(clientId, 1);
    
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: quotaCheck.status });
    }

    // ========================================================================
    // 4. PROSES DATA KE GEMINI
    // ========================================================================

    const currentMonth = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const prompt = `
      Anda adalah "Chief Strategy Officer" di Tumbuh AI.
      Tugas Anda adalah membedah data mentah Voice of Customer (VoC) pada periode ${currentMonth} menggunakan framework analisis bisnis tingkat lanjut.

      Data Mentah (Needs/Request):
      ${sanitizedLeads}

      Berikan "Executive Insight" dalam format Markdown dengan bahasa Indonesia yang tajam, profesional, dan berorientasi pada pertumbuhan (growth-oriented). 
      Terapkan framework berikut dalam menyusun laporan:

      1. **📈 VoC Trend Analysis (Tren Utama)**:
         - Analisa data di atas. Apa pola permintaan terbanyak?
         - Pisahkan mana yang merupakan "Pain Points" (masalah mendesak yang bikin pelanggan frustrasi) dan mana yang "Gain Creators" (keinginan tambahan/tersier).

      2. **🎯 Jobs-to-be-Done (Peluang Terselubung)**:
         - Analisa menggunakan framework JTBD: Apa hasil emosional atau fungsional yang sebenarnya ingin dicapai pelanggan dari request yang jarang/unik muncul?
         - Ubah *hidden request* tersebut menjadi 1 ide penawaran produk/layanan baru (Upsell/Cross-sell opportunity).

      3. **💡 The Pareto Action (Rekomendasi 80/20)**:
         - Berikan 1 rekomendasi operasional atau marketing yang paling berdampak besar (meningkatkan revenue/retensi) tapi butuh usaha paling minim untuk dieksekusi bulan depan.
         - Berikan panduan eksekusinya dalam 2 langkah praktis.

      PENTING: DILARANG KERAS menggunakan kalimat pembuka/penutup basa-basi (seperti "Berikut adalah analisisnya..." atau "Semoga membantu"). Langsung *to the point* ke struktur nomor 1, 2, dan 3. Gunakan formatting cetak tebal dan bullet points agar mudah dipindai oleh CEO.
    `;

    const model = genAI.getGenerativeModel({ model: AI_MODEL });

    console.log(`[AI ANALYST] Memulai analisis data untuk client: ${clientId}...`);
    
    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(prompt);
    let aiResponseText = result.response.text();
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. CCTV LOGGING (Asynchronous dengan validasi error catch)
    // ========================================================================
    logAiUsage({
      clientId,
      modelUsed: AI_MODEL,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      latencyMs,
      status: 'success'
    }).catch(err => console.error("❌ Gagal mencatat log telemetry AI Analyst:", err));

    return NextResponse.json({ 
      analysis: aiResponseText,
      remainingQuota: quotaCheck.remainingQuota // Sisa kuota sinkron dari database
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND AI ANALYST:", error);

    // 🔴 CCTV PENCATATAN ERROR
    if (aiStartTime > 0) {
      logAiUsage({
        clientId: "unknown", 
        modelUsed: AI_MODEL,
        latencyMs: Math.round(performance.now() - aiStartTime),
        status: 'error'
      }).catch(() => {}); // Silent catch agar tidak crash
    }

    return NextResponse.json({ error: "Sistem AI sedang sibuk atau data terlalu besar." }, { status: 500 });
  }
}