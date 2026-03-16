import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads, clientId } = body;

    // 1. VALIDASI
    if (!clientId) return NextResponse.json({ error: "Client ID diperlukan" }, { status: 400 });
    if (!leads || leads.length === 0) return NextResponse.json({ error: "Data leads kosong" }, { status: 400 });

    // 2. CEK SISA KUOTA
    const { data: client, error: quotaError } = await supabase
      .from("clients")
      .select("premium_quota_left")
      .eq("id", clientId)
      .maybeSingle();

    if (quotaError || !client) return NextResponse.json({ error: "Gagal memverifikasi client" }, { status: 500 });
    
    if (client.premium_quota_left <= 0) {
      return NextResponse.json({ 
        error: "Kuota Premium AI Anda habis (Limit: 5/bln). Silakan hubungi admin Tumbuh.ai untuk upgrade!" 
      }, { status: 403 });
    }

    // 3. PROSES DATA KE GEMINI PRO DENGAN INSTRUKSI ANTI-JSON
    const prompt = `
      Anda adalah Executive Business Analyst kelas dunia. 
      Tugas Anda adalah membaca data pelanggan berikut dan membuat Laporan Eksekutif singkat.

      Data Pelanggan:
      ${JSON.stringify(leads)}

      ATURAN FORMAT (SANGAT PENTING DILAKUKAN):
      1. DILARANG KERAS MENGGUNAKAN FORMAT JSON! (Jangan awali balasan dengan kurung kurawal atau property apapun).
      2. Langsung tuliskan teks balasan dalam format MARKDOWN biasa.
      3. Gunakan Heading (###), Cetak Tebal (**teks**), dan Bullet Points (* teks) agar rapi.
      4. Format laporan Anda harus mencakup:
         - Ringkasan Eksekutif (1 Paragraf)
         - Tren Utama
         - Masalah Utama yang harus diselesaikan
         - Rekomendasi Strategi (Actionable steps)
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const result = await model.generateContent(prompt);
    let aiResponseText = result.response.text();

    // 4. POTONG KUOTA
    await supabase.from("clients")
      .update({ premium_quota_left: client.premium_quota_left - 1 })
      .eq("id", clientId);

    return NextResponse.json({ 
      analysis: aiResponseText,
      remainingQuota: client.premium_quota_left - 1
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND AI ANALYST:", error);
    return NextResponse.json({ error: "Sistem AI sedang sibuk atau kuota API penuh" }, { status: 500 });
  }
}