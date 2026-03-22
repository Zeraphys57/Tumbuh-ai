// src/app/api/admin/impersonate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json({ error: "Akses Ditolak: Client ID tidak valid" }, { status: 400 });
    }

    // 1. Panggil Supabase dengan KUNCI DEWA (Service Role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 2. Ambil Email Klien dari Kamar Brankas (Auth) berdasarkan ID
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(clientId);

    if (userError || !userData.user || !userData.user.email) {
      return NextResponse.json({ error: "Data klien tidak ditemukan di brankas Auth" }, { status: 404 });
    }

    const clientEmail = userData.user.email;
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 3. GENERATE MAGIC LINK (Bypass Password)
    // Ini menyuruh Supabase membuatkan link login sekali pakai khusus untuk email ini
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: clientEmail,
      options: { 
            redirectTo: `${SITE_URL}/dashboard/leads` 
        }
    });

    if (linkError) {
      return NextResponse.json({ error: "Gagal menembus keamanan: " + linkError.message }, { status: 500 });
    }

    // 4. Kembalikan Link Ajaib (action_link) ke Frontend
    return NextResponse.json({ url: linkData.properties?.action_link }, { status: 200 });

  } catch (error: any) {
    console.error("Impersonate Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}