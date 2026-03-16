import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { clientSlug, customerPhone, text } = await request.json();

    if (!clientSlug || !customerPhone || !text) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // 1. Ambil data klien dari Supabase untuk dapat token IG
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("instagram_access_token, instagram_account_id")
      .eq("slug", clientSlug)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client tidak ditemukan" }, { status: 404 });
    }

    const { instagram_access_token, instagram_account_id } = client;

    if (!instagram_access_token || !instagram_account_id) {
       return NextResponse.json({ error: "Token atau ID Instagram Klien belum disetting" }, { status: 400 });
    }

    // 2. Kirim pesan pakai Instagram Graph API
    // Catatan: customerPhone di sini sebenarnya berisi IG ID pelanggan
    const igApiUrl = `https://graph.facebook.com/v18.0/${instagram_account_id}/messages`;

    const response = await fetch(igApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instagram_access_token}`,
      },
      body: JSON.stringify({
        recipient: {
          id: customerPhone, // ID Customer Instagram
        },
        message: {
          text: text,
        },
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("❌ Gagal kirim IG:", responseData);
      return NextResponse.json({ error: "Gagal mengirim pesan IG", detail: responseData }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: "Pesan IG berhasil dikirim!" }, { status: 200 });

  } catch (error) {
    console.error("❌ Fatal Error send-manual IG:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}