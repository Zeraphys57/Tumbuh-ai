import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // ========================================================================
    // 1. [FIX 1] AUTH CHECK OTOMATIS (Membaca Sesi Login via Cookies)
    // ========================================================================
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Akses ditolak. Sesi tidak valid." }, { status: 401 });
    }

    const body = await request.json();
    const { clientSlug, customerPhone, text } = body;

    // ========================================================================
    // 2. [FIX 2 & 3] VALIDASI INPUT (Mencegah Spam & Error Meta)
    // ========================================================================
    if (!clientSlug || !customerPhone || !text) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    
    // WhatsApp maksimal 4096 karakter per pesan
    if (text.length > 4096) {
      return NextResponse.json({ error: "Pesan terlalu panjang (Maksimal 4096 karakter)" }, { status: 400 });
    }

    // Format nomor internasional (Hanya angka, panjang 8-15 digit)
    const phoneRegex = /^[1-9]\d{7,14}$/; 
    if (!phoneRegex.test(customerPhone)) {
      return NextResponse.json({ error: "Format nomor tidak valid" }, { status: 400 });
    }

    // ========================================================================
    // 3. SETUP SERVICE ROLE UNTUK QUERY DATABASE
    // ========================================================================
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ambil Data Klien (Termasuk Email untuk cek kepemilikan)
    const { data: client, error } = await supabaseAdmin
      .from("clients")
      .select("email, whatsapp_phone_number_id, whatsapp_access_token")
      .eq("slug", clientSlug)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
    }

    // ========================================================================
    // 4. [FIX 1 - LANJUTAN] OWNERSHIP VALIDATION (Cek Kepemilikan)
    // ========================================================================
    const userEmail = user.email?.toLowerCase() || "";
    const superAdmins = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "").toLowerCase().split(",");
    
    // User HANYA boleh ngirim pesan jika: Dia pemilik slug ini, ATAU dia Super Admin
    const isOwner = client.email?.toLowerCase() === userEmail;
    const isSuperAdmin = superAdmins.includes(userEmail);

    if (!isOwner && !isSuperAdmin) {
      console.warn(`🚨 [SECURITY] User ${userEmail} mencoba membajak WA klien ${clientSlug}`);
      return NextResponse.json({ error: "Anda tidak memiliki akses ke klien ini" }, { status: 403 });
    }

    // ========================================================================
    // 5. EKSEKUSI PENGIRIMAN KE META GRAPH API
    // ========================================================================
    if (!client.whatsapp_phone_number_id || !client.whatsapp_access_token) {
      return NextResponse.json({ error: "Kredensial WhatsApp klien belum diatur" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Gagal ngirim ke Meta API" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Fatal Error Send Manual:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}