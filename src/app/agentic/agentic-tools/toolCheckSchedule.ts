import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const checkScheduleSchema: FunctionDeclaration = {
  name: "check_schedule",
  description: "Gunakan alat ini ketika pelanggan menanyakan ketersediaan jadwal, mau reservasi/booking, atau tanya jam kosong pada tanggal tertentu untuk layanan klinik, salon, atau jasa.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      check_date: { 
        type: SchemaType.STRING, 
        description: "Tanggal yang ingin dicek dalam format YYYY-MM-DD (contoh: '2026-03-20'). Jika pelanggan menyebut 'besok' atau 'hari ini', konversikan dulu ke format ini berdasarkan pengetahuanmu." 
      },
    },
    required: ["check_date"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Cek Jadwal)
// ============================================================================
export async function executeCheckSchedule(args: { check_date: string }, clientData: any) {
  console.log(`[AGENTIC 📅] Cek Jadwal pada ${args.check_date} untuk Klien: ${clientData.id}`);
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ambil semua jadwal yang SUDAH TERISI (confirmed) pada tanggal tersebut
    const { data: bookedSlots, error } = await supabase
      .from("client_bookings")
      .select("booking_time, service_name")
      .eq("client_id", clientData.id)
      .eq("booking_date", args.check_date)
      .eq("status", "confirmed")
      .order("booking_time", { ascending: true });

    if (error) throw error;

    // Asumsi jam operasional standar (Nanti bisa dinamis dari fitur klien)
    const jamBuka = "09:00";
    const jamTutup = "20:00";

    if (!bookedSlots || bookedSlots.length === 0) {
      return `Sistem Info: Pada tanggal ${args.check_date}, SELURUH JADWAL MASIH KOSONG. (Jam operasional: ${jamBuka} - ${jamTutup}).
Instruksi AI: Beritahu pelanggan bahwa jadwal di tanggal tersebut masih kosong semua dan sangat leluasa. Tanyakan jam berapa mereka mau datang.`;
    }

    // Format jadwal yang sudah terisi
    let infoTerisi = bookedSlots.map(b => {
      // Potong detik dari format TIME SQL (misal '14:00:00' jadi '14:00')
      const jam = b.booking_time.substring(0, 5); 
      return `- Jam ${jam} (Layanan: ${b.service_name})`;
    }).join("\n");

    return `Sistem Info: Pada tanggal ${args.check_date}, jadwal berikut ini SUDAH TERISI (DIBOOKING):
${infoTerisi}

(Jam operasional: ${jamBuka} - ${jamTutup})

Instruksi AI: Beritahu pelanggan jadwal mana saja yang SUDAH PENUH. Tawarkan jam lain di luar jam tersebut yang masih kosong. Jangan biarkan pelanggan memilih jam yang sudah terisi!`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeCheckSchedule:", err.message);
    return "Sistem Info: Terjadi kesalahan saat mengakses kalender database. Minta pelanggan menunggu sebentar.";
  }
}