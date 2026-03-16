import { SchemaType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const potongStokInternalSchema = {
  name: "potong_stok_internal",
  description: "Gunakan alat ini JIKA pelanggan sudah SETUJU/DEAL untuk membeli atau memesan barang. Alat ini akan memotong stok di database.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      keyword_barang: { type: SchemaType.STRING, description: "Nama barang yang dibeli (harus spesifik)" },
      jumlah_beli: { type: SchemaType.INTEGER, description: "Berapa banyak barang yang dibeli" }
    },
    required: ["keyword_barang", "jumlah_beli"],
  },
};

export async function executePotongStokInternal(args: any, clientData: any) {
  console.log(`[AGENTIC] 🛒 Transaksi! Memotong ${args.jumlah_beli} pcs '${args.keyword_barang}' untuk Klien: ${clientData.id}`);
  
  // 1. Cari barangnya dulu yang paling cocok
  const { data: item } = await supabase
    .from("client_inventory")
    .select("id, item_name, stock")
    .eq("client_id", clientData.id)
    .ilike("item_name", `%${args.keyword_barang}%`)
    .single();

  if (!item) return "Sistem Gagal: Barang tidak ditemukan, transaksi dibatalkan.";
  if (item.stock < args.jumlah_beli) return `Sistem Gagal: Stok tidak cukup! Sisa stok ${item.item_name} hanya ${item.stock}.`;

  // 2. Potong stoknya (Update Database!)
  const sisaBaru = item.stock - args.jumlah_beli;
  const { error } = await supabase
    .from("client_inventory")
    .update({ stock: sisaBaru })
    .eq("id", item.id);

  if (error) return "Sistem Gagal: Terjadi kesalahan saat update database.";

  return `Sistem Sukses: Transaksi berhasil! Stok ${item.item_name} telah dipotong sebanyak ${args.jumlah_beli}. Sisa stok sekarang: ${sisaBaru}. Konfirmasi ke pelanggan bahwa pesanan berhasil dicatat.`;
}