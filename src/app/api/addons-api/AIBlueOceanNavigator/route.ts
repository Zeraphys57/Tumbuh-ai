import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js"; // Gunakan standar admin client untuk server

// Inisialisasi Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Inisialisasi Supabase Admin (Gunakan Service Role Key jika ingin bypass RLS di server, atau Anon Key biasa)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads, clientId } = body; // Pastikan clientId dikirim dari frontend

    // --- 1. VALIDASI INPUT ---
    if (!clientId) {
      return NextResponse.json({ error: "Client ID diperlukan untuk verifikasi kuota" }, { status: 400 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "Data leads kosong" }, { status: 400 });
    }

    // --- 2. CEK SISA KUOTA DI DATABASE ---
    const { data: client, error: quotaError } = await supabase
      .from("clients")
      .select("premium_quota_left")
      .eq("id", clientId)
      .maybeSingle();

    if (quotaError || !client) {
      return NextResponse.json({ error: "Gagal memverifikasi identitas client" }, { status: 500 });
    }

    if (client.premium_quota_left <= 0) {
      return NextResponse.json({ 
        error: "Kuota Premium AI Anda habis (Limit: 5/bln). Silakan hubungi admin Tumbuh.ai untuk upgrade!" 
      }, { status: 403 });
    }

    // --- 3. PROSES DATA UNTUK AI ---
    const chatDataToAnalyze = leads.map((lead: any) => ({
      customer_needs: lead.customer_needs,
      chat_history: lead.full_chat || "Tidak ada riwayat chat panjang"
    }));

    // Gunakan Gemini 2.5 Pro
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Blue Ocean Navigator", konsultan bisnis elit.
      Tugas: Analisa data chat berikut untuk menemukan 2 ide produk/layanan inovatif.
      Data: ${JSON.stringify(chatDataToAnalyze)}

      Output WAJIB JSON ARRAY:
      [
        {
          "product_name": "string",
          "demand_count": number,
          "suggested_price": number,
          "est_new_revenue": number,
          "launch_strategy": "string",
          "marketing_copy": "string"
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    const aiResponseText = result.response.text();
    const generatedIdeas = JSON.parse(aiResponseText);
    
    // --- 4. SIMPAN KE DATABASE AGAR TIDAK RE-GENERATE ---
    const { error: saveError } = await supabase
    .from("ai_blueprints")
    .upsert({ 
        client_id: clientId, 
        blueprint_type: "blue_ocean", 
        content: generatedIdeas 
    }, { onConflict: 'client_id,blueprint_type' });

    // --- 5. POTONG KUOTA SETELAH BERHASIL ---
    const { error: updateError } = await supabase
      .from("clients")
      .update({ premium_quota_left: client.premium_quota_left - 1 })
      .eq("id", clientId);

    if (updateError) console.error("Gagal update kuota:", updateError);

    return NextResponse.json({ 
      ideas: generatedIdeas, 
      remainingQuota: client.premium_quota_left - 1 
    });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Sistem sedang sibuk atau kuota API terbatas" }, { status: 500 });
  }
}