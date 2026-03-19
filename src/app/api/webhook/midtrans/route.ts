import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 1. Validasi Body (Mencegah server crash kalau Midtrans ngirim data kosong)
    if (!data?.order_id || !data?.signature_key) {
      return NextResponse.json({ message: "Bad Request" }, { status: 400 });
    }

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = data;

    // 2. Buat Hash dari data yang dikirim
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const hash = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    // 3. Keamanan Tingkat Tinggi: Mencegah Timing Attack (Saran Bapak Claude)
    const hashBuffer = Buffer.from(hash, 'hex');
    const sigBuffer = Buffer.from(signature_key, 'hex');

    if (hashBuffer.length !== sigBuffer.length || !crypto.timingSafeEqual(hashBuffer, sigBuffer)) {
      console.error(`🚨 ALERT: Invalid Signature detected for Order: ${order_id}`);
      return NextResponse.json({ message: "Invalid Signature" }, { status: 403 });
    }

    // 4. Cek Status Pembayaran (Pakai === agar strict type check)
    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept") {
        // PEMBAYARAN SUKSES & AMAN!
        console.log(`✅ Pembayaran Sukses untuk Order ID: ${order_id}`);
        
        // TODO: Update status di Database Bos (Prisma/Supabase/dsb)
      }
    } else if (
      transaction_status === "cancel" || 
      transaction_status === "deny" || 
      transaction_status === "expire"
    ) {
      // PEMBAYARAN GAGAL / BATAL
      console.log(`❌ Pembayaran Gagal/Batal untuk Order ID: ${order_id}`);
      
      // TODO: Update status gagal di Database
    }

    // 5. Kasih tahu Midtrans kalau laporan sudah diterima (Wajib Balas 200 OK)
    return NextResponse.json({ message: "OK" }, { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}