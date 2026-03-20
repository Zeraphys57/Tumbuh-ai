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
    
    // [FIX]: Sinkronisasi dengan Frontend, turunkan limit ke 2000 karakter
    if (text.length > 2000) {
      return NextResponse.json({ error: "Pesan terlalu panjang (Maksimal 2000 karakter)" }, { status: 400 });
    }

    // ========================================================================
    // 3. SETUP SERVICE ROLE UNTUK QUERY DATABASE
    // ========================================================================
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    const { data: targetClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, whatsapp_phone_number_id, whatsapp_access_token")
      .eq("slug", clientSlug)
      .single();

    if (clientError || !targetClient) {
      return NextResponse.json({ error: "Klien tidak ditemukan di Database" }, { status: 404 });
    }

    // ========================================================================
    // 4. NEW OWNERSHIP VALIDATION (Enterprise Grade)
    // ========================================================================
    const { data: currentUser } = await supabaseAdmin
      .from("clients")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isOwner = targetClient.id === user.id; 
    const isSuperAdmin = currentUser?.role === "super_admin"; 

    if (!isOwner && !isSuperAdmin) {
      console.warn(`🚨 [SECURITY BREACH] User ${user.id} mencoba membajak WA klien ${clientSlug}`);
      return NextResponse.json({ error: "Anda tidak memiliki otoritas ke klien ini" }, { status: 403 });
    }

    // ========================================================================
    // 5. SMART PHONE FORMATTER (Auto-Convert 0 ke 62)
    // ========================================================================
    let formattedPhone = customerPhone.replace(/\D/g, ""); 
    
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
        to: formattedPhone, 
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      // [FIX PAK CLAUDE]: Log detail cukup di server, jangan kirim ke browser (Mencegah Data Leakage)
      console.error("❌ Meta API Error:", JSON.stringify(metaResult, null, 2));
      return NextResponse.json({ error: "Gagal mengirim pesan ke WhatsApp" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message_id: metaResult.messages[0].id }, { status: 200 });

  } catch (error) {
    console.error("Fatal Error Send Manual:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}