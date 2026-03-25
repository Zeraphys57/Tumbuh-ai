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
      Anda adalah "Social Proof Miner", seorang Social Media Strategist dan Copywriter ahli dalam psikologi konsumen.
      Tugas Anda adalah menambang riwayat chat untuk menemukan "Golden Testimonials"—kalimat yang mengandung kepuasan, kelegaan, atau pujian tulus.

      === DATA INPUT ===
      Data Percakapan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA ANALISIS (SOCIAL PROOF PSYCHOLOGY) ===
      1. Ekstraksi Emosi: Cari kalimat yang menunjukkan "A-ha Moment" (misal: "Wah, ternyata cocok!", "Sakitnya langsung hilang").
      2. Anonymization: Masking nama pelanggan demi privasi (Contoh: "Budi Santoso" -> "Kak B***" atau "Kak B.S.").
      3. Caption Engineering (PAS Framework): 
         - Problem: Angkat masalah yang diceritakan pelanggan di chat.
         - Agitation: Pertegas betapa tidak enaknya masalah itu.
         - Solution: Gunakan testimoni mereka sebagai bukti nyata solusinya.
         - Tambahkan Call to Action (CTA) dan Emoji yang relevan.

      === ATURAN OUTPUT (JSON MURNI) ===
      Pilih maksimal 3 obrolan terbaik.
      Output WAJIB JSON ARRAY murni:

      [
        {
          "customer_initial": "Nama yang sudah disamarkan",
          "original_praise": "Kutipan asli yang paling 'menjual' dari chat tersebut",
          "suggested_caption": "Caption IG/WA Story menggunakan PAS Framework + FOMO + Emojis",
          "rating": <Skor kepuasan 1-5 berdasarkan nada bicaranya di chat>
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