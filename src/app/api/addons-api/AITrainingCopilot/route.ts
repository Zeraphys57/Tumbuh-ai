import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota dari markas pusat!
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  let aiStartTime = 0;
  const AI_MODEL = "gemini-2.5-flash"; // Tetap pertahankan Flash untuk efisiensi!

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
      return NextResponse.json({ error: "Maksimal 20 leads per audit agar AI bisa fokus menemukan celah Knowledge Base." }, { status: 400 });
    }

    // Ambil data untuk dianalisa (Slice 1000 karakter agar FAQ yang digali akurat)
    const chatDataToAnalyze = leads.map((lead: any) => ({
      chat_history: (lead.full_chat || "Tidak ada riwayat chat").slice(0, 1000)
    }));

    // ========================================================================
    // 3. CEK & POTONG KUOTA GLOBAL (VIA HELPER)
    // ========================================================================
    const quotaCheck = await checkAndDeductQuota(clientId, 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: quotaCheck.status });
    }

    // ========================================================================
    // 4. PROSES AI GENERATION (TRAINING COPILOT)
    // ========================================================================
    const model = genAI.getGenerativeModel({ 
      model: AI_MODEL,
      // FITUR SAKTI: JSON MODE AKTIF
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Training Copilot", auditor sistem Knowledge Management tingkat tinggi.
      Tugas Anda adalah membedah riwayat chat untuk mengidentifikasi "Knowledge Gaps" (Celah Pengetahuan) di mana pelanggan bertanya namun sistem belum memberikan jawaban yang memuaskan atau pertanyaan tersebut muncul berulang kali.

      === DATA INPUT ===
      Riwayat Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA AUDIT (KNOWLEDGE GAP ANALYSIS) ===
      Identifikasi 3 celah informasi paling kritis berdasarkan:
      1. High Frequency (+40): Pertanyaan yang muncul berulang dengan pola kata kunci yang sama.
      2. High Friction (+30): Pertanyaan yang jika tidak dijawab dengan jelas akan menghambat proses transaksi (misal: kebijakan refund, garansi, atau cara penggunaan).
      3. Intent Complexity (+30): Pertanyaan spesifik yang membutuhkan penjelasan mendetail dan belum terakomodasi dalam FAQ standar.

      === INSTRUKSI DRAF JAWABAN ===
      Rancang "suggested_answer" menggunakan gaya bahasa yang:
      - Profesional namun ramah (Sesuai Persona Tumbuh.ai).
      - Informatif dan terstruktur (Gunakan poin-poin jika perlu).
      - Mengandung Call to Action (CTA) di akhir jawaban untuk mendorong konversi.

      === ATURAN OUTPUT (JSON MURNI) ===
      DILARANG memberikan kalimat pembuka/penutup. Output WAJIB JSON ARRAY murni:

      [
        {
          "question": "[Pertanyaan yang sering ditanyakan atau celah informasi yang ditemukan]",
          "suggested_answer": "[Draf jawaban lengkap yang siap dimasukkan ke Knowledge Base]",
          "occurrence": <estimasi jumlah kemunculan pola pertanyaan ini di data chat>,
          "priority_level": "High/Medium/Low",
          "reasoning": "Alasan kenapa informasi ini krusial untuk ditambahkan ke database bot."
        }
      ]
    `;

    console.log(`[TRAINING COPILOT] Mengaudit FAQ untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING (Sabuk Pengaman Ekstra)
    // ========================================================================
    let faqs;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      faqs = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON Training Copilot:", result.response.text());
      throw new Error("Sistem gagal merangkum hasil audit FAQ."); 
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
    }).catch(err => console.error("❌ Gagal mencatat log telemetry Copilot:", err));

    return NextResponse.json({ 
      faqs,
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND TRAINING COPILOT:", error);

    if (aiStartTime > 0) {
      logAiUsage({ clientId: "unknown", modelUsed: AI_MODEL, latencyMs: 0, status: 'error' }).catch(() => {});
    }

    return NextResponse.json({ error: "Sistem Copilot sedang sibuk. Coba lagi nanti." }, { status: 500 });
  }
}