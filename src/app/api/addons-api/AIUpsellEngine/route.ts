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
      Anda adalah "Upsell Engine" dari Tumbuh.ai, seorang Chief Growth Officer yang ahli dalam memaksimal nilai umur pelanggan (Customer Lifetime Value).
      Tugas Anda adalah mendeteksi peluang Cross-selling atau Upselling berdasarkan kebutuhan yang terucap maupun tersirat di riwayat chat.

      === DATA INPUT ===
      Riwayat Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA STRATEGI (VALUE LADDER FRAMEWORK) ===
      Identifikasi peluang berdasarkan 3 kriteria ini:
      1. Speed & Ease (+40): Tawarkan layanan yang membuat pelanggan mencapai tujuannya lebih CEPAT atau lebih MUDAH.
      2. Completeness (+30): Tawarkan produk pendamping (Cross-sell) yang melengkapi apa yang sudah mereka tanyakan.
      3. Premium Upgrade (+30): Tawarkan versi yang lebih eksklusif/lengkap (Upsell) jika mereka menunjukkan profil "High-Value Customer".

      === INSTRUKSI PESAN (PITCHING) ===
      Draf pesan (ai_pitch_msg) harus menggunakan teknik "Assumptive Close" yang sopan:
      - Gunakan bahasa yang membantu: "Karena Kakak tertarik dengan [A], mungkin [B] akan sangat membantu agar [Hasil] lebih maksimal."
      - Jangan terlihat seperti promosi massal. Harus terasa personal dan solutif.

      === ATURAN OUTPUT (JSON MURNI) ===
      Pilih maksimal 3 pelanggan dengan skor potensi tertinggi.
      Keluarkan output WAJIB JSON ARRAY murni:

      [
        {
          "id": "ID pelanggan asli",
          "customer_name": "Nama pelanggan",
          "customer_phone": "Nomor HP",
          "customer_needs": "Kebutuhan asli pelanggan",
          "suggested_product": "Nama layanan/produk tambahan yang diusulkan",
          "potential_value": "High/Medium",
          "ai_pitch_msg": "Isi pesan WhatsApp yang solutif dan personal menggunakan framework Value Ladder."
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