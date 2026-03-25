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

    // 3. PROSES DATA KE GEMINI
    const chatDataToAnalyze = leads.map((lead: any) => ({
      needs: lead.customer_needs,
      chat: lead.full_chat || "Tidak ada riwayat"
    }));

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      Anda adalah "Syndicate Architect", Chief Strategy Officer elit yang spesialis dalam M&A dan B2B Strategic Partnership.
      Tugas Anda adalah menganalisis riwayat chat untuk menemukan layanan/produk yang sering dicari pelanggan tapi TIDAK dijual oleh klien kami, lalu merancang kemitraan strategis.

      === DATA INPUT ===
      Data Chat: ${JSON.stringify(chatDataToAnalyze)}

      === LOGIKA ANALISIS (ECOSYSTEM SYNERGY) ===
      Gunakan framework "Value Chain Complementarity":
      1. Identify Unmet Needs: Apa hal yang ditanyakan pelanggan sebelum atau sesudah menggunakan jasa klien kami?
      2. Partner Target: Cari bisnis lokal yang memiliki pelanggan yang sama tapi tidak bersaing langsung (Complementary Assets).
      3. Synergy Logic: Jelaskan mengapa kemitraan ini saling menguntungkan (Win-Win).
      4. Monetization: Bagaimana skema bagi hasilnya (Referral fee, Bundling package, atau Shared space).

      === ATURAN OUTPUT (JSON MURNI) ===
      Rancang 2 ide "Strategic B2B Partnership". DILARANG narasi pembuka.
      Output WAJIB JSON ARRAY murni:

      [
        {
          "partner_target": "[Kategori Bisnis & Contohnya, misal: Kedai Kopi Lokal / Fotografer]",
          "synergy_logic": "[Penjelasan logis kenapa pelanggan bisnis tersebut pasti butuh kita, dan sebaliknya]",
          "monetization_model": "[Skema cuan: Misal Komisi 10% per referral atau Paket Bundling Khusus]",
          "b2b_pitch_script": "[Draft naskah profesional untuk pemilik bisnis tersebut agar mau diajak kerjasama melalui WA/Email]"
        }
      ]
    `;

    const result = await model.generateContent(systemPrompt);
    const syndicates = JSON.parse(result.response.text());

    // 4. POTONG KUOTA
    await supabase.from("clients")
      .update({ premium_quota_left: client.premium_quota_left - 1 })
      .eq("id", clientId);

    return NextResponse.json({ 
      syndicates, 
      remainingQuota: client.premium_quota_left - 1 
    });

  } catch (error: any) {
    console.error("🔥 ERROR DI BACKEND SYNDICATE:", error);
    return NextResponse.json({ error: "Sistem sibuk atau kuota API terbatas" }, { status: 500 });
  }
}