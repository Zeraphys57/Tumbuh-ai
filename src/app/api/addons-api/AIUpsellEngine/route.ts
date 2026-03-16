import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads } = body;

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "Data leads kosong" }, { status: 400 });
    }

    // Ambil data penting saja untuk menghemat token Flash
    const chatDataToAnalyze = leads.map((lead: any) => ({
      id: lead.id,
      name: lead.customer_name,
      phone: lead.customer_phone,
      needs: lead.customer_needs,
      chat: lead.full_chat || "Tidak ada riwayat chat panjang"
    }));

    // Tetap menggunakan Flash, TAPI paksa output JSON
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah Sales Assistant (Upsell Engine).
      Tugas Anda memindai riwayat chat untuk menemukan peluang menjual produk/layanan tambahan (cross-selling/upselling) kepada pelanggan.

      Data Chat:
      ${JSON.stringify(chatDataToAnalyze)}

      Pilih maksimal 3 pelanggan dengan peluang upsell tertinggi.
      Keluarkan output WAJIB JSON ARRAY persis seperti ini:
      [
        {
          "id": "ID pelanggan dari data asli",
          "customer_name": "Nama pelanggan",
          "customer_phone": "Nomor HP pelanggan",
          "customer_needs": "Kebutuhan asli",
          "suggested_product": "Nama produk/layanan tambahan yang relevan",
          "ai_pitch_msg": "Draf pesan WA yang ramah untuk menawarkan produk tambahan tersebut",
          "potential_value": "High" atau "Medium"
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    const upsellLeads = JSON.parse(result.response.text());

    // Berbeda dengan Pro, kita tidak perlu memotong kuota di sini
    return NextResponse.json({ upsellLeads });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND UPSELL ENGINE:", error);
    return NextResponse.json({ error: "Gagal mencari peluang Upsell" }, { status: 500 });
  }
}