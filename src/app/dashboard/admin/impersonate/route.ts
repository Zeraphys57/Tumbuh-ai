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

    // 2. Ambil Email Klien
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(clientId);

    if (userError || !userData.user || !userData.user.email) {
      return NextResponse.json({ error: "Data klien tidak ditemukan di brankas Auth" }, { status: 404 });
    }

    const clientEmail = userData.user.email;
    
    // [FIX 🟢] BACA DOMAIN ASLI DARI HEADER BROWSER (ANTI-PROXY VERCEL)
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    
    // Prioritaskan ENV, kalau kosong, rakit URL dari header asli
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    
    console.log("DEBUG IMPERSONATE - SITE URL DETECTED:", SITE_URL);

    // 3. GENERATE MAGIC LINK
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: clientEmail,
      options: { 
          // Pastikan /dashboard/leads ini memang URL tujuan akhirnya
          redirectTo: `${SITE_URL}/impersonate` 
        }
    });

    if (linkError) {
      return NextResponse.json({ error: "Gagal menembus keamanan: " + linkError.message }, { status: 500 });
    }

    // 4. Kembalikan Link Ajaib
    return NextResponse.json({ url: linkData.properties?.action_link }, { status: 200 });

  } catch (error: any) {
    console.error("Impersonate Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}