import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json({ error: "Client ID tidak valid" }, { status: 400 });
    }

    // 1. Ambil 50 data leads/chat terakhir dari klien ini
    const { data: leads, error } = await supabase
      .from("leads")
      .select("customer_name, customer_needs, created_at, total_people")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return NextResponse.json({ analysis: "Belum ada data pelanggan yang cukup untuk dianalisis." });
    }

    // 2. Format data untuk dibaca AI
    const rawDataString = leads.map(lead => 
      `Tanggal: ${new Date(lead.created_at).toLocaleDateString('id-ID')} | Kebutuhan/Keluhan: ${lead.customer_needs} | Jumlah Orang: ${lead.total_people || 1}`
    ).join("\n");

    // 3. Panggil GEMINI PRO (Model Analitik Super Pintar)
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });

    const analysisPrompt = `
      Kamu adalah Business Analyst & Konsultan Ahli tingkat atas.
      Berikut adalah data 50 prospek/pelanggan terakhir dari sebuah bisnis. 
      Tugasmu adalah menganalisis data ini dan memberikan "Executive Summary" untuk Pemilik Bisnis.

      DATA PELANGGAN:
      ${rawDataString}

      Berikan laporan menggunakan format Markdown berikut:
      ### 📊 Ringkasan Tren
      (Jelaskan tren mayoritas pelanggan mencari apa bulan ini)

      ### 💡 Peluang Bisnis (Upselling)
      (Berdasarkan keluhan/kebutuhan mereka, layanan apa yang paling laku atau layanan baru apa yang bisa ditawarkan?)

      ### ⚠️ Area Perhatian
      (Apakah ada pola masalah atau komplain yang harus diperhatikan owner?)
      
      Gunakan bahasa Indonesia yang profesional, persuasif, dan mudah dipahami oleh pemilik bisnis. JANGAN mengarang data, murni analisis dari teks di atas.
    `;

    const result = await model.generateContent(analysisPrompt);
    const analysisResult = result.response.text();

    return NextResponse.json({ analysis: analysisResult });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: "Gagal melakukan analisis data." }, { status: 500 });
  }
}