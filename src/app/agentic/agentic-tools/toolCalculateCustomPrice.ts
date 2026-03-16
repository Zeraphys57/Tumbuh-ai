import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const calculateCustomPriceSchema: FunctionDeclaration = {
  name: "calculate_custom_price",
  description: "Gunakan alat ini jika pelanggan meminta estimasi harga untuk barang KUSTOM (seperti cetak banner, jahit baju, kue kustom, dll) yang harganya bergantung pada ukuran, bahan, atau kuantitas.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      product_type: { 
        type: SchemaType.STRING, 
        description: "Jenis produk kustom yang dipesan (contoh: 'Spanduk', 'Kemeja', 'Kue Ulang Tahun')." 
      },
      material: { 
        type: SchemaType.STRING, 
        description: "Bahan yang digunakan (contoh: 'Flexi Korea', 'Katun', 'Fondant'). Jika tidak disebutkan, isi dengan 'Standar'." 
      },
      size_or_dimension: { 
        type: SchemaType.STRING, 
        description: "Ukuran produk (contoh: '2x3 meter', 'XL', 'Diameter 20cm'). Jika tidak tahu, isi 'Standar'." 
      },
      quantity: { 
        type: SchemaType.INTEGER, 
        description: "Jumlah barang yang dipesan. Default adalah 1." 
      }
    },
    required: ["product_type", "material", "size_or_dimension", "quantity"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Kalkulator Kustom)
// ============================================================================
export async function executeCalculateCustomPrice(args: any, clientData: any) {
  console.log(`[AGENTIC 🧮] Kalkulasi Harga Kustom: ${args.quantity}x ${args.product_type} (${args.material}, ${args.size_or_dimension}) untuk Klien: ${clientData.id}`);
  
  try {
    const features = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {});
    const pricingLogic = features.custom_pricing || null;

    // ========================================================================
    // JALUR 1: KLIEN PUNYA RUMUS SENDIRI DI DATABASE (Advanced)
    // ========================================================================
    // Jika nanti Bos bikin UI di dashboard agar klien percetakan bisa masukin 
    // harga per meter persegi, sistem akan menghitungnya di sini.
    if (pricingLogic && pricingLogic.base_price) {
      // Logika dinamis sesuai pengaturan klien...
      // (Bisa dikembangkan nanti saat Bos bikin fitur "Pricing Rules" di Dashboard)
    }

    // ========================================================================
    // JALUR 2: SIMULASI CERDAS (Fallback untuk Demo / UMKM)
    // ========================================================================
    // Kita buat AI menghitung estimasi harga yang realistis berdasarkan input.
    
    let basePrice = 50000; // Harga dasar
    let materialMultiplier = 1.0;
    
    // Deteksi Bahan (Makin premium, makin mahal)
    const materialLower = args.material.toLowerCase();
    if (materialLower.includes("premium") || materialLower.includes("korea") || materialLower.includes("sutra")) {
        materialMultiplier = 1.5; // Lebih mahal 50%
    } else if (materialLower.includes("murah") || materialLower.includes("ekonomis")) {
        materialMultiplier = 0.8; // Lebih murah 20%
    }

    // Deteksi Ukuran (Sangat kasar, tapi bikin AI terlihat pintar)
    let sizeMultiplier = 1.0;
    const sizeLower = args.size_or_dimension.toLowerCase();
    if (sizeLower.includes("meter") || sizeLower.includes("xl") || sizeLower.includes("besar")) {
        sizeMultiplier = 2.0; // Ukuran besar harganya dobel
    }

    // Hitung Total
    let unitPrice = basePrice * materialMultiplier * sizeMultiplier;
    
    // Pembulatan ke kelipatan 5.000 terdekat biar harganya wajar (misal: 112.500 jadi 115.000)
    unitPrice = Math.round(unitPrice / 5000) * 5000; 

    const totalPrice = unitPrice * args.quantity;

    // Format Rupiah
    const formatRupiah = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

    return `Sistem Info: Estimasi Biaya Kustom (Simulasi)
- Produk: ${args.product_type}
- Spesifikasi: Bahan ${args.material}, Ukuran ${args.size_or_dimension}
- Harga Satuan: ${formatRupiah(unitPrice)}
- Jumlah: ${args.quantity}
- ESTIMASI TOTAL: ${formatRupiah(totalPrice)}

Instruksi AI: Sampaikan estimasi biaya ini kepada pelanggan. Tegaskan bahwa ini adalah "Estimasi Awal" dan harga pasti bisa sedikit berbeda tergantung detail desain yang diberikan nanti. Tanyakan apakah mereka ingin lanjut ke tahap desain/produksi.`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeCalculateCustomPrice:", err.message);
    return "Sistem Info: Kalkulator harga kustom sedang gangguan. Beritahu pelanggan bahwa admin/tim teknis akan segera menghitungkan estimasi biayanya secara manual.";
  }
}