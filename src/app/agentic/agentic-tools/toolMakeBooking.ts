import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const makeBookingSchema: FunctionDeclaration = {
  name: "make_booking",
  description: "Gunakan alat ini HANYA JIKA pelanggan sudah setuju dengan tanggal dan jam reservasi, SERTA sudah memberikan Nama dan Nomor HP mereka. Alat ini akan mengunci jadwal di database.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customer_name: { type: SchemaType.STRING, description: "Nama pelanggan." },
      customer_phone: { type: SchemaType.STRING, description: "Nomor HP atau WhatsApp pelanggan." },
      booking_date: { type: SchemaType.STRING, description: "Tanggal reservasi dalam format YYYY-MM-DD (contoh: '2026-03-20')." },
      booking_time: { type: SchemaType.STRING, description: "Jam reservasi dalam format HH:MM (contoh: '14:00' atau '09:30')." },
      service_name: { type: SchemaType.STRING, description: "Layanan yang ingin dipesan (contoh: 'Potong Rambut', 'Cabut Gigi', 'Konsultasi'). Jika tidak tahu, isi 'Umum'." }
    },
    required: ["customer_name", "customer_phone", "booking_date", "booking_time", "service_name"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Kunci Jadwal)
// ============================================================================
export async function executeMakeBooking(args: any, clientData: any) {
  console.log(`[AGENTIC ✏️] Mengunci Jadwal ${args.booking_date} jam ${args.booking_time} untuk Klien: ${clientData.id}`);
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. CEK ULANG (DOUBLE-BOOKING PROTECTION)
    // Pastikan di detik terakhir ini belum ada yang nyerobot jam tersebut
    const { data: existingBooking, error: checkError } = await supabase
      .from("client_bookings")
      .select("id")
      .eq("client_id", clientData.id)
      .eq("booking_date", args.booking_date)
      .eq("booking_time", args.booking_time + ":00") // Format SQL Time butuh detik
      .eq("status", "confirmed")
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingBooking) {
      return `Sistem Info: GAGAL! Jadwal pada tanggal ${args.booking_date} jam ${args.booking_time} baru saja di-booking oleh orang lain beberapa detik yang lalu.
Instruksi AI: Minta maaf kepada pelanggan karena jam tersebut tiba-tiba penuh, lalu tawarkan jam kosong lainnya yang berdekatan.`;
    }

    // 2. KUNCI JADWALNYA (INSERT KE DATABASE)
    const { error: insertError } = await supabase
      .from("client_bookings")
      .insert({
        client_id: clientData.id,
        customer_name: args.customer_name,
        customer_phone: args.customer_phone,
        booking_date: args.booking_date,
        booking_time: args.booking_time,
        service_name: args.service_name,
        status: 'confirmed'
      });

    if (insertError) throw insertError;

    // 3. KEMBALIKAN RESI KE AI
    return `Sistem Info: BOOKING BERHASIL DIKUNCI!
- Nama: ${args.customer_name}
- Layanan: ${args.service_name}
- Tanggal: ${args.booking_date}
- Jam: ${args.booking_time}

Instruksi AI: Berikan konfirmasi antusias ke pelanggan bahwa jadwal mereka sudah berhasil diamankan. Ingatkan mereka untuk datang tepat waktu 10 menit sebelum jam ${args.booking_time}.`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeMakeBooking:", err.message);
    return "Sistem Info: Terjadi kesalahan saat mencoba mengunci jadwal. Mohon coba beberapa saat lagi.";
  }
}