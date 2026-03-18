"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardTrafficController() {
  const router = useRouter(); 

  // [FIX 2: PERFORMA] Gunakan useMemo agar koneksi Supabase tidak dibuat ulang tiap render
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    async function checkUserAndRedirect() {
      // Ambil data user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login"); // Redirect instan tanpa kedip
        return;
      }

      const email = user.email?.toLowerCase();

      // [FIX 1 & 3: KEAMANAN SIBER] 
      // Ambil daftar email admin dari .env dan pisahkan dengan koma (jika ada lebih dari 1)
      const adminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "").toLowerCase().split(",");

      // Cek apakah email user yang login ada di dalam daftar Whitelist Admin
      if (email && adminEmails.includes(email)) {
        router.replace("/dashboard/admin"); 
      } else {
        // Jika klien biasa, arahkan ke /leads
        router.replace("/dashboard/leads");
      }
    }

    checkUserAndRedirect();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [FIX 2] Dependency array kosong agar hanya jalan sekali saat mount

  // Tampilan loading sementara saat sistem mengecek identitas
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter">
          Verifying <span className="text-blue-600">Access Level...</span>
        </h2>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2 animate-pulse">
          Tumbuh AI Security Protocol
        </p>
      </div>
    </div>
  );
}