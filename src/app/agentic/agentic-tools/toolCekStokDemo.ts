// lib/agentic/agentic-tools/toolCekStokDemo.ts
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

// 1. "BROSUR" UNTUK GEMINI
// Ini yang dikasih ke AI supaya dia tahu kapan harus pakai alat ini
export const cekStokSchema: FunctionDeclaration = {
  name: "cek_stok_demo",
  description: "Gunakan fungsi ini SECARA OTOMATIS jika pelanggan menanyakan ketersediaan atau sisa stok sebuah produk.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      nama_produk: {
        type: SchemaType.STRING,
        description: "Nama produk yang ditanyakan pelanggan (misal: 'Sepatu Nike', 'Kopi Susu')",
      },
    },
    required: ["nama_produk"],
  },
};

// 2. MESIN PEKERJA (LOGIKA ASLI)
// Ini kode Node.js murni yang akan berjalan di belakang layar
export async function executeCekStok(args: { nama_produk: string }, clientConfig: any) {
  console.log(`[AGENTIC] 🔍 Menjalankan pencarian stok untuk: ${args.nama_produk}`);
  
  // DI SINI NANTI BOS BISA TARIK DATA DARI SUPABASE ATAU API KASIR KLIEN
  // Untuk contoh awal, kita buat simulasi (dummy) jawaban:
  
  const keyword = args.nama_produk.toLowerCase();
  
  if (keyword.includes("sepatu")) {
    return { status: "tersedia", sisa_stok: 12, harga: 250000 };
  } else if (keyword.includes("baju")) {
    return { status: "habis", sisa_stok: 0, catatan: "Restock minggu depan" };
  } else {
    return { status: "tersedia", sisa_stok: 5, catatan: "Stok menipis" };
  }
}