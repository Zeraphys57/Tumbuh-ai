"use client"; 

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Wajib di-import untuk logo
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUp, Twitter, Instagram, Linkedin, Mail } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State untuk sensor tombol "Back to Top"
  const [showScrollTop, setShowScrollTop] = useState(false);

  const navItems = [
    { name: "Features", href: "/" },
    { name: "Pricing", href: "/pricing" },
    { name: "Live Demo", href: "/demo" },
  ];

  const waLink = "https://wa.me/6281351958200?text=Halo%20Tim%20Tumbuh%20AI,%20saya%20tertarik%20untuk%20membangun%20Agen%20AI%20untuk%20bisnis%20saya.%20Bisa%20minta%20info%20lebih%20lanjut?";

  // =========================================
  // SENSOR SCROLL DINAMIS (PREMIUM UX)
  // =========================================
  useEffect(() => {
    const handleScroll = () => {
      // Tombol muncul jika user sudah scroll lebih dari 400px ke bawah
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 relative scroll-smooth">
      
      {/* =========================================
          NAVBAR: FULL-WIDTH PREMIUM GLASS
      ========================================= */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-[#020617]/50 backdrop-blur-2xl border-b border-white/5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* LOGO ELEGAN DENGAN GAMBAR */}
          <Link href="/" className="flex items-center gap-3 group z-50" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="relative w-10 h-10 transition-all duration-500 group-hover:scale-110 drop-shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:drop-shadow-[0_0_25px_rgba(34,211,238,0.6)] rounded-full overflow-hidden">
              <Image 
                src="/icon.png" // Menggunakan logo beresolusi tinggi Bos
                alt="Tumbuh AI Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <span className="text-xl font-black tracking-tighter italic text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-cyan-400 transition-all duration-300">
              Tumbuh.ai
            </span>
          </Link>
          
          {/* DESKTOP MENU (HIDDEN ON MOBILE) */}
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
                  {isActive && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-md pointer-events-none -z-10"></div>}
                  {isActive && <div className="absolute inset-0 bg-white/[0.05] pointer-events-none -z-10"></div>}
                  <span className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isActive ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse w-1.5 opacity-100" : "w-0 opacity-0"}`}></span>
                  <span className="relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* CTA BUTTONS & HAMBURGER */}
          <div className="flex items-center gap-4 md:gap-6 z-50">
            <Link href="/login" className="hidden sm:block text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">
              Login
            </Link>
            
            <a 
              href={waLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group relative px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] overflow-hidden hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-105 transition-all duration-300 active:scale-95 border border-[#128C7E]/50 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 group-hover:scale-110 transition-transform">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="relative z-10 hidden sm:inline">Konsultasi</span>
              <span className="relative z-10 sm:hidden">Chat</span>
            </a>

            <button 
              className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU OVERLAY */}
        <div className={`md:hidden absolute top-20 left-0 w-full bg-[#020617]/95 backdrop-blur-3xl border-b border-white/5 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? "max-h-[400px] opacity-100 py-6" : "max-h-0 opacity-0 py-0"}`}>
          <div className="flex flex-col gap-2 px-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`relative flex items-center justify-between px-5 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isActive ? "text-white bg-white/5 border border-white/10" : "text-slate-400 border border-transparent hover:text-white hover:bg-white/5"}`}
                >
                  <span>{item.name}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* =========================================
          MAIN CONTENT WRAPPER
      ========================================= */}
      <main className="flex-1 w-full flex flex-col relative z-10 pt-20">
        {children}
      </main>

      {/* =========================================
          GLOBAL FOOTER (MINIMAL & MAHAL)
          Sekarang muncul di semua halaman marketing
      ========================================= */}
      <footer className="relative z-20 border-t border-white/5 bg-[#020408] pt-16 md:pt-24 pb-28 md:pb-12 overflow-hidden mt-auto">
        
        {/* Efek Cahaya Halus di Latar Belakang Footer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[150px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6">
          
          {/* GRID ATAS: Info & Link */}
          {/* PERUBAHAN: Di HP jadi 2 Kolom (grid-cols-2), di Tablet/Desktop menyesuaikan */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-y-10 gap-x-6 md:gap-8 mb-12 md:mb-16">
            
            {/* Kolom 1: Brand & Deskripsi (Full width di HP) */}
            <div className="col-span-2 md:col-span-12 lg:col-span-5 flex flex-col gap-5">
              <div className="flex items-center gap-3 group w-max">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden drop-shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_25px_rgba(34,211,238,0.6)]">
                  <Image 
                    src="/icon.png" 
                    alt="Tumbuh AI Footer Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-2xl font-black italic tracking-tighter text-white">Tumbuh.ai</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                Platform Automasi Chatbot AI Cerdas untuk UMKM & Enterprise. Berhenti membalas chat manual, mulai hitung profit Anda secara otomatis selama 24/7.
              </p>
              
              {/* Social Media Icons */}
              <div className="flex items-center gap-4 mt-1">
                {[
                  // { icon: Instagram, href: "#" },
                  { icon: Mail, href: "mailto:jacquellinobryan@gmail.com" },
                ].map((social, idx) => (
                  <a key={idx} href={social.href} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-white/10 hover:border-cyan-400/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300 group">
                    <social.icon size={18} className="group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            </div>

            {/* Kolom 2: Product Links (Makan 1 kolom / Setengah layar di HP) */}
            <div className="col-span-1 md:col-span-4 lg:col-span-2">
              <h4 className="text-white font-bold tracking-wider text-xs uppercase mb-5 md:mb-6">Product</h4>
              <ul className="flex flex-col gap-3 md:gap-4">
                {[
                  { name: "Features", href: "#" },
                  { name: "Pricing", href: "/pricing" },
                  { name: "Live Demo", href: "/demo" }
                ].map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-slate-400 text-sm hover:text-cyan-400 transition-colors font-medium relative group w-max">
                      {item.name}
                      <span className="absolute -bottom-1 left-0 w-0 h-px bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 3: Company Links (Makan 1 kolom / Setengah layar di HP) */}
            <div className="col-span-1 md:col-span-4 lg:col-span-2">
              <h4 className="text-white font-bold tracking-wider text-xs uppercase mb-5 md:mb-6">Company</h4>
              <ul className="flex flex-col gap-3 md:gap-4">
                {[
                  { name: "About Us", href: "/about" },
                  { name: "Contact", href: waLink },
                  // { name: "Partners", href: "#" } // Partners tetap di-comment dulu kalau belum ada
                ].map((item) => (
                  <li key={item.name}>
                    <Link 
                      href={item.href} 
                      target={item.href.startsWith("http") ? "_blank" : "_self"}
                      className="text-slate-400 text-sm hover:text-indigo-400 transition-colors font-medium relative group w-max"
                    >
                      {item.name}
                      <span className="absolute -bottom-1 left-0 w-0 h-px bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 4: Legal Links (Full width lagi di HP biar rapi) */}
            <div className="col-span-2 md:col-span-4 lg:col-span-3 mt-2 md:mt-0">
              <h4 className="text-white font-bold tracking-wider text-xs uppercase mb-5 md:mb-6">Legal & Security</h4>
              <ul className="flex flex-col gap-3 md:gap-4">
                {[
                  { name: "Terms of Service", href: "/terms" },
                  { name: "Privacy Policy", href: "/privacy" },
                  { name: "Refund Policy", href: "/refund" },
                  { name: "Data Security", href: "/security" }
                ].map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-slate-400 text-sm hover:text-white transition-colors font-medium flex items-center gap-2 group w-max">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-cyan-400 transition-colors"></span>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* BARIS BAWAH: Copyright & Nama Legal Bos */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm font-medium text-center md:text-left">
              © {new Date().getFullYear()} Tumbuh Intelligence Core.
            </p>
            
            <p className="text-slate-500 text-sm font-medium text-center md:text-right flex items-center gap-2">
              Operated legally by 
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold tracking-wide shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                Bryan Jacquellino
              </span>
            </p>
          </div>

        </div>
      </footer>

      {/* =========================================
          UPGRADED BACK TO TOP BUTTON (SULTAN STYLE)
      ========================================= */}
      <div 
        className={`fixed bottom-8 right-8 z-50 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          showScrollTop 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-10 scale-50 pointer-events-none"
        }`}
      >
        <button 
          onClick={scrollToTop}
          className="group w-14 h-14 rounded-full bg-slate-950/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-105 active:scale-95"
          aria-label="Back to top"
        >
          {/* Efek Cincin Menyala saat Hover */}
          <div className="absolute inset-0 rounded-full border border-cyan-500 opacity-0 group-hover:opacity-100 group-hover:animate-pulse -z-10 transition-opacity"></div>
          
          {/* Ikon Panah dengan Animasi Putar Sedikit */}
          <ArrowUp size={24} className="group-hover:-translate-y-1 group-hover:rotate-[-10deg] transition-transform duration-300 ease-out" />
        </button>
      </div>

    </div>
  );
}