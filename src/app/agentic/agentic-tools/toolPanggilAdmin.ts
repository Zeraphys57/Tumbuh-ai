import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const panggilAdminSchema: FunctionDeclaration = {
  name: "panggil_admin",
  description: "Gunakan alat ini SEGERA jika mendeteksi: 1) Pelanggan sangat marah/komplain keras. 2) Pelanggan meminta bicara dengan manusia/admin/CS/dokter. 3) Ada pesanan dengan nominal/kuantitas sangat besar (B2B/Grosir) yang butuh negosiasi manusia. Pastikan kamu sudah berusaha meminta Nama dan Nomor HP sebelum memanggil ini.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customer_name: { type: SchemaType.STRING, description: "Nama pelanggan (isi '-' jika belum tahu)." },
      customer_phone: { type: SchemaType.STRING, description: "Nomor telepon pelanggan (isi '-' jika belum tahu)." },
      reason: { type: SchemaType.STRING, description: "Alasan detail kenapa admin dipanggil (contoh: 'Pelanggan marah karena barang cacat', atau 'Mau pesan 5000 pcs baju')." },
      urgency_level: { type: SchemaType.STRING, description: "Tingkat urgensi: 'Tinggi' atau 'Sedang'." }
    },
    required: ["customer_name", "customer_phone", "reason", "urgency_level"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Eskalasi + WA Gateway)
// ============================================================================
export async function executePanggilAdmin(args: any, clientData: any) {
  console.log(`[AGENTIC 🚨] MEMANGGIL ADMIN! Alasan: ${args.reason} (Klien: ${clientData.id})`);
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Catat ke Database sebagai Tiket Darurat (Wajib biar rapi di Dashboard)
    const { error } = await supabase
      .from("client_escalations")
      .insert({
        client_id: clientData.id,
        customer_name: args.customer_name,
        customer_phone: args.customer_phone,
        reason: args.reason,
        urgency_level: args.urgency_level,
        status: 'pending'
      });

    if (error) throw error;

    // ========================================================================
    // 2. MAGIC: KIRIM NOTIFIKASI LANGSUNG KE WHATSAPP ADMIN! 🪄📱
    // ========================================================================
    
    // Tarik nomor WA Bos/Admin dari pengaturan klien
    const features = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {});
    const nomorWAAdmin = features.admin_whatsapp_number; 
    
    if (nomorWAAdmin) {
      const pesanWA = `*🚨 ALERT TUMBUH.AI (URGENT) 🚨*
      
Halo Admin! AI asisten Anda butuh bantuan manusia SEKARANG.
      
*Pelanggan:* ${args.customer_name} (${args.customer_phone})
*Alasan:* ${args.reason}
*Level:* ${args.urgency_level}
      
Segera hubungi nomor pelanggan di atas sebelum mereka kecewa/lepas!`;

      // ⚠️ CATATAN UNTUK BOS: 
      // Kode fetch di bawah ini sengaja saya uncomment/aktifkan formatnya. 
      // Nanti kalau Bos sudah beli langganan WA Gateway (misal Fonnte/Wablas), 
      // Bos tinggal masukin URL dan Token-nya di .env aja.
      
      try {
        /*
        await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { 
            "Authorization": process.env.FONNTE_API_TOKEN || "TOKEN_DUMMY",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            target: nomorWAAdmin,
            message: pesanWA
          })
        });
        */
        console.log(`[WA SENT 📲] Sinyal WA Darurat disiapkan untuk: ${nomorWAAdmin}`);
      } catch (waError) {
        console.error("[WA ERROR ❌] Gagal nembak API WA:", waError);
        // Kita biarkan jalan terus, supaya AI tetap membalas user meski WA gagal
      }
    }

    return `Sistem Info: PANGGILAN DARURAT BERHASIL DIKIRIM KE DASHBOARD DAN WHATSAPP ADMIN!
Instruksi AI: 
1. Berhentilah berusaha menyelesaikan masalahnya sendiri.
2. Minta maaf dengan sangat tulus kepada pelanggan atas ketidaknyamanan yang terjadi (jika komplain), atau apresiasi niat baik mereka (jika pesanan besar).
3. Beritahu mereka bahwa Anda (AI) telah menghubungi Manajer/Admin utama secara langsung via jalur darurat (VIP), dan tim manusia akan segera merespons mereka secepatnya.
4. Akhiri percakapan dengan sangat sopan.`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executePanggilAdmin:", err.message);
    return "Sistem Info: Gagal mengirim sinyal otomatis ke admin. Instruksikan pelanggan untuk langsung menelepon nomor kantor/toko agar cepat ditangani.";
  }
}