import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const checkOrderStatusSchema: FunctionDeclaration = {
  name: "check_order_status",
  description: "Gunakan alat ini JIKA pelanggan menanyakan status pesanan, melacak paket, atau bertanya apakah layanan/barang mereka sudah selesai diproses. Pastikan kamu sudah meminta Nomor HP atau Nama pelanggan sebelum memanggil alat ini.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customer_identifier: { 
        type: SchemaType.STRING, 
        description: "Nomor HP atau Nama pelanggan yang digunakan untuk melacak pesanan. (Contoh: '0812345678' atau 'Budi')." 
      },
    },
    required: ["customer_identifier"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Cek Status)
// ============================================================================
export async function executeCheckOrderStatus(args: { customer_identifier: string }, clientData: any) {
  console.log(`[AGENTIC 🔍] Melacak Pesanan untuk '${args.customer_identifier}' (Klien: ${clientData.id})`);
  
  try {
    const features = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {});
    const trackingMode = features.tracking_mode || "internal";

    // ========================================================================
    // JALUR 1: KLIEN ENTERPRISE (Pakai API Resi Luar seperti Biteship/RajaOngkir)
    // ========================================================================
    if (trackingMode === "external_api" && features.tracking_api_url) {
      console.log(`[AGENTIC 🌐] Melacak via API Eksternal...`);
      // Ini kerangka untuk nanti jika klien punya sistem resi sendiri
      return "Sistem Info: Pesanan sedang dalam perjalanan dengan kurir. (Data dari API Eksternal).";
    }

    // ========================================================================
    // JALUR 2: KLIEN UMKM (Cek di Tabel 'client_orders' Tumbuh.ai)
    // ========================================================================
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Kita cari pesanan terbaru milik pelanggan ini (bisa dari Nama atau Nomor HP)
    const { data: orders, error } = await supabase
      .from("client_orders")
      .select("item_name, quantity, total_price, status, created_at")
      .eq("client_id", clientData.id)
      .or(`customer_phone.ilike.%${args.customer_identifier}%,customer_name.ilike.%${args.customer_identifier}%`)
      .order("created_at", { ascending: false })
      .limit(3); // Ambil 3 pesanan terakhir saja

    if (error) throw error;

    if (!orders || orders.length === 0) {
      return `Sistem Info: Pesanan atas nama/nomor '${args.customer_identifier}' TIDAK DITEMUKAN di database. 
Instruksi AI: Beritahu pelanggan dengan sopan bahwa pesanan tidak ditemukan. Tanyakan apakah mereka menggunakan nama/nomor HP lain saat memesan.`;
    }

    // Ubah bahasa status database (Inggris) menjadi bahasa manusia (Indonesia)
    const terjemahanStatus: Record<string, string> = {
      'pending': '⏳ Sedang Diproses / Menunggu Pembayaran',
      'paid': '💸 Pembayaran Diterima (Segera Diproses)',
      'shipped': '🚚 Sedang Dikirim / Dalam Perjalanan',
      'completed': '✅ Selesai / Bisa Diambil',
      'cancelled': '❌ Dibatalkan'
    };

    let resultText = `Sistem Info: Ditemukan Riwayat Pesanan untuk '${args.customer_identifier}':\n`;
    
    orders.forEach((order, index) => {
      const tanggal = new Date(order.created_at).toLocaleDateString('id-ID');
      const statusIndo = terjemahanStatus[order.status.toLowerCase()] || order.status;
      resultText += `${index + 1}. Tgl ${tanggal} | ${order.quantity}x ${order.item_name} | Status: ${statusIndo}\n`;
    });

    return resultText + `\nInstruksi AI: Sampaikan status pesanan terbaru ini kepada pelanggan dengan ramah. Berikan detail barang dan statusnya dengan jelas.`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeCheckOrderStatus:", err.message);
    return "Sistem Info: Terjadi kesalahan saat mencoba melacak pesanan. Minta pelanggan menunggu sebentar.";
  }
}