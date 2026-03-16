import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Supabase Backend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientSlug, customerPhone, text } = body;

    if (!clientSlug || !customerPhone || !text) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // 1. Ambil Token WA milik Klien dari Database
    const { data: client, error } = await supabase
      .from("clients")
      .select("whatsapp_phone_number_id, whatsapp_access_token")
      .eq("slug", clientSlug)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
    }

    // 2. Kirim Pesan via Meta Graph API
    const url = `https://graph.facebook.com/v18.0/${client.whatsapp_phone_number_id}/messages`;
    
    const metaResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${client.whatsapp_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: customerPhone,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });

    if (!metaResponse.ok) {
      const metaError = await metaResponse.json();
      console.error("Meta API Error:", metaError);
      return NextResponse.json({ error: "Gagal ngirim ke Meta" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Fatal Error Send Manual:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}