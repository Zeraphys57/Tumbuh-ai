"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, MessageCircle } from "lucide-react";
// Import AOS untuk animasi masuk
import AOS from "aos";
import "aos/dist/aos.css";
// Import background premium
import HyperGrid from "@/components/landings/HyperGrid";

export default function DemoPage() {
  const [showNotification, setShowNotification] = useState(false);

  // Inisialisasi AOS & Trigger Notifikasi Pintar
  useEffect(() => {
    AOS.init({ duration: 800, once: true, easing: "ease-out-cubic" });
    
    // Munculkan notifikasi di detik ke-2
    const showTimer = setTimeout(() => {
      setShowNotification(true);
    }, 2000);

    // Hilangkan otomatis di detik ke-8 (Tampil selama 6 detik)
    const hideTimer = setTimeout(() => {
      setShowNotification(false);
    }, 8000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // --- NOMOR WA BOS ---
  const waLink = "https://wa.me/6281351958200?text=Halo%20Tim%20Tumbuh%20AI,%20saya%20sudah%20mencoba%20Live%20Demo-nya%20dan%20tertarik.%20Boleh%20minta%20katalog%20harganya?";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] font-sans selection:bg-indigo-500/30 text-slate-200 pb-20">
      
      {/* 1. BACKGROUND HYPERGRID */}
      <div className="fixed inset-0 z-0 pointer-events-none mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)">
         <HyperGrid />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-10 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-16 relative z-10">
        
        {/* =========================================
            SISI KIRI: TYPOGRAPHY & CALL TO ACTION
        ========================================= */}
        <div className="flex-1 text-left pt-10 lg:pt-0">
          
          <div data-aos="fade-down" className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-[0_0_20px_rgba(99,102,241,0.15)] backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Interactive Simulation
          </div>
          
          <h1 data-aos="fade-up" data-aos-delay="100" className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 leading-[0.9] italic">
            Test The <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-cyan-400 animate-gradient-x">Intelligence.</span>
          </h1>
          
          <p data-aos="fade-up" data-aos-delay="200" className="text-slate-300/80 text-lg md:text-xl font-medium leading-relaxed mb-10 max-w-lg">
            Ketik apapun ke layar HP di sebelah kanan. Tanyakan harga, coba komplain, atau minta panduan reservasi. Rasakan bagaimana Agen AI membalas dalam hitungan detik.
          </p>
          
          {/* FITUR LIST DENGAN GLASS CARDS */}
          <div className="space-y-4 mb-12">
            {[
              { title: "Konteks Panjang", desc: "Mampu mengingat obrolan Anda di atas tanpa diulang." },
              { title: "Anti-Halusinasi", desc: "Otomatis menolak menjawab hal di luar bisnis Tumbuh AI." },
              { title: "Protokol Closing", desc: "Secara halus akan memancing Anda meninggalkan Nama & Nomor WA." },
              { title: "Teknologi Terbaru", desc: "Menggunakan teknologi terbaru sebagai otak utama AI." }
            ].map((item, idx) => (
              <div 
                key={idx} 
                data-aos="fade-right" 
                data-aos-delay={300 + (idx * 100)} 
                className="group relative rounded-2xl bg-[#080b14]/50 border border-white/5 p-4 overflow-hidden transition-all duration-500 hover:border-indigo-500/30 hover:bg-[#080b14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_20px_-5px_rgba(79,70,229,0.2)]"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="pt-1">
                    <h3 className="text-sm font-black text-slate-200 tracking-tight">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TOMBOL CALL TO ACTION
          <div data-aos="fade-up" data-aos-delay="600" className="flex flex-col sm:flex-row items-center gap-4">
             <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
               <button className="group w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-500 active:scale-95">
                 <MessageCircle size={16} /> Tanya Harga Asli
               </button>
             </a>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 sm:mt-0">
               *100% Bebas Kewajiban
             </p>
          </div> */}

        </div>

        {/* =========================================
            SISI KANAN: MOCKUP HP & IFRAME
        ========================================= */}
        <div 
          data-aos="zoom-in" 
          data-aos-delay="400" 
          className="flex-1 w-full flex justify-center lg:justify-end relative group perspective-1000 z-20 mt-12 lg:mt-0"
          onMouseEnter={() => setShowNotification(false)} // HILANG JIKA MOUSE MENDEKAT!
        >
          
          {/* Ambient Glow di belakang HP */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 rounded-full blur-[100px] group-hover:blur-[140px] group-hover:opacity-70 transition duration-1000 opacity-40"></div>
          
          {/* MOCKUP HP */}
          <div className="relative w-[320px] h-[650px] bg-[#080b14] rounded-[3.2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden ring-1 ring-white/5 transform transition-all duration-700 group-hover:-translate-y-4 group-hover:shadow-[0_40px_80px_rgba(79,70,229,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)]">
            
            {/* EFEK NOTIFIKASI PUSH MASUK (INTERAKTIF & AUTO-HIDE) */}
            <div 
              onClick={() => setShowNotification(false)} // HILANG JIKA DIKLIK
              className={`absolute top-8 left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200/50 p-3.5 rounded-[1.2rem] z-40 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all duration-700 ease-out transform cursor-pointer hover:-translate-y-2 ${showNotification ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}
            >
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-md">
                    <Bot size={18} className="text-white" />
                 </div>
                 <div className="flex-1">
                    <h4 className="text-slate-900 text-[13px] font-black flex justify-between items-center tracking-tight">
                       Tumbuh Agent 
                       <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Now</span>
                    </h4>
                    <p className="text-slate-600 text-[11px] font-medium truncate w-44 mt-0.5">"Halo! Ada yang bisa dibantu?"</p>
                 </div>
               </div>
            </div>
            
            {/* Bezel Dalam */}
            <div className="absolute inset-[8px] bg-black rounded-[2.7rem] overflow-hidden border border-white/10">
              
              {/* Pantulan Kaca HP (Glass Glare) */}
              <div className="absolute top-[-20%] left-[-50%] w-[200%] h-[50%] bg-gradient-to-b from-white/[0.04] to-transparent -rotate-45 pointer-events-none z-30 transform group-hover:translate-y-10 transition-transform duration-1000"></div>

              {/* Dynamic Island / Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-40 flex items-center justify-between px-3 border border-white/5">
                 <div className="w-2 h-2 rounded-full bg-[#1a1a1a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"></div>
                 <div className="w-2 h-2 rounded-full bg-indigo-500/50 shadow-[0_0_8px_#6366f1] animate-pulse"></div>
              </div>
              
              {/* IFRAME CHAT KELAS DUNIA */}
              <iframe 
                src="/preview-demo" 
                className="w-full h-full border-none bg-slate-50 relative z-20"
                title="Tumbuh AI Chat Demo"
              />
            </div>

            {/* Tombol Samping (Detail Visual HP) */}
            <div className="absolute left-[-1px] top-[120px] w-[2px] h-[26px] bg-white/20 rounded-l-md shadow-[0_0_5px_rgba(255,255,255,0.3)]"></div>
            <div className="absolute left-[-1px] top-[160px] w-[2px] h-[50px] bg-white/20 rounded-l-md shadow-[0_0_5px_rgba(255,255,255,0.3)]"></div>
            <div className="absolute left-[-1px] top-[220px] w-[2px] h-[50px] bg-white/20 rounded-l-md shadow-[0_0_5px_rgba(255,255,255,0.3)]"></div>
            <div className="absolute right-[-1px] top-[180px] w-[2px] h-[70px] bg-white/20 rounded-r-md shadow-[0_0_5px_rgba(255,255,255,0.3)]"></div>
          </div>
        </div>

      </div>
    </div>
  );
}