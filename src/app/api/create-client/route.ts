// src/app/api/admin/create-client/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, whatsapp_number, system_prompt, plan_type, monthly_limit, slug, tos_accepted_at } = body;

    // 1. Inisialisasi Supabase dengan KUNCI DEWA (Service Role Key)
    // Ini memungkinkan kita membuat akun tanpa terikat session browser (tidak bikin admin ter-logout)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false, // Sangat penting agar tidak mengganggu session Admin
        },
      }
    );

    // 2. Buat User Authentication di Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bypass verifikasi email (otomatis terkonfirmasi)
      user_metadata: {
        name: name,
        role: "client" // Menandakan ini akun klien
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 3. Masukkan Data ke Tabel public.clients dengan ID yang sama
    const { error: dbError } = await supabaseAdmin.from("clients").insert([{
      id: newUserId,
      name,
      whatsapp_number,
      system_prompt,
      plan_type,
      monthly_limit,
      slug, // <-- tambahkan ini
      tos_accepted_at, // <-- tambahkan ini
      features: { has_addon: false }
    }]);

    if (dbError) {
      // Jika gagal masuk database, hapus auth-nya agar tidak ada data "zombie"
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // Berhasil total! Update meta data user agar nyambung ke client_id nya sendiri
    await supabaseAdmin.auth.admin.updateUserById(newUserId, {
        user_metadata: { client_id: newUserId }
    });

    return NextResponse.json({ message: "Klien berhasil dibuat!", clientId: newUserId }, { status: 200 });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}