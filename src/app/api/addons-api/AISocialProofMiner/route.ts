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

    // Ambil data untuk dianalisa
    const chatDataToAnalyze = leads.map((lead: any) => ({
      name: lead.customer_name,
      chat_history: lead.full_chat || "Tidak ada riwayat chat panjang"
    }));

    // WAJIB PAKAI GEMINI 2.5 FLASH 🚀 + SAFETY JSON
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      // FITUR SAKTI: Ini yang bikin kita nggak perlu lagi pakai .replace() manual
      generationConfig: { responseMimeType: "application/json" }
    });

    // Menggunakan Prompt ASLI Bos yang sangat bagus detailnya
    const systemPrompt = `
      Anda adalah "Social Proof Miner", seorang Social Media Manager dan Copywriter ahli.
      Tugas Anda memindai riwayat chat pelanggan untuk mencari kalimat pujian, rasa puas, atau sentimen positif yang bisa dijadikan bahan testimoni promosi.

      Data percakapan pelanggan:
      ${JSON.stringify(chatDataToAnalyze)}

      Pilih maksimal 3 obrolan yang mengandung pujian/kepuasan tertinggi.
      Samarkan nama asli pelanggan menjadi inisial yang aman (misal: Budi -> Kak B***).
      Buatkan caption Instagram/WhatsApp Story yang engaging, natural, dan memancing orang lain untuk membeli (lengkap dengan emoji).

      Keluarkan output HANYA dalam format JSON ARRAY persis seperti ini:
      [
        {
          "customer_initial": "Kak A***",
          "original_praise": "Kutipan asli kalimat pujian dari pelanggan di dalam chat.",
          "suggested_caption": "Caption IG/WA yang engaging dan memancing FOMO.",
          "rating": 5
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    
    // Karena sudah pakai responseMimeType, hasilnya DIJAMIN JSON murni.
    // Kita bisa langsung parse tanpa takut error.
    const testimonials = JSON.parse(result.response.text());

    return NextResponse.json({ testimonials });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND SOCIAL PROOF MINER:", error);
    return NextResponse.json({ error: error.message || "Gagal menggali testimoni" }, { status: 500 });
  }
}