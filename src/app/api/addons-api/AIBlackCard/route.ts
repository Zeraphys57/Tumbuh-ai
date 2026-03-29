import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";
import { genAI } from "@/lib/gemini";

export async function POST(req: Request) {
  let aiStartTime = 0;
  
  // Ubah ke "gemini-2.5-pro" jika hasil Flash kurang memuaskan untuk level VIP
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
    
    // Pastikan user yang login hanya memproses data miliknya sendiri
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
      return NextResponse.json({ error: "Maksimal 50 leads per analisis agar hasil maksimal." }, { status: 400 });
    }

    const chatDataToAnalyze = leads.map((lead: any) => ({
      name: lead.customer_name || "Anonim",
      needs: lead.customer_needs || "Tidak spesifik",
      // Potong chat maksimal 500 karakter per orang agar token tidak bengkak
      chat: (lead.full_chat || "Tidak ada riwayat").slice(0, 1000) 
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
      Anda adalah "Black Card Architect", ahli strategi bisnis High-Ticket dan Recurring Revenue kelas dunia.
      Tugas Anda adalah merancang Program VIP (Membership/Retainer) yang eksklusif berdasarkan data interaksi pelanggan.

      === DATA INPUT ===
      Riwayat Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}

      === FRAMEWORK PERANCANGAN (WAJIB DIPATUHI) ===
      1. VALUE EQUATION (Alex Hormozi): Pastikan penawaran memaksimalkan "Dream Outcome" pelanggan dan meminimalkan "Effort & Sacrifice" mereka.
      2. EXCLUSIVITY SCARCITY: Program VIP harus memiliki elemen batasan (kuota atau syarat masuk) agar harganya bisa tinggi (High-Ticket).
      3. CONTINUITY MODEL: Fokus pada layanan yang bisa dibayar bulanan/tahunan (Subscription/Retainer) untuk menjaga kestabilan kas bisnis.

      === INSTRUKSI OUTPUT ===
      Rancang 2 Program VIP (Tier Menengah dan Tier Elit). 
      DILARANG memberikan kalimat pembuka/penutup. Output WAJIB JSON ARRAY murni:

      [
        {
          "tier_name": "[Nama Tier yang Terasa Mewah & Eksklusif]",
          "target_audience": "[Segmen pelanggan spesifik dari chat yang paling cocok untuk program ini]",
          "pricing_model": "[Rekomendasi harga High-Ticket dan skema bayarnya (misal: Rp 5jt/bln)]",
          "core_perks": [
            "Manfaat 1: Mengurangi hambatan [Masalah di chat]",
            "Manfaat 2: Memberikan akses VIP ke [Kebutuhan di chat]",
            "Manfaat 3: Hasil instan berupa [Dream Outcome]"
          ],
          "pitch_script": "[Copywriting script pendek menggunakan teknik 'High-Status Invitation' untuk ditawarkan via WhatsApp]"
        }
      ]
    `;

    aiStartTime = performance.now();
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now();
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING (ANTI-CRASH)
    // ========================================================================
    let vipPrograms;
    try {
      const rawText = result.response.text().trim();
      // Bersihkan backticks markdown jika AI masih bandel menyertakannya
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      vipPrograms = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON dari Gemini:", result.response.text());
      // Jika AI halusinasi format, kembalikan sisa kuota (opsional, tapi baik untuk UX)
      throw new Error("Format respons AI tidak valid."); 
    }

    // ========================================================================
    // 6. CCTV LOGGING DENGAN CATCH (ANTI-UNHANDLED REJECTION)
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
      vipPrograms, 
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND BLACK CARD:", error);

    if (aiStartTime > 0) {
      logAiUsage({
        clientId: "unknown",
        modelUsed: AI_MODEL,
        latencyMs: Math.round(performance.now() - aiStartTime),
        status: 'error'
      }).catch(() => {}); // Silent catch
    }

    return NextResponse.json({ error: "Sistem sedang optimalisasi data. Silakan coba sesaat lagi." }, { status: 500 });
  }
}