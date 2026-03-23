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
    const processMagicLink = async () => {
      // 1. TANGKAP URL HASH (Koper berisi Token Magic Link)
      const hash = window.location.hash;
      
      if (hash && hash.includes("access_token")) {
        setStatusText("MENYADAP DATA KLIEN...");
        
        // 2. BONGKAR KOPER SECARA MANUAL
        // Kita pecah URL-nya untuk ngambil access_token dan refresh_token
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          // 3. PAKSA GANTI BAJU!
          // Perintah ini akan mencopot sesi Admin, dan menggantinya dengan sesi Klien
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error("Gagal menyamar:", error);
            router.push("/login");
            return;
          }

          // 4. PENYAMARAN SUKSES! LANGSUNG MASUK!
          setStatusText("PENYAMARAN BERHASIL! MENGALIHKAN...");
          window.location.href = "/dashboard/leads";
          return;
        }
      }

      // BACKUP PLAN: Kalau nggak ada hash, kita cek sesi normal
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         window.location.href = "/dashboard/leads";
      } else {
         router.push("/login");
      }
    };

    // Beri jeda 0.5 detik biar browser sempat memuat URL Hash dengan sempurna
    setTimeout(() => {
      processMagicLink();
    }, 500);

  }, [router, supabase]);

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