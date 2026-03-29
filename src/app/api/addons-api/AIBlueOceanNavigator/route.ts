import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Import Helper CCTV & Gatekeeper Kuota
import { checkAndDeductQuota, logAiUsage } from "@/lib/quotaManager";
import { genAI } from "@/lib/gemini";

export async function POST(req: Request) {
  let aiStartTime = 0;
  
  // Model Flash sudah sangat cerdas untuk format JSON terstruktur seperti ini.
  // Jika dirasa ide bisnisnya kurang "liar" atau kurang dalam, baru naikkan ke "gemini-2.5-pro".
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
    if (leads.length > 50) {
      return NextResponse.json({ error: "Maksimal 50 leads per analisis agar ide lebih tajam." }, { status: 400 });
    }

    const chatDataToAnalyze = leads.map((lead: any) => ({
      customer_needs: lead.customer_needs || "Tidak spesifik",
      chat_history: (lead.full_chat || "Tidak ada riwayat").slice(0, 1000) // 🛡️ BATAS 500 KARAKTER
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
      Anda adalah "Blue Ocean Navigator", konsultan strategi bisnis dari Tumbuh.ai yang ahli dalam mendeteksi pasar baru yang belum terjamah (Uncontested Market Space).
      Tugas Anda adalah membedah data chat pelanggan untuk menemukan "Value Innovation" menggunakan Blue Ocean Strategy Framework.

      === DATA INPUT ===
      Riwayat Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA ANALISIS (ERRC FRAMEWORK) ===
      Identifikasi 2 ide produk/layanan yang memenuhi kriteria berikut:
      1. Eliminate: Apa fitur/proses yang selama ini merepotkan pelanggan dan bisa kita hapus?
      2. Reduce: Apa elemen yang standarnya terlalu tinggi di pasar tapi sebenarnya tidak terlalu dibutuhkan pelanggan?
      3. Raise: Apa standar yang harus kita naikkan jauh di atas rata-rata industri?
      4. Create: Apa elemen BARU yang belum pernah ditawarkan kompetitor untuk menjawab "unmet needs" (keinginan tersembunyi) di chat tersebut?

      === ATURAN OUTPUT (JSON MURNI) ===
      DILARANG memberikan kalimat pembuka/penutup. Output WAJIB JSON ARRAY murni:

      [
        {
          "product_name": "[Nama Produk yang Catchy & Premium]",
          "demand_count": <estimasi jumlah pelanggan dari data chat yang butuh ini>,
          "suggested_price": <angka harga premium yang masuk akal>,
          "est_new_revenue": <hasil perkalian demand_count x suggested_price>,
          "launch_strategy": "Langkah taktis 1, 2, 3 untuk meluncurkan layanan ini dengan risiko rendah.",
          "marketing_copy": "[Copywriting singkat yang fokus pada Value Innovation, bukan perang harga]"
        }
      ]
    `;

    console.log(`[BLUE OCEAN ADDON] Meracik ide inovasi untuk client: ${clientId}...`);

    aiStartTime = performance.now(); // ⏱️ CCTV START
    const result = await model.generateContent(systemPrompt);
    const aiEndTime = performance.now(); // ⏱️ CCTV STOP
    
    const latencyMs = Math.round(aiEndTime - aiStartTime);
    const usage = result.response.usageMetadata;

    // ========================================================================
    // 5. DEFENSIVE JSON PARSING (ANTI-CRASH)
    // ========================================================================
    let generatedIdeas;
    try {
      const rawText = result.response.text().trim();
      const cleanJson = rawText.replace(/```json|```/g, "").trim(); 
      generatedIdeas = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal parsing JSON dari Gemini:", result.response.text());
      throw new Error("Sistem AI memberikan format yang tidak valid."); 
    }

    // ========================================================================
    // 6. SIMPAN KE DATABASE (BLUEPRINTS CACHE)
    // ========================================================================
    const { error: saveError } = await supabaseAuth
      .from("ai_blueprints")
      .upsert({ 
          client_id: clientId, 
          blueprint_type: "blue_ocean", 
          content: generatedIdeas 
      }, { onConflict: 'client_id,blueprint_type' });

    if (saveError) {
      console.error("⚠️ Gagal menyimpan blueprint ke database:", saveError.message);
      // Kita tidak melempar error di sini, agar user tetap bisa melihat idenya di layar
      // meskipun gagal tersimpan di database.
    }

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
    }).catch(err => console.error("❌ Gagal mencatat log telemetry:", err));

    return NextResponse.json({ 
      ideas: generatedIdeas, 
      remainingQuota: quotaCheck.remainingQuota 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND BLUE OCEAN:", error);

    // 🔴 CCTV PENCATATAN ERROR
    if (aiStartTime > 0) {
      logAiUsage({
        clientId: "unknown", 
        modelUsed: AI_MODEL,
        latencyMs: Math.round(performance.now() - aiStartTime),
        status: 'error'
      }).catch(() => {}); // Silent catch
    }

    return NextResponse.json({ error: "Sistem sedang mencari inspirasi. Coba lagi dalam beberapa saat." }, { status: 500 });
  }
}