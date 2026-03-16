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
      id: lead.id,
      name: lead.customer_name,
      phone: lead.customer_phone,
      chat: lead.full_chat || "Tidak ada riwayat chat"
    }));

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Hot Lead Radar", AI penilai probabilitas closing (Sales Scorer).
      Tugas Anda memindai riwayat chat untuk mencari pelanggan yang niat belinya paling tinggi (Hot Leads) tapi belum transfer.

      Data Chat:
      ${JSON.stringify(chatDataToAnalyze)}

      Pilih maksimal 3 pelanggan dengan closing_score tertinggi.
      Keluarkan output WAJIB JSON ARRAY persis seperti ini:
      [
        {
          "id": "ID dari data asli",
          "customer_name": "Nama pelanggan",
          "customer_phone": "Nomor HP pelanggan",
          "closing_score": <angka probabilitas 1-100>,
          "ai_reasoning": "Alasan logis kenapa orang ini skornya tinggi berdasarkan chatnya",
          "urgency_level": "High" atau "Medium" atau "Low"
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    const scoredLeads = JSON.parse(result.response.text());

    // 4. POTONG KUOTA
    await supabase.from("clients")
      .update({ premium_quota_left: client.premium_quota_left - 1 })
      .eq("id", clientId);

    return NextResponse.json({ 
      scoredLeads,
      remainingQuota: client.premium_quota_left - 1
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND LEAD SCORER:", error);
    return NextResponse.json({ error: "Sistem AI sedang sibuk atau kuota API penuh" }, { status: 500 });
  }
}