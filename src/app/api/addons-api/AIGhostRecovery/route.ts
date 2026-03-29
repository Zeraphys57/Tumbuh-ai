import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV (Hanya untuk log, tidak potong kuota)
import { logAiUsage } from "@/lib/quotaManager";
import { genAI } from "@/lib/gemini";

export async function POST(req: Request) {
  let aiStartTime = 0;
  
  // Karena ini fitur gratisan (unlimited) untuk klien, wajib pakai Flash.
  const AI_MODEL = "gemini-2.5-flash"; 

  try {
    const body = await req.json();
    
    // Frontend WAJIB kirim clientId untuk keperluan Auth & CCTV
    const { leads, clientId } = body;

    // ========================================================================
    // 1. GATEKEEPER AUTHENTICATION (ANTI-HIJACKING)
    // ========================================================================
    if (!clientId) {
      return NextResponse.json({ error: "Client ID diperlukan." }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Maksimal 20 leads per deteksi agar draf pesan lebih tajam." }, { status: 400 });
    }

    const chatDataToAnalyze = leads.map((lead: any) => ({
      id: lead.id,
      name: lead.customer_name || "Kak",
      phone: lead.customer_phone,
      needs: lead.customer_needs || "Layanan",
      created_at: lead.created_at || new Date().toISOString(),
      chat: (lead.full_chat || "Tidak ada riwayat").slice(0, 500) // 🛡️ BATAS 500 KARAKTER
    }));

    // ========================================================================
    // 3. PROSES AI GENERATION (TANPA PEMOTONGAN KUOTA PREMIUM)
    // ========================================================================
    const model = genAI.getGenerativeModel({ 
      model: AI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    // 💡 SUNTIKAN ILMU COPYWRITING SALES KE DALAM PROMPT
    const systemPrompt = `
      Anda adalah "Ghost Hunter", pakar Customer Re-engagement & Sales Psychology.
      Tugas Anda adalah mendeteksi pelanggan yang "Ghosting" (berhenti merespon) dan merancang pesan follow-up yang memiliki tingkat balasan (response rate) tinggi.

      === DATA INPUT ===
      Data Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA DETEKSI GHOSTING ===
      Identifikasi pelanggan yang:
      1. Percakapan terhenti setelah pemberian harga atau detail produk.
      2. Pesan terakhir dikirim oleh Admin/Bot dan tidak dibalas > 24 jam.
      3. Menunjukkan minat di awal tapi menghilang saat konfirmasi akhir.

      === STRATEGI FOLLOW-UP (DEAN JACKSON FRAMEWORK) ===
      Gunakan prinsip "The Magic 9-Word" & "No-Pressure":
      - PESAN HARUS PENDEK (Maksimal 1-2 kalimat).
      - Fokus pada SATU pertanyaan spesifik yang hanya butuh jawaban "Ya" atau "Tidak".
      - Hilangkan semua bahasa formal/kaku (Jangan pakai "Mohon maaf mengganggu", "Kami dari tim...").
      - Gunakan bahasa yang sangat kasual, seolah-olah Anda baru ingat mereka sekarang.

      === ATURAN OUTPUT (JSON MURNI) ===
      Pilih maksimal 4 pelanggan paling potensial.
      Format JSON ARRAY murni:

      [
        {
          "id": "ID pelanggan",
          "customer_name": "Nama pelanggan",
          "customer_phone": "Nomor HP",
          "customer_needs": "Kebutuhan utama mereka",
          "days_ghosting": <estimasi hari sejak chat terakhir>,
          "ai_follow_up_msg": "Isi pesan WhatsApp yang pendek & memicu balasan. Contoh: 'Halo [Nama], untuk [Produk]-nya apakah masih jadi diambil?' atau 'Kak [Nama], masih cari info soal [Kebutuhan] kemarin?'"
        }
      ]
    `;

    console.log(`[GHOST HUNTER] Memindai pelanggan ghosting untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 4. DEFENSIVE JSON PARSING (ANTI-CRASH)
    // ========================================================================
    let ghostLeads;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      ghostLeads = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON dari Gemini:", result.response.text());
      throw new Error("Sistem Ghost Hunter mendeteksi anomali pada format draf pesan."); 
    }

    // ========================================================================
    // 5. CCTV LOGGING (HANYA MENCATAT BEBAN API, TIDAK MEMOTONG KUOTA KLIEN)
    // ========================================================================
    logAiUsage({
      clientId,
      modelUsed: AI_MODEL,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      latencyMs,
      status: 'success'
    }).catch(err => console.error("❌ Gagal mencatat log telemetry Ghost Hunter:", err));

    return NextResponse.json({ ghostLeads });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND GHOST RECOVERY:", error);

    // 🔴 CCTV PENCATATAN ERROR
    if (aiStartTime > 0) {
      logAiUsage({
        clientId: "unknown", 
        modelUsed: AI_MODEL,
        latencyMs: Math.round(performance.now() - aiStartTime),
        status: 'error'
      }).catch(() => {}); // Silent catch
    }

    return NextResponse.json({ error: "Gagal mendeteksi pelanggan ghosting. Coba lagi nanti." }, { status: 500 });
  }
}