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
      Anda adalah "Training Copilot", auditor sistem Knowledge Management tingkat tinggi.
      Tugas Anda adalah membedah riwayat chat untuk mengidentifikasi "Knowledge Gaps" (Celah Pengetahuan) di mana pelanggan bertanya namun sistem belum memberikan jawaban yang memuaskan atau pertanyaan tersebut muncul berulang kali.

      === DATA INPUT ===
      Riwayat Chat Pelanggan: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA AUDIT (KNOWLEDGE GAP ANALYSIS) ===
      Identifikasi 3 celah informasi paling kritis berdasarkan:
      1. High Frequency (+40): Pertanyaan yang muncul berulang dengan pola kata kunci yang sama.
      2. High Friction (+30): Pertanyaan yang jika tidak dijawab dengan jelas akan menghambat proses transaksi (misal: kebijakan refund, garansi, atau cara penggunaan).
      3. Intent Complexity (+30): Pertanyaan spesifik yang membutuhkan penjelasan mendetail dan belum terakomodasi dalam FAQ standar.

      === INSTRUKSI DRAF JAWABAN ===
      Rancang "suggested_answer" menggunakan gaya bahasa yang:
      - Profesional namun ramah (Sesuai Persona Tumbuh.ai).
      - Informatif dan terstruktur (Gunakan poin-poin jika perlu).
      - Mengandung Call to Action (CTA) di akhir jawaban untuk mendorong konversi.

      === ATURAN OUTPUT (JSON MURNI) ===
      DILARANG memberikan kalimat pembuka/penutup. Output WAJIB JSON ARRAY murni:

      [
        {
          "question": "[Pertanyaan yang sering ditanyakan atau celah informasi yang ditemukan]",
          "suggested_answer": "[Draf jawaban lengkap yang siap dimasukkan ke Knowledge Base]",
          "occurrence": <estimasi jumlah kemunculan pola pertanyaan ini di data chat>,
          "priority_level": "High/Medium/Low",
          "reasoning": "Alasan kenapa informasi ini krusial untuk ditambahkan ke database bot."
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