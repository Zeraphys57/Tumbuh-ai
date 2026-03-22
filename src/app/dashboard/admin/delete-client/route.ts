// src/app/api/admin/delete-client/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
  const { clientId } = await req.json();

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

  // 1. HAPUS DARI TABEL DATABASE DULU (Pusat Data Klien)
  const { error: dbError } = await supabaseAdmin
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (dbError) {
    console.error("DB Error:", dbError.message);
    return NextResponse.json({ error: "Gagal hapus di Database: " + dbError.message }, { status: 500 });
  }

  // 2. BARU HAPUS DARI KAMAR BRANKAS (AUTH)
  // Kita pakai admin.deleteUser biar nggak perlu password
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(clientId);

  if (authError) {
    // Kalau di Auth nggak ada (sudah dihapus manual), kita abaikan saja biar nggak error
    if (authError.message !== "User not found") {
      console.error("Auth Error:", authError.message);
      return NextResponse.json({ error: "Gagal hapus di Auth: " + authError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ message: "Klien MUSNAH TOTAL" }, { status: 200 });

} catch (error: any) {
  return NextResponse.json({ error: "Sistem Error: " + error.message }, { status: 500 });
}
}


