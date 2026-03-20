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

    // Instagram message text limit (sekitar 1000 karakter idealnya)
    if (text.length > 1000) {
      return NextResponse.json({ error: "Pesan terlalu panjang (Maksimal 1000 karakter)" }, { status: 400 });
    }

    // ========================================================================
    // 3. SETUP SERVICE ROLE UNTUK QUERY DATABASE
    // ========================================================================
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Pastikan Key ini aman di .env
    );

    // ========================================================================
    // 4. AMBIL DATA KLIEN & CEK KEPEMILIKAN (SECURITY LAYER)
    // ========================================================================
    const { data: targetClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, instagram_access_token, instagram_account_id")
      .eq("slug", clientSlug)
      .single();

    if (clientError || !targetClient) {
      return NextResponse.json({ error: "Klien tidak ditemukan di Database" }, { status: 404 });
    }

    // Intip role user yang sedang login
    const { data: currentUser } = await supabaseAdmin
      .from("clients")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isOwner = targetClient.id === user.id; // Apakah dia pemilik Node ini?
    const isSuperAdmin = currentUser?.role === "super_admin"; // Atau dia Bos-nya?

    if (!isOwner && !isSuperAdmin) {
      console.warn(`🚨 [SECURITY BREACH] User ${user.id} mencoba membajak IG klien ${clientSlug}`);
      return NextResponse.json({ error: "Anda tidak memiliki otoritas ke klien ini" }, { status: 403 });
    }

    // ========================================================================
    // 5. EKSEKUSI PENGIRIMAN KE INSTAGRAM GRAPH API
    // ========================================================================
    if (!targetClient.instagram_access_token || !targetClient.instagram_account_id) {
      return NextResponse.json({ error: "Kredensial Instagram klien belum diatur" }, { status: 400 });
    }

    // Catatan: customerPhone di sini sebenarnya berisi IG Scoped ID pelanggan
    const igApiUrl = `https://graph.facebook.com/v18.0/${targetClient.instagram_account_id}/messages`;

    const metaResponse = await fetch(igApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${targetClient.instagram_access_token}`,
      },
      body: JSON.stringify({
        recipient: {
          id: customerPhone, 
        },
        message: {
          text: text,
        },
      }),
    });

    const metaResult = await metaResponse.json();

    // ========================================================================
    // [FIX PAK CLAUDE]: Cegah Data Leakage Info Internal Meta ke Client
    // ========================================================================
    if (!metaResponse.ok) {
      console.error("❌ Meta API Error (IG) details:", JSON.stringify(metaResult, null, 2));
      return NextResponse.json({ error: "Gagal mengirim pesan ke Instagram" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message_id: metaResult.message_id }, { status: 200 });

  } catch (error) {
    console.error("Fatal Error Send Manual IG:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}