import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentPrompt } = body;

    if (!currentPrompt || currentPrompt.trim() === "") {
      return NextResponse.json({ error: "Prompt masih kosong, Bos!" }, { status: 400 });
    }

    // Pakai Flash karena sangat ringan, WAJIB JSON Mode
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah Prompt Engineer Senior kelas dunia.
      Tugas Anda adalah menyempurnakan instruksi mentah (raw prompt) dari user menjadi "System Prompt" yang profesional, terstruktur, anti-halusinasi, dan memiliki batasan (guardrails) yang jelas untuk AI.

      Instruksi mentah dari user:
      "${currentPrompt}"

      Tulis ulang instruksi tersebut menjadi System Prompt tingkat dewa.
      Keluarkan output HANYA dalam format JSON persis seperti ini:
      {
        "optimized_prompt": "Teks instruksi baru yang sudah terstruktur rapi, lengkap dengan persona, aturan, dan batasan (gunakan markdown jika perlu).",
        "improvements": [
          "Penjelasan singkat 1: Menambahkan persona...",
          "Penjelasan singkat 2: Memasang batas aturan...",
          "Penjelasan singkat 3: Memperbaiki alur..."
        ]
      }
    `;

    const result = await model.generateContent(systemPrompt);
    const optimization = JSON.parse(result.response.text());

    return NextResponse.json({ optimization });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND PROMPT OPTIMIZER:", error);
    return NextResponse.json({ error: "Gagal meracik prompt. Mesin sedang sibuk." }, { status: 500 });
  }
}