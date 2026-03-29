import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";
import { genAI } from "@/lib/gemini";

export async function POST(req: Request) {
  let aiStartTime = 0;
  
  // 💡 STANDAR COST-EFFICIENCY: 
  // Untuk tugas merangkum teks menjadi Markdown (bukan JSON), gemini-2.5-flash sudah sangat cerdas, 
  // jauh lebih cepat, dan biayanya sangat murah.
  const AI_MODEL = "gemini-2.5-flash"; 

  try {
    const body = await req.json();
    
    // ⚠️ PERHATIAN: Pastikan Frontend mengirimkan clientId!
    const { month, needs, clientId } = body;

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

    if (!needs || !month) {
      return NextResponse.json({ error: "Data bulan atau kumpulan needs tidak boleh kosong." }, { status: 400 });
    }

    // ========================================================================
    // 2. SANITASI PAYLOAD (ANTI-OVERLOAD & HEMAT BIAYA)
    // ========================================================================
    // Memastikan needs diubah jadi string dan dibatasi maksimal 5000 karakter (~1000 kata)
    // agar tagihan API tidak meledak jika ada anomali log data berlebihan.
    const rawNeedsString = typeof needs === "string" ? needs : JSON.stringify(needs);
    const sanitizedNeeds = rawNeedsString.slice(0, 5000); 

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
    const model = genAI.getGenerativeModel({ model: AI_MODEL });

    const prompt = `
      Kamu adalah Konsultan Bisnis Profesional (Tumbuh AI Analytics).
      Tugasmu adalah menganalisis data kumpulan kebutuhan pelanggan (needs/request) dari suatu bisnis pada periode ${month}.

      Berikut adalah data mentah permintaan pelanggan (maksimal 5000 karakter):
      ${sanitizedNeeds}

      Tolong berikan "Executive Summary" dalam format Markdown dengan 3 bagian yang ringkas, padat, dan menggunakan bahasa Indonesia yang profesional namun asik:
      1. **📈 Tren Utama Bulan Ini**: Apa pola terbanyak dari permintaan pelanggan?
      2. **🎯 Peluang Terselubung**: Adakah request unik yang muncul beberapa kali yang bisa dijadikan peluang layanan baru?
      3. **💡 Rekomendasi Tumbuh**: 1 aksi nyata yang sebaiknya dilakukan owner bisnis bulan depan berdasarkan data ini.

      PENTING: Jangan membuat kalimat pembuka/penutup basa-basi. Langsung berikan poin-poinnya.
    `;

    console.log(`[TUMBUH ANALYTICS] Merangkum trend bulan ${month} untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(prompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;
    const textReply = result.response.text().trim();

    // ========================================================================
    // 5. CCTV LOGGING
    // ========================================================================
    logAiUsage({
      clientId,
      modelUsed: AI_MODEL,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      latencyMs,
      status: 'success'
    }).catch(err => console.error("❌ Gagal mencatat log telemetry Analytics:", err));

    return NextResponse.json({ 
      reply: textReply,
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND ANALYTICS:", error);

    // 🔴 CCTV PENCATATAN ERROR
    if (aiStartTime > 0) {
      // Walaupun body.clientId gagal diekstrak, minimal kita tahu ada error di sistem
      logAiUsage({
        clientId: "unknown", 
        modelUsed: AI_MODEL,
        latencyMs: Math.round(performance.now() - aiStartTime),
        status: 'error'
      }).catch(() => {}); // Silent catch
    }

    return NextResponse.json(
      { error: "Gagal memproses analitik. Coba lagi nanti." }, 
      { status: 500 }
    );
  }
}