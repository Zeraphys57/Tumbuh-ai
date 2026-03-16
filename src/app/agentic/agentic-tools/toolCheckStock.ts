import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const checkStockSchema: FunctionDeclaration = {
  name: "check_stock",
  description: "Gunakan alat ini SELALU ketika pelanggan menanyakan ketersediaan barang, sisa stok, atau harga produk. Alat ini mencari data secara real-time.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      keyword: { 
        type: SchemaType.STRING, 
        description: "Kata kunci nama barang yang dicari. Harus singkat (misal: 'sepatu', 'oli motul', 'kopi')." 
      },
    },
    required: ["keyword"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Hybrid)
// ============================================================================
export async function executeCheckStock(args: { keyword: string }, clientData: any) {
  console.log(`[AGENTIC 📦] Memproses Cek Stok '${args.keyword}' untuk Klien ID: ${clientData.id}`);
  
  try {
    // A. CEK KONFIGURASI KLIEN (Apakah dia pakai API Luar atau Database Internal?)
    // Diambil dari JSONB fitur klien yang sudah di-parsing di route.ts
    const features = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {});
    const inventoryMode = features.inventory_mode || "internal"; // Default ke UMKM (Internal)

    // ========================================================================
    // JALUR 1: KLIEN ENTERPRISE (Pakai API Luar)
    // ========================================================================
    if (inventoryMode === "external_api" && features.inventory_api_url) {
      console.log(`[AGENTIC 🌐] Menggunakan API Eksternal: ${features.inventory_api_url}`);
      
      const response = await fetch(`${features.inventory_api_url}?search=${encodeURIComponent(args.keyword)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${features.inventory_api_key || ""}`
        }
      });

      if (!response.ok) throw new Error("API Eksternal Klien sedang bermasalah.");
      
      const externalData = await response.json();
      // Asumsi format balasan API klien: { status: "success", data: [{ nama: "Sepatu", stok: 10, harga: 200000 }] }
      if (!externalData.data || externalData.data.length === 0) {
         return `Sistem: Barang '${args.keyword}' tidak ditemukan di sistem kasir/gudang pusat.`;
      }

      let resultText = `Sistem Info (Dari API Klien):\n`;
      externalData.data.forEach((item: any) => {
        resultText += `- ${item.nama} | Sisa Stok: ${item.stok} | Harga: Rp${item.harga}\n`;
      });
      return resultText + "\nInstruksi AI: Sampaikan data ini ke pelanggan dengan ramah.";
    }

    // ========================================================================
    // JALUR 2: KLIEN UMKM (Pakai Database Supabase Tumbuh.ai)
    // ========================================================================
    console.log(`[AGENTIC 🗄️] Menggunakan Database Internal Tumbuh.ai`);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("client_inventory")
      .select("item_name, stock, price")
      .eq("client_id", clientData.id)
      .ilike("item_name", `%${args.keyword}%`)
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      return `Sistem Info: Barang '${args.keyword}' tidak ditemukan di katalog gudang. Beritahu pelanggan dengan sopan.`;
    }

    let resultText = `Sistem Info (Dari Gudang Internal):\n`;
    data.forEach((item) => {
      const status = item.stock > 0 ? `Ready (Sisa ${item.stock})` : "HABIS (Stok 0)";
      const hargaRupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price);
      resultText += `- Produk: ${item.item_name} | Status: ${status} | Harga: ${hargaRupiah}\n`;
    });

    return resultText + `\nInstruksi AI: Sampaikan data ketersediaan ini ke pelanggan dengan gaya bahasa yang natural.`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeCheckStock:", err.message);
    return "Sistem Info: Mohon maaf, sistem pengecekan stok sedang sibuk atau gangguan. Minta pelanggan menunggu.";
  }
}