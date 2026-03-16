import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

// ============================================================================
// 1. BROSUR UNTUK GEMINI (Schema)
// ============================================================================
export const calculateShippingSchema: FunctionDeclaration = {
  name: "calculate_shipping",
  description: "Gunakan alat ini SELALU ketika pelanggan menanyakan ongkos kirim (ongkir), biaya pengiriman, atau estimasi tarif ke kota/kecamatan mereka.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      destination_city: { 
        type: SchemaType.STRING, 
        description: "Nama kota, kabupaten, atau kecamatan tujuan pengiriman (misal: 'Bandung', 'Kecamatan Tebet', 'Surabaya')." 
      },
      weight_grams: { 
        type: SchemaType.INTEGER, 
        description: "Estimasi berat barang dalam hitungan gram. Jika pelanggan tidak menyebutkan berat, isi dengan angka default 1000 (1 kg)." 
      }
    },
    required: ["destination_city", "weight_grams"],
  },
};

// ============================================================================
// 2. MESIN PEKERJA (Logic Backend Kalkulator Ongkir)
// ============================================================================
export async function executeCalculateShipping(args: { destination_city: string, weight_grams: number }, clientData: any) {
  console.log(`[AGENTIC 🚚] Menghitung ongkir ke '${args.destination_city}' (Berat: ${args.weight_grams}g) untuk Klien: ${clientData.id}`);
  
  try {
    const features = typeof clientData.features === 'string' ? JSON.parse(clientData.features) : (clientData.features || {});
    const shippingMode = features.shipping_mode || "internal_simulation"; 

    // ========================================================================
    // JALUR 1: KLIEN ENTERPRISE (Tembak API RajaOngkir / Biteship sungguhan)
    // ========================================================================
    if (shippingMode === "rajaongkir" && features.rajaongkir_api_key) {
      console.log(`[AGENTIC 🌐] Menggunakan API Ekspedisi Klien...`);
      // Catatan: Ini struktur dummy untuk menembak API RajaOngkir di masa depan.
      // Nantinya Bos tinggal sesuaikan endpoint-nya jika klien punya API ini.
      /*
      const response = await fetch("https://api.rajaongkir.com/starter/cost", {
        method: "POST",
        headers: { key: features.rajaongkir_api_key, "Content-Type": "application/x-www-form-urlencoded" },
        body: `origin=${features.origin_city_id}&destination=${args.destination_city}&weight=${args.weight_grams}&courier=jne`
      });
      */
      return "Sistem Info: API RajaOngkir belum dikonfigurasi penuh oleh tim IT. Gunakan estimasi manual.";
    }

    // ========================================================================
    // JALUR 2: KLIEN UMKM (Simulasi Cerdas / Fallback)
    // ========================================================================
    console.log(`[AGENTIC 🧮] Menggunakan Simulasi Ongkir Internal Tumbuh.ai`);
    
    // Logika simulasi agar AI terlihat pintar saat demo:
    // Kita buat harga random yang realistis antara Rp 10.000 sampai Rp 45.000 per kg
    // Tapi kita "kunci" angkanya berdasarkan panjang huruf kota, supaya kalau user nanya kota yang sama, harganya tetap sama!
    
    const baseRatePerKg = 10000;
    const cityMultiplier = args.destination_city.length * 1500; // Formula rahasia ala Bos 😎
    
    let simulatedCost = baseRatePerKg + cityMultiplier;
    
    // Pembulatan ke kelipatan 1.000 terdekat biar masuk akal
    simulatedCost = Math.round(simulatedCost / 1000) * 1000; 

    // Hitung berdasarkan berat
    const kgMultiplier = Math.ceil(args.weight_grams / 1000);
    const totalCost = simulatedCost * kgMultiplier;

    const hargaRupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalCost);
    const beratKg = args.weight_grams / 1000;

    return `Sistem Info: Estimasi Ongkos Kirim ke ${args.destination_city.toUpperCase()}
- Berat Barang: ${beratKg} kg
- Estimasi Biaya: ${hargaRupiah} (Reguler 2-3 Hari)

Instruksi AI: Sampaikan estimasi ongkos kirim ini ke pelanggan. Beritahu mereka bahwa ini adalah tarif Reguler (estimasi 2-3 hari kerja).`;

  } catch (err: any) {
    console.error("[AGENTIC ❌] Error executeCalculateShipping:", err.message);
    return "Sistem Info: Gagal menghitung ongkos kirim karena gangguan server. Beritahu pelanggan bahwa admin yang akan menghitungkan ongkirnya nanti.";
  }
}