import { NextResponse } from "next/server";
import crypto from "crypto"; 

const VALID_PLANS: Record<string, { monthly: number; annual: number }> = {
  "Starter Core": { monthly: 499000, annual: 4788000 },
  "Business Intelligence": { monthly: 849000, annual: 8148000 },
};

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { planName, isAnnual, customerName, customerEmail } = data; 

    // 1. Validasi Paket
    const plan = VALID_PLANS[planName];
    if (!plan) {
      console.error(`🚨 ALERT: Percobaan manipulasi plan terdeteksi: ${planName}`);
      return NextResponse.json({ message: "Paket tidak valid atau tidak ditemukan" }, { status: 400 });
    }

    // 2. Validasi Kekosongan Data
    if (!customerName || !customerEmail) {
      return NextResponse.json({ message: "Nama dan Email wajib diisi" }, { status: 400 });
    }

    // 3. Validasi Format Email (Saran Super Pak Claude 🛡️)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json({ message: "Format email tidak valid" }, { status: 400 });
    }

    const actualPrice = isAnnual ? plan.annual : plan.monthly;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    
    const apiUrl = isProduction 
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const authString = Buffer.from(`${serverKey}:`).toString("base64");
    const orderId = `TUMBUH-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const nameParts = customerName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: actualPrice,
      },
      item_details: [
        {
          id: planName.replace(/\s+/g, '-').toLowerCase(),
          price: actualPrice,
          quantity: 1,
          name: `Paket ${planName} ${isAnnual ? '(Tahunan)' : '(Bulanan)'}`
        }
      ],
      customer_details: {
        first_name: firstName,
        last_name: lastName,
        email: customerEmail, 
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Midtrans Error:", result);
      return NextResponse.json({ message: "Gagal membuat transaksi ke payment gateway" }, { status: 500 });
    }

    return NextResponse.json({ token: result.token });

  } catch (error) {
    console.error("Transaction API Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}