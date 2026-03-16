"use client"; 

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Features", href: "/" },
    { name: "Pricing", href: "/pricing" },
    { name: "Live Demo", href: "/demo" },
  ];

  // --- URL WHATSAPP BOS (SAMA DENGAN DI PAGE.TSX) ---
  const waLink = "https://wa.me/6281351958200?text=Halo%20Tim%20Tumbuh%20AI,%20saya%20tertarik%20untuk%20membangun%20Agen%20AI%20untuk%20bisnis%20saya.%20Bisa%20minta%20info%20lebih%20lanjut?";

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 relative">
      
      {/* =========================================
          NAVBAR: FULL-WIDTH PREMIUM GLASS
      ========================================= */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-[#020617]/50 backdrop-blur-2xl border-b border-white/5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* LOGO ELEGAN */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] group-hover:scale-105 transition-all duration-500">
              <BrainCircuit size={16} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-xl font-black tracking-tighter italic text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-cyan-400 transition-all duration-300">
              Tumbuh.
            </span>
          </Link>
          
          {/* 1% MAGIS: MENU LINK DENGAN DYNAMIC GLASS PILL */}
          <div className="hidden md:flex items-center gap-2 p-1.5 rounded-full bg-white/[0.02] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden ${
                    isActive 
                      ? "text-white border border-white/10 shadow-[0_0_20px_rgba(99,102,241,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] scale-100" 
                      : "text-slate-400 border border-transparent hover:text-white hover:bg-white/5 scale-95 hover:scale-100"
                  }`}
                >
                  {/* Efek Cahaya di dalam Kapsul (Hanya untuk yang aktif) */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-md pointer-events-none -z-10"></div>
                  )}

                  {isActive && (
                    <div className="absolute inset-0 bg-white/[0.05] pointer-events-none -z-10"></div>
                  )}
                  
                  {/* Titik Neon Berdenyut (Glowing Dot) */}
                  <span 
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                      isActive 
                        ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse w-1.5 opacity-100" 
                        : "w-0 opacity-0"
                    }`}
                  ></span>

                  {/* Teks Menu */}
                  <span className="relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* CTA BUTTONS DI NAVBAR */}
          <div className="flex items-center gap-6">
            <Link href="/login" className="hidden sm:block text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">
              Login
            </Link>
            
            {/* PERUBAHAN: LINK MENGARAH KE WHATSAPP DGN WARNA WA */}
            <a 
              href={waLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group relative px-6 py-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] overflow-hidden hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-105 transition-all duration-300 active:scale-95 border border-[#128C7E]/50 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 group-hover:scale-110 transition-transform">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="relative z-10">Konsultasi</span>
            </a>
          </div>

        </div>
      </nav>

      {/* =========================================
          MAIN CONTENT WRAPPER
      ========================================= */}
      <main className="flex-1 w-full flex flex-col relative z-10">
        {children}
      </main>

      {/* =========================================
          GLOBAL FOOTER (MINIMAL & MAHAL)
      ========================================= */}
      <footer className="relative z-20 border-t border-white/5 bg-[#04060c] pt-16 pb-8 overflow-hidden mt-auto hidden">
        {/* Footer utama disembunyikan di layout ini karena page.tsx sudah punya footer tersendiri agar tidak tumpang tindih */}
      </footer>

    </div>
  );
}