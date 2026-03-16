import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads, clientId } = body;

    // 1. VALIDASI
    if (!clientId) return NextResponse.json({ error: "Client ID diperlukan" }, { status: 400 });
    if (!leads || leads.length === 0) return NextResponse.json({ error: "Data leads kosong" }, { status: 400 });

    // 2. CEK SISA KUOTA
    const { data: client, error: quotaError } = await supabase
      .from("clients")
      .select("premium_quota_left")
      .eq("id", clientId)
      .maybeSingle();

    if (quotaError || !client) return NextResponse.json({ error: "Gagal memverifikasi client" }, { status: 500 });
    
    if (client.premium_quota_left <= 0) {
      return NextResponse.json({ 
        error: "Kuota Premium AI Anda habis (Limit: 5/bln). Silakan hubungi admin Tumbuh.ai untuk upgrade!" 
      }, { status: 403 });
    }

    // 3. PROSES DATA KE GEMINI
    const chatDataToAnalyze = leads.map((lead: any) => ({
      needs: lead.customer_needs,
      chat: lead.full_chat || "Tidak ada riwayat"
    }));

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda "Syndicate Architect", Chief Strategy Officer spesialis M&A dan B2B Partnership.
      Temukan produk/layanan yang SERING DIBUTUHKAN pelanggan tapi tidak dijual oleh UMKM ini berdasarkan data berikut:
      ${JSON.stringify(chatDataToAnalyze)}

      Rancang 2 ide "Strategic B2B Partnership" dengan bisnis lokal lain.
      Output WAJIB JSON ARRAY:
      [
        {
          "partner_target": "string",
          "synergy_logic": "string",
          "monetization_model": "string",
          "b2b_pitch_script": "string"
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    const syndicates = JSON.parse(result.response.text());

    // 4. POTONG KUOTA
    await supabase.from("clients")
      .update({ premium_quota_left: client.premium_quota_left - 1 })
      .eq("id", clientId);

    return NextResponse.json({ 
      syndicates, 
      remainingQuota: client.premium_quota_left - 1 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND SYNDICATE:", error);
    return NextResponse.json({ error: "Sistem sibuk atau kuota API terbatas" }, { status: 500 });
  }
}