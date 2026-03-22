// src/app/api/admin/delete-client/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json({ error: "Client ID wajib diisi" }, { status: 400 });
    }

    // 1. Inisialisasi Supabase dengan KUNCI DEWA
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

    // 2. HAPUS DARI KAMAR BRANKAS (AUTH)
    // Catatan: Karena di database kita set relasi Foreign Key (Cascade),
    // saat kita hapus user dari Auth, data di tabel 'clients' akan OTOMATIS terhapus juga!
    const { error } = await supabaseAdmin.auth.admin.deleteUser(clientId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Klien berhasil dimusnahkan tanpa sisa!" }, { status: 200 });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}