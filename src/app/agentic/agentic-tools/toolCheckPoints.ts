import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const checkPointsSchema: FunctionDeclaration = {
  name: "check_points",
  description: "Gunakan alat ini JIKA pelanggan menanyakan jumlah poin member mereka, sisa poin, tier membership, atau menanyakan reward/promo yang bisa ditukarkan. Pastikan kamu sudah meminta Nomor HP atau Nama pelanggan.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customer_identifier: { 
        type: SchemaType.STRING, 
        description: "Nomor HP (hanya angka) atau Nama pelanggan. (Contoh: '0812345678' atau 'Budi')." 
      },
    },
    required: ["customer_identifier"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Cek Poin)
// ============================================================================
export async function executeCheckPoints(args: { customer_identifier: string }, clientData: any) {
  console.log(`[AGENTIC 🎁] Mengecek Poin Member untuk '${args.customer_identifier}' (Klien: ${clientData.id})`);
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Bersihkan karakter aneh jika user input nomor HP (misal ada strip atau spasi)
    const cleanIdentifier = args.customer_identifier.replace(/[^a-zA-Z0-9]/g, '');

    // Cari member berdasarkan Nama atau Nomor HP
    const { data: member, error } = await supabase
      .from("client_members")
      .select("member_name, phone_number, points, tier")
      .eq("client_id", clientData.id)
      .or(`phone_number.ilike.%${cleanIdentifier}%,member_name.ilike.%${cleanIdentifier}%`)
      .maybeSingle();

    if (error) throw error;

    if (!member) {
      return `Sistem Info: Data member dengan nama/nomor '${args.customer_identifier}' TIDAK DITEMUKAN. 
Instruksi AI: Beritahu pelanggan dengan sopan bahwa data mereka belum terdaftar sebagai member. Tawarkan apakah mereka ingin mendaftar sekarang (gratis) untuk mulai mengumpulkan poin.`;
    }

    // ========================================================================
    // LOGIKA PROMO CERDAS BERDASARKAN TIER & POIN
    // ========================================================================
    let promoInfo = "";
    if (member.points >= 500) {
      promoInfo = "Bisa ditukar dengan Voucher Diskon Rp 50.000 atau Free Ongkir!";
    } else if (member.points >= 200) {
      promoInfo = "Bisa ditukar dengan Diskon 10% untuk transaksi hari ini.";
    } else {
      promoInfo = `Kumpulkan ${200 - member.points} poin lagi untuk mendapatkan Diskon 10%.`;
    }

    return `Sistem Info: DATA MEMBER DITEMUKAN!
- Nama: ${member.member_name}
- Tier / Status: ${member.tier} 👑
- Sisa Poin Saat Ini: ${member.points} Poin ⭐️

Info Promo yang Tersedia: ${promoInfo}

Instruksi AI: Sampaikan jumlah poin dan Tier mereka dengan sangat antusias dan ramah. Beritahu juga promo apa yang bisa mereka dapatkan (dari info promo di atas) agar mereka tertarik untuk bertransaksi hari ini.`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeCheckPoints:", err.message);
    return "Sistem Info: Terjadi kesalahan saat mengakses database member. Mohon minta pelanggan menunggu sebentar.";
  }
}