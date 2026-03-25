import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  let aiStartTime = 0;
  
  // Model Flash sangat direkomendasikan untuk tugas pemetaan JSON terstruktur seperti ini.
  // Ini menjaga cost SaaS kamu tetap rendah namun dengan akurasi yang tetap tinggi.
  const AI_MODEL = "gemini-2.5-flash"; 

  try {
    const body = await req.json();
    const { leads, avgTicketSize, clientId } = body;

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
    if (leads.length > 50) {
      return NextResponse.json({ error: "Maksimal 50 leads per analisis agar akurasi alasan gagal closing tetap tajam." }, { status: 400 });
    }

    const chatDataToAnalyze = leads.map((lead: any) => ({
      customer_needs: lead.customer_needs || "Tidak spesifik",
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
      Anda adalah "Market Oracle", seorang Chief Revenue Officer (CRO) elit dengan spesialisasi Revenue Recovery.
      Tugas Anda adalah membedah riwayat chat pelanggan untuk mengidentifikasi "Lost Revenue" (kebocoran pendapatan) dan memberikan diagnosa strategis yang tajam.

      === DATA INPUT ===
      Data Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}
      Rata-rata Nilai Transaksi (Avg Ticket Size): Rp ${avgTicketSize || 0}

      === INSTRUKSI ANALISIS (WAJIB DIPATUHI) ===
      1. DIAGNOSA B.A.N.T: Klasifikasikan setiap alasan pelanggan batal beli ke dalam salah satu kategori framework B.A.N.T:
         - BUDGET: Keberatan harga, ongkir, atau dana tidak cukup.
         - AUTHORITY: Tidak punya kuasa beli (perlu izin pasangan/atasan).
         - NEED: Produk tidak menjawab solusi atau fitur yang dicari tidak ada.
         - TIMING: Butuh produknya, tapi belum bisa sekarang (nanti/besok/gajian).

      2. ESTIMASI FINANSIAL: Hitung total potensi uang yang hilang (Lost Revenue) dengan rumus: [Jumlah Lost Leads] x [Avg Ticket Size].

      3. STRATEGI PEMULIHAN (CIALDINI): Berikan rekomendasi tindakan menggunakan "6 Principles of Persuasion" (Scarcity, Reciprocity, Social Proof, Authority, Liking, atau Commitment). 

      === ATURAN OUTPUT (JSON MURNI) ===
      - DILARANG memberikan teks pembuka atau penutup.
      - Harus menghasilkan JSON ARRAY murni yang valid untuk di-parse.

      Format JSON:
      {
        "totalLostRevenue": <angka saja, hasil perhitungan>,
        "lostLeadsCount": <jumlah total orang yang terdeteksi 'ghosting' atau menolak>,
        "topReasons": [
          { 
            "reason": "BANT - [Kategori]: [Ringkasan Alasan Spesifik]", 
            "percentage": <angka 1-100> 
          }
        ],
        "aiRecommendations": [
          "Taktik [Nama Prinsip Cialdini]: [Instruksi tindakan nyata yang spesifik untuk tim sales/marketing]"
        ]
      }
    `;

    console.log(`[MARKET ORACLE] Menganalisa potensial lost revenue untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING (ANTI-CRASH)
    // ========================================================================
    let oracleData;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      oracleData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON dari Gemini:", result.response.text());
      throw new Error("Sistem Oracle mendeteksi anomali pada format perhitungan."); 
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
      oracleData, 
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND MARKET ORACLE:", error);

    // 🔴 CCTV PENCATATAN ERROR
    if (aiStartTime > 0) {
      logAiUsage({
        clientId: "unknown", 
        modelUsed: AI_MODEL,
        latencyMs: Math.round(performance.now() - aiStartTime),
        status: 'error'
      }).catch(() => {}); // Silent catch
    }

    return NextResponse.json({ error: "Sistem Oracle sedang sibuk menghitung data. Coba beberapa saat lagi." }, { status: 500 });
  }
}