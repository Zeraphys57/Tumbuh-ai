// src/app/api/admin/create-client/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. TANGKAP user_id DARI FRONTEND
    const { user_id, email, password, name, whatsapp_number, system_prompt, plan_type, monthly_limit, slug, tos_accepted_at } = body;

    // Validasi keamanan: Pastikan ID user benar-benar ada
    if (!user_id) {
      return NextResponse.json({ error: "Akses Ditolak: User ID tidak ditemukan (Verifikasi OTP mungkin gagal)" }, { status: 400 });
    }

    // 2. Inisialisasi Supabase dengan KUNCI DEWA (Service Role Key)
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

    // KITA SKIP PROSES CREATE USER (Karena sudah dieksekusi oleh form Register di frontend lewat OTP)

    // 3. Masukkan Data ke Tabel public.clients menggunakan ID dari frontend
    const { error: dbError } = await supabaseAdmin.from("clients").insert([{
      id: user_id, // <-- Gunakan ID hasil OTP
      name,
      whatsapp_number,
      system_prompt,
      plan_type,
      monthly_limit,
      slug, 
      tos_accepted_at, 
      features: { has_addon: false }
    }]);

    if (dbError) {
      // Jika gagal masuk database (misal slug udah dipakai), hapus auth-nya agar tidak ada data "zombie"
      await supabaseAdmin.auth.admin.deleteUser(user_id);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // 4. Update Meta Data User 
    // (Penting: karena saat klien daftar pakai OTP di awal, kita belum set Role & Nama mereka)
    await supabaseAdmin.auth.admin.updateUserById(user_id, {
        user_metadata: { 
          name: name,
          role: "client", // Kunci agar sistem tahu ini klien, bukan Super Admin
          client_id: user_id 
        }
    });

    return NextResponse.json({ message: "Klien berhasil dibuat!", clientId: user_id }, { status: 200 });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}