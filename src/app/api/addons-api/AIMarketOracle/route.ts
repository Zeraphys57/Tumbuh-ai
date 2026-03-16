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
    const { leads, avgTicketSize, clientId } = body;

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
      customer_needs: lead.customer_needs,
      chat: lead.full_chat || "Tidak ada riwayat"
    }));

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Market Oracle", Chief Revenue Officer (CRO).
      Tugas Anda memindai data chat untuk menemukan PROSPEK GAGAL (Lost Leads) dan alasan kegagalannya.

      Data Chat:
      ${JSON.stringify(chatDataToAnalyze)}
      Average Ticket Size (Rata-rata transaksi jika berhasil): Rp ${avgTicketSize}

      Keluarkan output WAJIB JSON persis seperti ini:
      {
        "totalLostRevenue": <total perkiraan uang yang hilang (angka saja, misal: 1500000)>,
        "lostLeadsCount": <jumlah pelanggan yang diprediksi gagal/batal beli (angka)>,
        "topReasons": [
          { "reason": "Harga Terlalu Mahal", "percentage": 45 },
          { "reason": "Ongkir Mahal", "percentage": 30 },
          { "reason": "Stok Kosong", "percentage": 25 }
        ],
        "aiRecommendations": [
          "Saran strategis 1 yang actionable",
          "Saran strategis 2 yang actionable"
        ]
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const oracleData = JSON.parse(result.response.text());

    // 4. POTONG KUOTA
    await supabase.from("clients")
      .update({ premium_quota_left: client.premium_quota_left - 1 })
      .eq("id", clientId);

    return NextResponse.json({ 
      oracleData, 
      remainingQuota: client.premium_quota_left - 1 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND MARKET ORACLE:", error);
    return NextResponse.json({ error: "Sistem sibuk atau kuota API terbatas" }, { status: 500 });
  }
}