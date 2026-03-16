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
      chat_history: lead.full_chat || "Tidak ada riwayat chat panjang"
    }));

    // WAJIB PAKAI GEMINI 2.5 FLASH 🚀 + JSON MODE
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Training Copilot", sistem auditor Knowledge Base AI.
      Tugas Anda adalah memindai riwayat chat, mencari pertanyaan-pertanyaan dari pelanggan yang paling sering muncul, atau pertanyaan yang sekiranya belum ada di dalam database bot sehingga perlu ditambahkan.

      Data percakapan pelanggan:
      ${JSON.stringify(chatDataToAnalyze)}

      Ekstrak maksimal 3 pertanyaan (FAQ) yang paling penting. Buatlah draf jawaban profesional untuk masing-masing pertanyaan tersebut agar pemilik bisnis tinggal menyalinnya ke sistem bot.
      Estimasi secara logis berapa kali pertanyaan ini sering ditanyakan (occurrence).

      Keluarkan output HANYA dalam format JSON ARRAY persis seperti ini:
      [
        {
          "question": "Contoh pertanyaan pelanggan?",
          "suggested_answer": "Draf jawaban yang profesional dan lengkap.",
          "occurrence": 12
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    
    // Langsung parse karena sudah pasti format JSON berkat responseMimeType
    const faqs = JSON.parse(result.response.text());

    return NextResponse.json({ faqs });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND TRAINING COPILOT:", error);
    return NextResponse.json({ error: error.message || "Gagal mengaudit FAQ" }, { status: 500 });
  }
}