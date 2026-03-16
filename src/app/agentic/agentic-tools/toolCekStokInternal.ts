import { SchemaType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Koneksi Supabase VIP
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const cekStokInternalSchema = {
  name: "cek_stok_internal",
  description: "Gunakan alat ini HANYA JIKA pelanggan menanyakan ketersediaan, stok, atau harga suatu barang/jasa.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      keyword_barang: { type: SchemaType.STRING, description: "Nama barang yang dicari, misal 'Oli Motul' atau 'Ban'" },
    },
    required: ["keyword_barang"],
  },
};

export async function executeCekStokInternal(args: any, clientData: any) {
  console.log(`[AGENTIC] 🔍 Mencari stok '${args.keyword_barang}' untuk Klien: ${clientData.id}`);
  
  const { data, error } = await supabase
    .from("client_inventory")
    .select("item_name, stock, price")
    .eq("client_id", clientData.id)
    .ilike("item_name", `%${args.keyword_barang}%`)
    .limit(3);

  if (error || !data || data.length === 0) {
    return `Sistem: Barang '${args.keyword_barang}' tidak ditemukan di gudang atau stok habis.`;
  }

  // Format data untuk dikembalikan ke Gemini
  const infoStok = data.map(item => `- ${item.item_name}: Sisa ${item.stock} pcs (Harga Rp ${item.price})`).join("\n");
  return `Sistem: Berikut data dari gudang:\n${infoStok}\nBeritahu pelanggan informasi ini dengan ramah.`;
}