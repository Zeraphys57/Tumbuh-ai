import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const registerMemberSchema: FunctionDeclaration = {
  name: "register_member",
  description: "Gunakan alat ini HANYA JIKA pelanggan ingin mendaftar menjadi Member / VIP / Anggota setia. Kamu harus sudah mengetahui Nama Lengkap dan Nomor HP/WhatsApp mereka sebelum memanggil fungsi ini.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      member_name: { type: SchemaType.STRING, description: "Nama lengkap pelanggan." },
      phone_number: { type: SchemaType.STRING, description: "Nomor HP atau WhatsApp pelanggan (Gunakan format angka saja)." }
    },
    required: ["member_name", "phone_number"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Registrasi)
// ============================================================================
export async function executeRegisterMember(args: { member_name: string, phone_number: string }, clientData: any) {
  console.log(`[AGENTIC 🎟️] Mendaftarkan Member Baru: ${args.member_name} (${args.phone_number}) untuk Klien: ${clientData.id}`);
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Bersihkan Format Nomor HP (Buang spasi, strip, dll)
    let cleanPhone = args.phone_number.replace(/\D/g, '');

    // 2. Cek apakah nomor ini sudah terdaftar sebagai member
    const { data: existingMember, error: checkError } = await supabase
      .from("client_members")
      .select("member_name, points, tier")
      .eq("client_id", clientData.id)
      .eq("phone_number", cleanPhone)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingMember) {
      return `Sistem Info: Nomor ${cleanPhone} SUDAH TERDAFTAR sebagai member atas nama ${existingMember.member_name}. (Tier: ${existingMember.tier}, Poin: ${existingMember.points}).
Instruksi AI: Beritahu pelanggan dengan ramah bahwa nomor mereka sudah terdaftar, sebutkan jumlah poin dan status tier mereka saat ini.`;
    }

    // 3. Daftarkan Member Baru
    const bonusPoinAwal = 100; // Bonus poin selamat datang

    const { error: insertError } = await supabase
      .from("client_members")
      .insert({
        client_id: clientData.id,
        member_name: args.member_name,
        phone_number: cleanPhone,
        points: bonusPoinAwal,
        tier: 'Silver'
      });

    if (insertError) throw insertError;

    return `Sistem Info: PENDAFTARAN BERHASIL! 
- Nama: ${args.member_name}
- Tier: Silver
- Bonus Poin: ${bonusPoinAwal}

Instruksi AI: Ucapkan SELAMAT DATANG kepada pelanggan secara antusias karena telah menjadi bagian dari Member VIP. Beritahu mereka bahwa mereka langsung mendapatkan bonus ${bonusPoinAwal} Poin yang bisa ditukarkan dengan diskon nanti!`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeRegisterMember:", err.message);
    return "Sistem Info: Pendaftaran member sedang mengalami gangguan sistem. Mohon pelanggan mencoba lagi nanti.";
  }
}