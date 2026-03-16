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
      created_at: lead.created_at || new Date().toISOString(),
      chat: lead.full_chat || "Tidak ada riwayat chat panjang"
    }));

    // Tetap menggunakan Flash, TAPI paksa output JSON
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Ghost Hunter", ahli Sales Retention.
      Tugas Anda memindai riwayat chat untuk menemukan pelanggan yang tiba-tiba berhenti membalas (Ghosting) sebelum transaksi selesai.

      Data Chat:
      ${JSON.stringify(chatDataToAnalyze)}

      Pilih maksimal 4 pelanggan yang paling berpotensi diselamatkan (Ghosting ringan).
      Keluarkan output WAJIB JSON ARRAY persis seperti ini:
      [
        {
          "id": "ID pelanggan dari data asli",
          "customer_name": "Nama pelanggan",
          "customer_phone": "Nomor HP pelanggan",
          "customer_needs": "Kebutuhan pelanggan",
          "days_ghosting": <estimasi angka hari mereka hilang, misal: 2>,
          "ai_follow_up_msg": "Draf pesan WhatsApp follow-up yang sangat ramah, berempati, tidak memaksa, namun mengingatkan mereka tentang kebutuhannya."
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    const ghostLeads = JSON.parse(result.response.text());

    // Flash gratis, tidak perlu potong kuota Supabase
    return NextResponse.json({ ghostLeads });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND GHOST RECOVERY:", error);
    return NextResponse.json({ error: "Gagal mendeteksi pelanggan ghosting" }, { status: 500 });
  }
}