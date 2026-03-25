import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota dari markas pusat!
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  let aiStartTime = 0;
  // KEMBALI KE FLASH: Cerdas, Cepat, dan Murah! 🚀
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
      return NextResponse.json({ error: "Maksimal 20 leads per analisis untuk menjaga kualitas ide kolaborasi." }, { status: 400 });
    }

    const chatDataToAnalyze = leads.map((lead: any) => ({
      needs: lead.customer_needs,
      chat: (lead.full_chat || "Tidak ada riwayat").slice(0, 1000) // Potong 1000 karakter
    }));

    // ========================================================================
    // 3. CEK & POTONG KUOTA GLOBAL (VIA HELPER)
    // ========================================================================
    const quotaCheck = await checkAndDeductQuota(clientId, 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: quotaCheck.status });
    }

    // ========================================================================
    // 4. PROSES AI GENERATION (SYNDICATE ARCHITECT)
    // ========================================================================
    const model = genAI.getGenerativeModel({ 
      model: AI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Syndicate Architect", Chief Strategy Officer elit yang spesialis dalam M&A dan B2B Strategic Partnership.
      Tugas Anda adalah menganalisis riwayat chat untuk menemukan layanan/produk yang sering dicari pelanggan tapi TIDAK dijual oleh klien kami, lalu merancang kemitraan strategis.

      === DATA INPUT ===
      Data Chat: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA ANALISIS (ECOSYSTEM SYNERGY) ===
      Gunakan framework "Value Chain Complementarity":
      1. Identify Unmet Needs: Apa hal yang ditanyakan pelanggan sebelum atau sesudah menggunakan jasa klien kami?
      2. Partner Target: Cari bisnis lokal yang memiliki pelanggan yang sama tapi tidak bersaing langsung (Complementary Assets).
      3. Synergy Logic: Jelaskan mengapa kemitraan ini saling menguntungkan (Win-Win).
      4. Monetization: Bagaimana skema bagi hasilnya (Referral fee, Bundling package, atau Shared space).

      === ATURAN OUTPUT (JSON MURNI) ===
      Rancang 2 ide "Strategic B2B Partnership". DILARANG narasi pembuka.
      Output WAJIB JSON ARRAY murni:

      [
        {
          "partner_target": "[Kategori Bisnis & Contohnya, misal: Kedai Kopi Lokal / Fotografer]",
          "synergy_logic": "[Penjelasan logis kenapa pelanggan bisnis tersebut pasti butuh kita, dan sebaliknya]",
          "monetization_model": "[Skema cuan: Misal Komisi 10% per referral atau Paket Bundling Khusus]",
          "b2b_pitch_script": "[Draft naskah profesional untuk pemilik bisnis tersebut agar mau diajak kerjasama melalui WA/Email]"
        }
      ]
    `;

    console.log(`[SYNDICATE ENGINE] Merancang kemitraan B2B untuk client: ${clientId}...`);

    aiStartTime = performance.now();
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now();
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING
    // ========================================================================
    let syndicates;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      syndicates = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON Syndicate Engine:", result.response.text());
      throw new Error("Sistem Syndicate Architect mendeteksi anomali pada pemetaan kemitraan."); 
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
    }).catch(err => console.error("❌ Gagal mencatat log telemetry Syndicate:", err));

    return NextResponse.json({ 
      syndicates,
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND SYNDICATE ENGINE:", error);

    if (aiStartTime > 0) {
      logAiUsage({ clientId: "unknown", modelUsed: AI_MODEL, latencyMs: 0, status: 'error' }).catch(() => {});
    }

    return NextResponse.json({ error: "Sistem Syndicate sedang memetakan ekosistem. Coba lagi nanti." }, { status: 500 });
  }
}