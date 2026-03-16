import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const cancelBookingSchema: FunctionDeclaration = {
  name: "cancel_booking",
  description: "Gunakan alat ini JIKA pelanggan meminta untuk membatalkan (cancel) reservasi, booking, atau janji temu mereka. Pastikan kamu sudah meminta Nomor HP dan Tanggal Booking sebelum memanggil fungsi ini.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customer_phone: { type: SchemaType.STRING, description: "Nomor HP atau WhatsApp pelanggan yang digunakan saat booking." },
      booking_date: { type: SchemaType.STRING, description: "Tanggal booking yang ingin dibatalkan dalam format YYYY-MM-DD (contoh: '2026-03-20')." },
    },
    required: ["customer_phone", "booking_date"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Cancel Booking)
// ============================================================================
export async function executeCancelBooking(args: { customer_phone: string, booking_date: string }, clientData: any) {
  console.log(`[AGENTIC 🗑️] Membatalkan Booking tgl ${args.booking_date} untuk HP: ${args.customer_phone} (Klien: ${clientData.id})`);
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Bersihkan Nomor HP
    let cleanPhone = args.customer_phone.replace(/\D/g, '');

    // 2. Cari jadwal yang masih aktif (confirmed) milik pelanggan ini
    const { data: existingBookings, error: searchError } = await supabase
      .from("client_bookings")
      .select("id, booking_time, service_name")
      .eq("client_id", clientData.id)
      .like("customer_phone", `%${cleanPhone}%`) // Pakai like agar lebih fleksibel (misal ada 0812 vs 62812)
      .eq("booking_date", args.booking_date)
      .eq("status", "confirmed");

    if (searchError) throw searchError;

    if (!existingBookings || existingBookings.length === 0) {
      return `Sistem Info: PEMBATALAN GAGAL. Tidak ditemukan jadwal aktif pada tanggal ${args.booking_date} untuk nomor HP ${args.customer_phone}. 
Instruksi AI: Beritahu pelanggan bahwa jadwal mereka tidak ditemukan. Tanyakan apakah mereka salah tanggal atau menggunakan nomor HP lain saat mendaftar.`;
    }

    // 3. Jika ketemu, batalkan (Update status jadi 'cancelled')
    // Kita ambil ID booking pertama yang ketemu (biasanya 1 orang cuma booking 1 slot di hari yang sama)
    const targetBooking = existingBookings[0];

    const { error: updateError } = await supabase
      .from("client_bookings")
      .update({ status: 'cancelled' })
      .eq("id", targetBooking.id);

    if (updateError) throw updateError;

    return `Sistem Info: PEMBATALAN BERHASIL! 
- Layanan: ${targetBooking.service_name}
- Tanggal: ${args.booking_date}
- Jam yang dibebaskan: ${targetBooking.booking_time}

Instruksi AI: Konfirmasi ke pelanggan bahwa jadwal mereka sudah berhasil dibatalkan. Sampaikan dengan ramah bahwa slot waktu mereka sudah dikosongkan. Tanyakan apakah mereka ingin me-reschedule (mencari jadwal baru) di hari lain.`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeCancelBooking:", err.message);
    return "Sistem Info: Terjadi gangguan sistem saat mencoba membatalkan jadwal. Mohon pelanggan mencoba lagi nanti atau hubungi admin.";
  }
}