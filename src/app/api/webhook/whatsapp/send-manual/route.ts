import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // ========================================================================
    // 1. AUTH CHECK (Sesi Login)
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

    if (text.length > 2000) {
      return NextResponse.json({ error: "Pesan terlalu panjang (Maksimal 2000 karakter)" }, { status: 400 });
    }

    // ========================================================================
    // 3. CEK KLIEN + OWNERSHIP
    // HIGH 2: Promise.allSettled — isolasi error per query, log spesifik di server
    // ========================================================================
    const [clientResult, userResult] = await Promise.allSettled([
      supabase.from("clients")
        .select("id, whatsapp_phone_number_id, whatsapp_access_token")
        .eq("slug", clientSlug)
        .maybeSingle(),
      supabase.from("clients")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (clientResult.status === "rejected") {
      console.error("[DB ERROR] Gagal mengambil data klien:", clientResult.reason);
      return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
    }
    if (userResult.status === "rejected") {
      console.error("[DB ERROR] Gagal mengambil data user/role:", userResult.reason);
      return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
    }

    const targetClient = clientResult.value.data;
    const currentUser = userResult.value.data;

    // Anti-enumerasi: selalu 403, tidak pernah 404
    const isOwner = targetClient?.id === user.id;
    const isSuperAdmin = currentUser?.role === "super_admin";

    if (!targetClient || (!isOwner && !isSuperAdmin)) {
      console.warn(`🚨 [SECURITY] User ${user.id} → akses ditolak untuk klien slug: ${clientSlug}`);
      return NextResponse.json({ error: "Akses ditolak atau klien tidak ditemukan." }, { status: 403 });
    }

    // ========================================================================
    // 4. SMART PHONE FORMATTER
    // ========================================================================
    let formattedPhone = customerPhone.replace(/\D/g, "");

    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("8")) {
      formattedPhone = "62" + formattedPhone;
    }

    if (formattedPhone.length < 9 || formattedPhone.length > 16) {
      return NextResponse.json({ error: "Format nomor tidak masuk akal" }, { status: 400 });
    }

    // ========================================================================
    // 5. VALIDASI KREDENSIAL WA
    // ========================================================================
    if (!targetClient.whatsapp_phone_number_id || !targetClient.whatsapp_access_token) {
      return NextResponse.json({ error: "Kredensial WhatsApp klien belum diatur" }, { status: 400 });
    }

    // ========================================================================
    // 6. EKSEKUSI PENGIRIMAN KE META GRAPH API
    // ========================================================================
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
      console.error("❌ Meta API Error:", JSON.stringify(metaResult, null, 2));
      return NextResponse.json({ error: "Gagal mengirim pesan ke WhatsApp" }, { status: 500 });
    }

    const messageId = metaResult?.messages?.[0]?.id || "unknown";

    // ========================================================================
    // 7. RICH AUDIT TRAIL (MEDIUM 1) — fire-and-forget ke admin_logs
    // Tulis ke admin_logs (bukan usage_logs) karena ini aksi admin, bukan AI call.
    // Kolom `details` pada admin_logs menyimpan JSON dengan info detail forensik.
    // ========================================================================
    supabase.from("admin_logs").insert({
      admin_email: user.email || user.id,
      action_type: "manual_send",
      target_client: clientSlug,
      details: JSON.stringify({
        admin_id: user.id,
        target_phone: formattedPhone,
        client_slug: clientSlug,
        message_id: messageId,
      }),
    }).then(({ error }) => { if (error) console.error("⚠️ Audit Log Send-Manual Error:", error.message); });

    return NextResponse.json({ success: true, message_id: messageId }, { status: 200 });

  } catch (error) {
    console.error("Fatal Error Send Manual:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
