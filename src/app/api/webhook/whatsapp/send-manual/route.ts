import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // ========================================================================
    // 1. AUTH CHECK OTOMATIS (Sesi Login)
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
    // 2. VALIDASI INPUT AWAL
    // ========================================================================
    if (!clientSlug || !customerPhone || !text) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    
    if (text.length > 4096) {
      return NextResponse.json({ error: "Pesan terlalu panjang (Maksimal 4096 karakter)" }, { status: 400 });
    }

    // ========================================================================
    // 3. SETUP SERVICE ROLE UNTUK QUERY DATABASE
    // ========================================================================
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Pastikan Key ini ada di .env ya Bos!
    );

    // [FIX 1]: Ganti select "email" jadi "id", karena tabel kita pakai relasi UUID
    const { data: targetClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, whatsapp_phone_number_id, whatsapp_access_token")
      .eq("slug", clientSlug)
      .single();

    if (clientError || !targetClient) {
      return NextResponse.json({ error: "Klien tidak ditemukan di Database" }, { status: 404 });
    }

    // ========================================================================
    // 4. [FIX 2] NEW OWNERSHIP VALIDATION (Enterprise Grade)
    // ========================================================================
    // Intip role user yang sedang login
    const { data: currentUser } = await supabaseAdmin
      .from("clients")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isOwner = targetClient.id === user.id; // Apakah dia pemilik Node ini?
    const isSuperAdmin = currentUser?.role === "super_admin"; // Atau dia Bos-nya?

    if (!isOwner && !isSuperAdmin) {
      console.warn(`🚨 [SECURITY BREACH] User ${user.id} mencoba membajak WA klien ${clientSlug}`);
      return NextResponse.json({ error: "Anda tidak memiliki otoritas ke klien ini" }, { status: 403 });
    }

    // ========================================================================
    // 5. [FIX 3] SMART PHONE FORMATTER (Auto-Convert 0 ke 62)
    // ========================================================================
    // Buang semua karakter aneh (+, -, spasi)
    let formattedPhone = customerPhone.replace(/\D/g, ""); 
    
    // Kalau depannya 0, sulap jadi 62 (Kode Indonesia) biar Meta nggak ngamuk
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.substring(1);
    }

    if (formattedPhone.length < 9 || formattedPhone.length > 16) {
      return NextResponse.json({ error: "Format nomor tidak masuk akal" }, { status: 400 });
    }

    // ========================================================================
    // 6. EKSEKUSI PENGIRIMAN KE META GRAPH API
    // ========================================================================
    if (!targetClient.whatsapp_phone_number_id || !targetClient.whatsapp_access_token) {
      return NextResponse.json({ error: "Kredensial WhatsApp klien belum diatur" }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v18.0/${targetClient.whatsapp_phone_number_id}/messages`;
    
    const metaResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${targetClient.whatsapp_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone, // Pakai nomor yang sudah disulap
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("❌ Meta API Error:", JSON.stringify(metaResult, null, 2));
      return NextResponse.json({ error: "Gagal ngirim ke Meta API", details: metaResult }, { status: 500 });
    }

    return NextResponse.json({ success: true, message_id: metaResult.messages[0].id }, { status: 200 });

  } catch (error) {
    console.error("Fatal Error Send Manual:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}