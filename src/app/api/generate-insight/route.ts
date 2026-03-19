import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { month, needs } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Prompt yang sangat spesifik dan terarah agar outputnya elegan
    const prompt = `
      Kamu adalah Konsultan Bisnis Profesional (Tumbuh AI Analytics).
      Tugasmu adalah menganalisis data kumpulan kebutuhan pelanggan (needs/request) dari suatu bisnis pada periode ${month}.

      Berikut adalah data mentah permintaan pelanggan:
      ${needs}

      Tolong berikan "Executive Summary" dalam format Markdown dengan 3 bagian yang ringkas, padat, dan menggunakan bahasa Indonesia yang profesional namun asik:
      1. **📈 Tren Utama Bulan Ini**: Apa pola terbanyak dari permintaan pelanggan?
      2. **🎯 Peluang Terselubung**: Adakah request unik yang muncul beberapa kali yang bisa dijadikan peluang layanan baru?
      3. **💡 Rekomendasi Tumbuh**: 1 aksi nyata yang sebaiknya dilakukan owner bisnis bulan depan berdasarkan data ini.

      PENTING: Jangan membuat kalimat pembuka/penutup basa-basi. Langsung berikan poin-poinnya.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });

  } catch (error: any) {
    console.error("AI Insight Error:", error.message);
    return NextResponse.json(
      { reply: "Gagal memproses analitik. Coba lagi nanti." }, 
      { status: 500 }
    );
  }
}