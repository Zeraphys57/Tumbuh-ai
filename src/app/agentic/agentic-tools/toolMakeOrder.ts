import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const buatPesananSchema: FunctionDeclaration = {
  name: "buat_pesanan",
  description: "Gunakan alat ini HANYA JIKA pelanggan sudah setuju/deal untuk membeli barang. Alat ini akan memotong stok gudang dan mencatat pesanan. Pastikan kamu sudah menanyakan jumlah barang yang dibeli sebelum memanggil fungsi ini.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      keyword_barang: { type: SchemaType.STRING, description: "Nama barang yang dibeli pelanggan." },
      jumlah: { type: SchemaType.INTEGER, description: "Berapa banyak barang yang dipesan (harus angka)." },
      nama_pelanggan: { type: SchemaType.STRING, description: "Nama pelanggan. Isi '-' jika tidak tahu." },
      nomor_hp: { type: SchemaType.STRING, description: "Nomor HP/WA pelanggan. Isi '-' jika tidak tahu." }
    },
    required: ["keyword_barang", "jumlah", "nama_pelanggan", "nomor_hp"],
  },
};

// ============================================================================
// 2. MESIN KASIR OTOMATIS (Logic Backend)
// ============================================================================
export async function executeBuatPesanan(args: any, clientData: any) {
  console.log(`[AGENTIC 🛒] Proses Checkout: ${args.jumlah}x '${args.keyword_barang}' (Klien: ${clientData.id})`);
  
  try {
    const features = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {});
    const inventoryMode = features.inventory_mode || "internal";

    // --- JALUR 1: KLIEN ENTERPRISE (Pakai API Luar) ---
    if (inventoryMode === "external_api" && features.order_api_url) {
      console.log(`[AGENTIC 🌐] Mengirim pesanan ke API Klien...`);
      const response = await fetch(features.order_api_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${features.inventory_api_key || ""}` },
        body: JSON.stringify(args)
      });
      if (!response.ok) return "Sistem Info: Gagal membuat pesanan di sistem pusat klien.";
      return "Sistem Info: Pesanan berhasil dicatat di sistem klien. Beritahu pelanggan total tagihannya.";
    }

    // --- JALUR 2: KLIEN UMKM (Database Tumbuh.ai) ---
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Cari barangnya dulu di gudang
    const { data: item, error: searchError } = await supabase
      .from("client_inventory")
      .select("id, item_name, stock, price")
      .eq("client_id", clientData.id)
      .ilike("item_name", `%${args.keyword_barang}%`)
      .single();

    if (searchError || !item) {
      return `Sistem Info: Transaksi Batal. Barang '${args.keyword_barang}' tidak ditemukan di sistem kasir.`;
    }

    // 2. Cek apakah stok cukup?
    if (item.stock < args.jumlah) {
      return `Sistem Info: Transaksi Batal. Stok tidak cukup! Sisa stok '${item.item_name}' hanya ${item.stock} pcs.`;
    }

    // 3. Eksekusi Transaksi (Potong Stok)
    const sisaBaru = item.stock - args.jumlah;
    const { error: updateError } = await supabase
      .from("client_inventory")
      .update({ stock: sisaBaru })
      .eq("id", item.id);

    if (updateError) throw updateError;

    // 4. Catat ke Buku Kasir (Riwayat Pesanan)
    const totalHarga = item.price * args.jumlah;
    await supabase.from("client_orders").insert({
      client_id: clientData.id,
      customer_name: args.nama_pelanggan,
      customer_phone: args.nomor_hp,
      item_name: item.item_name,
      quantity: args.jumlah,
      total_price: totalHarga,
      status: 'pending' // Nanti admin klien bisa ubah jadi 'lunas' di dashboard
    });

    // 5. Kembalikan Resi ke AI
    const hargaRupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalHarga);
    return `Sistem Info: TRANSAKSI SUKSES! 
- Barang: ${item.item_name}
- Jumlah: ${args.jumlah} pcs
- Total Harga: ${hargaRupiah}
- Sisa Stok di Gudang Sekarang: ${sisaBaru}

Instruksi AI: Berikan konfirmasi pesanan ke pelanggan dengan antusias. Sebutkan total tagihan yang harus dibayar (${hargaRupiah}) dan ucapkan terima kasih!`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeBuatPesanan:", err.message);
    return "Sistem Info: Terjadi kesalahan sistem saat memproses transaksi. Mohon ulangi beberapa saat lagi.";
  }
}