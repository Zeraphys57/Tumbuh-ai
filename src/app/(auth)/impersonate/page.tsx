"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function ImpersonateTransit() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 1. Supabase akan otomatis membaca URL #access_token 
    // dan menyimpannya ke dalam Cookie (Biar Middleware Next.js percaya)
    const setSessionAndRedirect = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        // 2. Cookie sudah terpasang! Sekarang kita tembus gerbang utama.
        window.location.href = "/dashboard/leads"; // Pakai window.location biar halamannya ke-refresh penuh
      } else {
        // Kalau tokennya rusak / kadaluarsa
        console.error("Gagal mendapatkan sesi:", error);
        router.push("/login"); 
      }
    };

    setSessionAndRedirect();
  }, [router, supabase.auth]);

  // Animasi Loading Keren khas Tumbuh AI selagi memproses Token
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
      <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin z-10 shadow-[0_0_30px_rgba(59,130,246,0.5)]"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse z-10">
        MENGAMBIL ALIH KENDALI...
      </p>
    </div>
  );
}