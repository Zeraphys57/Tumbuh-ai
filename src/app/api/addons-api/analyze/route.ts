import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  let aiStartTime = 0;
  // KEMBALI KE FLASH: Sesuai standar arsitektur kita! 🚀
  const AI_MODEL = "gemini-2.5-flash"; 

  try {
    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client ID tidak valid" }, { status: 400 });
    }

    // ========================================================================
    // 1. GATEKEEPER AUTHENTICATION (SSR)
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
    // 2. FETCH DATA DENGAN RLS AMAN
    // ========================================================================
    // Menggunakan supabaseAuth agar otomatis membaca RLS milik user yang login
    const { data: leads, error } = await supabaseAuth
      .from("leads")
      .select("customer_name, customer_needs, created_at, total_people")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50); // 50 data cukup aman untuk Flash

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return NextResponse.json({ analysis: "Belum ada data pelanggan yang cukup untuk dianalisis." });
    }

    // ========================================================================
    // 3. CEK & POTONG KUOTA GLOBAL
    // ========================================================================
    const quotaCheck = await checkAndDeductQuota(clientId, 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: quotaCheck.status });
    }

    // ========================================================================
    // 4. FORMAT DATA
    // ========================================================================
    const rawDataString = leads.map(lead => 
      `Tanggal: ${new Date(lead.created_at).toLocaleDateString('id-ID')} | Kebutuhan/Keluhan: ${lead.customer_needs} | Jumlah Orang: ${lead.total_people || 1}`
    ).join("\n");

    // ========================================================================
    // 5. PROSES AI GENERATION (JSON MODE)
    // ========================================================================
    const model = genAI.getGenerativeModel({ 
      model: AI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const analysisPrompt = `
      Anda adalah Business Analyst & Konsultan Ahli tingkat atas.
      Berikut adalah data ${leads.length} prospek/pelanggan terakhir. 
      Tugasmu adalah memberikan "Executive Summary" untuk Pemilik Bisnis.

      === DATA PELANGGAN ===
      ${rawDataString}

      === ATURAN OUTPUT (JSON MURNI) ===
      Gunakan bahasa Indonesia yang profesional, persuasif, dan mudah dipahami.
      Output WAJIB JSON dengan format berikut (isi field menggunakan format Markdown):

      {
        "trend_summary": "### 📊 Ringkasan Tren\\n(Jelaskan tren mayoritas pelanggan mencari apa bulan ini)",
        "upsell_opportunities": "### 💡 Peluang Bisnis (Upselling)\\n(Layanan apa yang paling laku atau layanan baru apa yang bisa ditawarkan?)",
        "attention_areas": "### ⚠️ Area Perhatian\\n(Pola masalah atau komplain yang harus diperhatikan)"
      }
    `;

    console.log(`[AI ANALYST] Menyusun Executive Summary untuk client: ${clientId}...`);

    aiStartTime = performance.now();
    const result = await model.generateContent(analysisPrompt);
    const aiEndTime = performance.now();
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 6. DEFENSIVE JSON PARSING & MERGING
    // ========================================================================
    let analysisData;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      analysisData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON AI Analyst:", result.response.text());
      throw new Error("Gagal menyusun laporan eksekutif."); 
    }

    // Gabungkan kembali menjadi satu string Markdown utuh untuk dikirim ke frontend
    const finalAnalysis = `${analysisData.trend_summary}\n\n${analysisData.upsell_opportunities}\n\n${analysisData.attention_areas}`;

    // ========================================================================
    // 7. CCTV LOGGING
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
      analysis: finalAnalysis,
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND AI ANALYST:", error);

    if (aiStartTime > 0) {
      logAiUsage({ clientId: "unknown", modelUsed: AI_MODEL, latencyMs: 0, status: 'error' }).catch(() => {});
    }

    return NextResponse.json({ error: "Gagal melakukan analisis data." }, { status: 500 });
  }
}