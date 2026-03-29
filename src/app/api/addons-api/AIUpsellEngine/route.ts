import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota dari markas pusat!
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";
import { genAI } from "@/lib/gemini";

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
    if (!user) return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
    
    const userClientId = user.user_metadata?.client_id || user.id;
    if (userClientId !== clientId) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

    // ========================================================================
    // 2. SANITASI & PEMBATASAN PAYLOAD
    // ========================================================================
    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "Data leads kosong" }, { status: 400 });
    }

    // Guardrail: Maksimal 20 leads
    if (leads.length > 20) {
      return NextResponse.json({ error: "Maksimal 20 leads per deteksi agar strategi Upsell tetap tajam dan natural." }, { status: 400 });
    }

    // Ambil data penting saja dan POTONG chat history (Max 1000 char)
    const chatDataToAnalyze = leads.map((lead: any) => ({
      id: lead.id,
      name: lead.customer_name,
      phone: lead.customer_phone,
      needs: lead.customer_needs,
      chat: (lead.full_chat || "Tidak ada riwayat chat panjang").slice(0, 1000)
    }));

    // ========================================================================
    // 3. CEK & POTONG KUOTA GLOBAL (WAJIB MESKIPUN PAKAI FLASH!)
    // ========================================================================
    const quotaCheck = await checkAndDeductQuota(clientId, 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: quotaCheck.status });
    }

    // ========================================================================
    // 4. PROSES AI GENERATION (UPSELL ENGINE)
    // ========================================================================
    const model = genAI.getGenerativeModel({ 
      model: AI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Upsell Engine" dari Tumbuh.ai, seorang Chief Growth Officer yang ahli dalam memaksimal nilai umur pelanggan (Customer Lifetime Value).
      Tugas Anda adalah mendeteksi peluang Cross-selling atau Upselling berdasarkan kebutuhan yang terucap maupun tersirat di riwayat chat.

      === DATA INPUT ===
      Riwayat Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA STRATEGI (VALUE LADDER FRAMEWORK) ===
      Identifikasi peluang berdasarkan 3 kriteria ini:
      1. Speed & Ease (+40): Tawarkan layanan yang membuat pelanggan mencapai tujuannya lebih CEPAT atau lebih MUDAH.
      2. Completeness (+30): Tawarkan produk pendamping (Cross-sell) yang melengkapi apa yang sudah mereka tanyakan.
      3. Premium Upgrade (+30): Tawarkan versi yang lebih eksklusif/lengkap (Upsell) jika mereka menunjukkan profil "High-Value Customer".

      === INSTRUKSI PESAN (PITCHING) ===
      Draf pesan (ai_pitch_msg) harus menggunakan teknik "Assumptive Close" yang sopan:
      - Gunakan bahasa yang membantu: "Karena Kakak tertarik dengan [A], mungkin [B] akan sangat membantu agar [Hasil] lebih maksimal."
      - Jangan terlihat seperti promosi massal. Harus terasa personal dan solutif.

      === ATURAN OUTPUT (JSON MURNI) ===
      Pilih maksimal 3 pelanggan dengan skor potensi tertinggi.
      Keluarkan output WAJIB JSON ARRAY murni:

      [
        {
          "id": "ID pelanggan asli",
          "customer_name": "Nama pelanggan",
          "customer_phone": "Nomor HP",
          "customer_needs": "Kebutuhan asli pelanggan",
          "suggested_product": "Nama layanan/produk tambahan yang diusulkan",
          "potential_value": "High/Medium",
          "ai_pitch_msg": "Isi pesan WhatsApp yang solutif dan personal menggunakan framework Value Ladder."
        }
      ]
    `;

    console.log(`[UPSELL ENGINE] Mencari celah cuan tambahan untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING
    // ========================================================================
    let upsellLeads;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      upsellLeads = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON Upsell Engine:", result.response.text());
      throw new Error("Sistem gagal merangkum data upsell."); 
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
    }).catch(err => console.error("❌ Gagal mencatat log telemetry Upsell:", err));

    return NextResponse.json({ 
      upsellLeads,
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND UPSELL ENGINE:", error);

    if (aiStartTime > 0) {
      logAiUsage({ clientId: "unknown", modelUsed: AI_MODEL, latencyMs: 0, status: 'error' }).catch(() => {});
    }

    return NextResponse.json({ error: "Sistem Upsell sedang sibuk. Coba lagi nanti." }, { status: 500 });
  }
}