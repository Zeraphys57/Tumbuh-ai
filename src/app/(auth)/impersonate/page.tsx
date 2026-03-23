"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function ImpersonateTransit() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("MENGAMBIL ALIH KENDALI...");
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 1. PASANG RADAR: Supabase akan otomatis teriak kalau dia sudah selesai baca URL & bikin Cookie
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatusText("AKSES DITERIMA! MENGALIHKAN...");
        // Tembus gerbang utama dengan Cookie yang sudah matang!
        window.location.href = "/dashboard/leads"; 
      }
    });

    // 2. BACKUP PLAN: Kasih waktu toleransi 3 detik. 
    // Kalau lewat 3 detik nggak ada tanda-tanda login, baru kita tendang.
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("Gagal mendapatkan sesi. Token mungkin kadaluarsa.");
        router.push("/login"); 
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, supabase.auth]);

  // ANIMASI LOADING BIRU
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
      <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin z-10 shadow-[0_0_30px_rgba(59,130,246,0.5)]"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse z-10">
        {statusText}
      </p>
    </div>
  );
}