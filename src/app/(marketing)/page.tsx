"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BrainCircuit, Target, MessageSquareCode, LineChart, 
  Zap, Workflow, Lock, ChevronDown, ArrowRight, 
  Globe, ShieldCheck, CheckCircle2, XCircle, Bot,
  Instagram, Mail
} from "lucide-react";

import AOS from "aos";
import "aos/dist/aos.css";
import HyperGrid from "@/components/landings/HyperGrid";

// =========================================
// CUSTOM ICONS (ASLI & IDENTIK)
// =========================================
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const GmailIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.728L12 16.64l-6.545-4.912v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.943L12 8.568l8.073-5.054C21.691 2.279 24 3.434 24 5.457z"/>
  </svg>
);

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    AOS.init({ duration: 800, once: false, easing: "ease-out-cubic", offset: 100 });
  }, []);

  const faqs = [
    { q: "Apakah saya perlu kemampuan coding?", a: "Sama sekali tidak. Dashboard kami dirancang intuitif. Cukup masukkan informasi bisnis Anda, dan AI akan merangkai logikanya sendiri secara otomatis." },
    { q: "Apakah pelanggan tahu mereka sedang bicara dengan bot?", a: "Sebagian besar tidak akan sadar. Tumbuh AI menggunakan pola bahasa manusia, memahami konteks panjang, dan merespons seperti CS terbaik Anda." },
    { q: "Apakah AI ini bisa membalas dengan bahasa gaul atau daerah?", a: "Ya. Ditenagai oleh Model AI Pro, Tumbuh AI memahami bahasa gaul, singkatan khas Indonesia, hingga konteks keluhan yang rumit." },
    { q: "Bagaimana jika pelanggan marah atau minta admin manusia?", a: "Sistem dilengkapi 'Auto-Handoff'. Jika mendeteksi amarah atau permintaan CS manusia, AI otomatis berhenti dan mengoper chat kepada tim Anda." }
  ];

  const waLink = "https://wa.me/6281351958200?text=Halo%20Tim%20Tumbuh%20AI,%20saya%20tertarik%20untuk%20membangun%20Agen%20AI%20untuk%20bisnis%20saya.%20Bisa%20minta%20info%20lebih%20lanjut?";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] font-sans selection:bg-indigo-500/30 text-slate-200">
      
      <div className="fixed inset-0 z-0 pointer-events-none mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)">
         <HyperGrid />
      </div>

      {/* =========================================
          SECTION 1: THE HERO 
      ========================================= */}
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
        <div data-aos="fade-down" className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-[0.4em] mb-12 shadow-[0_0_30px_rgba(79,70,229,0.2)] backdrop-blur-md cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Sistem Autopilot Bisnis #1
        </div>
        
        <h1 data-aos="fade-up" data-aos-delay="100" className="text-[55px] sm:text-[80px] md:text-[110px] font-black text-white tracking-tighter mb-8 leading-[0.85] italic">
          Berhenti Balas Chat.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-cyan-400 animate-gradient-x">
            Mulai Hitung Uang.
          </span>
        </h1>
        
        <p data-aos="fade-up" data-aos-delay="200" className="max-w-3xl mx-auto text-slate-300/80 text-lg md:text-xl font-medium leading-relaxed mb-16 opacity-95">
          Tumbuh AI mengubah percakapan biasa menjadi mesin pencetak pendapatan. Jawab jutaan pesan masuk secara instan, otomatis kualifikasi leads, dan <strong>closing</strong> 24 jam non-stop tanpa menggaji karyawan tambahan.
        </p>

        <div data-aos="fade-up" data-aos-delay="300" className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24 w-full">
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <button className="group relative w-full sm:w-auto flex items-center justify-center gap-3 px-14 py-6 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all duration-500 active:scale-95">
              <span>Konsultasi Gratis</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </a>
          <Link href="/demo" className="w-full sm:w-auto">
            <button className="group w-full sm:w-auto px-14 py-6 bg-[#080b14]/50 text-white border border-white/10 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] backdrop-blur-md hover:border-indigo-500/50 hover:bg-white/10 transition-all active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-center gap-3">
              <Bot size={16} className="text-cyan-400" /> Coba Bot Demo
            </button>
          </Link>
        </div>

        <div className="absolute bottom-10 animate-bounce text-slate-500 flex flex-col items-center gap-2">
          <ChevronDown size={20} className="text-indigo-400/50" />
        </div>
      </section>

      {/* =========================================
          SECTION 2: INDUSTRY FOCUS
      ========================================= */}
      <section className="relative z-10 border-y border-white/5 bg-[#04060c]/80 backdrop-blur-sm py-10">
        <div data-aos="fade-up" className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">
            Dirancang Khusus Untuk Berbagai Sektor Industri
          </p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-50 hover:opacity-100 transition-all duration-700">
            <div className="flex items-center gap-3 font-bold text-lg text-slate-300 hover:text-white transition-colors">
              <ShieldCheck className="text-indigo-400 w-6 h-6" /> Klinik & Kesehatan
            </div>
            <div className="flex items-center gap-3 font-bold text-lg text-slate-300 hover:text-white transition-colors">
              <Target className="text-cyan-400 w-6 h-6" /> Retail & E-Commerce
            </div>
            <div className="flex items-center gap-3 font-bold text-lg text-slate-300 hover:text-white transition-colors">
              <Globe className="text-indigo-400 w-6 h-6" /> Layanan Jasa & Booking
            </div>
            <div className="flex items-center gap-3 font-bold text-lg text-slate-300 hover:text-white transition-colors">
              <Workflow className="text-cyan-400 w-6 h-6" /> Agen Properti
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          SECTION 3: THE OMNICHANNEL TRINITY
      ========================================= */}
      <section className="relative z-10 py-32 bg-[#04060c] border-b border-white/5">
         <div className="max-w-7xl mx-auto px-6">
            <div data-aos="fade-up" className="text-center mb-20">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-6">
                 Satu Otak, Tiga Jalur Utama
               </div>
               <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter mb-6 leading-tight">
                 Kuasai Platform Tersibuk.<br/>
                 <span className="text-slate-500">Tanpa Berpindah Aplikasi.</span>
               </h2>
               <p className="text-slate-400 font-medium max-w-2xl mx-auto text-lg">
                 Kami bukan sekadar chatbot web. Tumbuh AI adalah spesialis infrastruktur komunikasi yang menyuntikkan kecerdasan buatan langsung ke jantung bisnis Anda.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* WHATSAPP CARD */}
               <div data-aos="fade-up" data-aos-delay="0" className="relative group rounded-[2.5rem] bg-[#0a111a] border border-[#25D366]/30 p-10 overflow-hidden hover:shadow-[0_0_50px_rgba(37,211,102,0.15)] transition-all duration-500 transform hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#25D366]/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col h-full">
                     <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
                           <WhatsAppIcon className="text-[#25D366] w-9 h-9" />
                        </div>
                        <span className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-pulse"></span> Live & Stable
                        </span>
                     </div>
                     <h3 className="text-2xl font-black text-white tracking-tight mb-3">WhatsApp Expert</h3>
                     <p className="text-slate-400 font-medium leading-relaxed mb-8 flex-1">
                        Sulap WhatsApp bisnis Anda menjadi kasir otomatis. Mampu melayani ribuan pesan bersamaan, mencatat jadwal booking, hingga <strong>follow-up</strong> prospek.
                     </p>
                     <div className="text-[10px] font-bold text-[#25D366] uppercase tracking-widest border-t border-white/5 pt-6 mt-auto">
                        Official Meta API Integration
                     </div>
                  </div>
               </div>

               {/* INSTAGRAM CARD */}
               <div data-aos="fade-up" data-aos-delay="150" className="relative group rounded-[2.5rem] bg-[#0a111a] border border-white/10 p-10 overflow-hidden hover:border-[#E1306C]/50 hover:shadow-[0_0_50px_rgba(225,48,108,0.15)] transition-all duration-500 transform hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-tr from-[#F56040]/10 to-[#E1306C]/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col h-full">
                     <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-[#f9ce34]/10 via-[#ee2a7b]/10 to-[#6228d7]/10 border border-[#E1306C]/20 flex items-center justify-center">
                           <Instagram className="text-[#E1306C] w-8 h-8" />
                        </div>
                        <span className="bg-slate-800/50 text-slate-400 border border-slate-700 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                           <Lock size={10}/> Private Beta
                        </span>
                     </div>
                     <h3 className="text-2xl font-black text-white tracking-tight mb-3">Instagram DM Engine</h3>
                     <p className="text-slate-400 font-medium leading-relaxed mb-8 flex-1">
                        Jangan biarkan audiens dari Ads (Iklan) mendingin. AI kami membalas DM & balasan Story instan untuk mengubah followers menjadi pembeli.
                     </p>
                     <div className="text-[10px] font-bold text-[#E1306C] uppercase tracking-widest border-t border-white/5 pt-6 mt-auto">
                        Rolling Out Soon
                     </div>
                  </div>
               </div>

               {/* GMAIL CARD */}
               <div data-aos="fade-up" data-aos-delay="300" className="relative group rounded-[2.5rem] bg-[#0a111a] border border-white/10 p-10 overflow-hidden hover:border-[#EA4335]/50 hover:shadow-[0_0_50px_rgba(234,67,53,0.15)] transition-all duration-500 transform hover:-translate-y-2">
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#EA4335]/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col h-full">
                     <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 rounded-[1.2rem] bg-[#EA4335]/10 border border-[#EA4335]/20 flex items-center justify-center">
                           <GmailIcon className="text-[#EA4335] w-8 h-8" />
                        </div>
                        <span className="bg-slate-800/50 text-slate-400 border border-slate-700 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                           <Lock size={10}/> Dev Phase
                        </span>
                     </div>
                     <h3 className="text-2xl font-black text-white tracking-tight mb-3">Corporate Mail Parser</h3>
                     <p className="text-slate-400 font-medium leading-relaxed mb-8 flex-1">
                        Sempurna untuk ranah B2B. AI kami membaca email masuk, mengekstrak permintaan tender (RFQ), dan menyusun draft penawaran otomatis.
                     </p>
                     <div className="text-[10px] font-bold text-[#EA4335] uppercase tracking-widest border-t border-white/5 pt-6 mt-auto">
                        Google Workspace Sync
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </section>

      {/* =========================================
          SECTION 4: THE AGITATION (CHAT COMPARISON)
      ========================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        
        <h2 data-aos="zoom-in" className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-8 leading-tight">
          Masih Memaksa Pelanggan <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Mengetik Angka 1, 2, 3?</span>
        </h2>
        <p data-aos="fade-up" className="text-slate-300/80 text-lg md:text-xl font-medium leading-relaxed max-w-3xl mx-auto mb-20">
          Tinggalkan chatbot primitif yang membuat pelanggan kabur. Tumbuh AI merespons dengan empati, bernegosiasi secara dinamis, dan tahu cara melakukan Hard Selling.
        </p>

        <div className="flex flex-col lg:flex-row justify-center gap-8 max-w-5xl mx-auto text-left">
          
          {/* BAD BOT */}
          <div data-aos="fade-right" className="flex-1 bg-[#0d0709] border border-red-500/20 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col shadow-2xl">
             <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
               <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 shrink-0">
                  <XCircle size={24} />
               </div>
               <div>
                 <h3 className="font-black text-xl text-red-400">Bot Tradisional (Lama)</h3>
                 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Kaku & Menggagalkan Penjualan</p>
               </div>
             </div>

             <div className="space-y-5 font-medium text-[13px] flex-1">
                <div className="bg-[#1a232c] border border-slate-700/50 p-4 rounded-[1.5rem] rounded-tr-sm text-slate-300 w-[85%] self-end ml-auto shadow-sm">
                  "Min, hp yg warna item sisa ga? klo kirim ke jakarta brp hari?"
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-[1.5rem] rounded-tl-sm text-red-200 w-[90%] shadow-sm">
                  Maaf, format pesan tidak dikenali. Silakan ketik angka untuk menu: <br/><br/>
                  1. Cek Stok Produk<br/>
                  2. Cek Resi Pengiriman<br/>
                  3. Berbicara dengan CS
                </div>
                <div className="bg-[#1a232c] border border-slate-700/50 p-4 rounded-[1.5rem] rounded-tr-sm text-slate-300 w-[85%] self-end ml-auto shadow-sm">
                  "Ya elah, mending beli di toko sebelah dah yg fast respon."
                </div>
             </div>
          </div>

          {/* GOOD BOT */}
          <div data-aos="fade-left" data-aos-delay="100" className="flex-1 bg-gradient-to-b from-indigo-900/20 to-[#080b14] border-[3px] border-indigo-500/40 rounded-[2.5rem] p-8 relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(99,102,241,0.2)] transform lg:-translate-y-4 flex flex-col">
             <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-cyan-500/10 rounded-full blur-[70px] pointer-events-none"></div>
             
             <div className="flex items-center gap-4 mb-10 border-b border-indigo-500/20 pb-6 relative z-10">
               <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                  <BrainCircuit size={24} />
               </div>
               <div>
                 <h3 className="font-black text-xl text-white italic tracking-tight">Tumbuh AI</h3>
                 <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mt-1">Cerdas, Natural & Closing</p>
               </div>
             </div>

             <div className="space-y-5 font-medium text-[13px] relative z-10 flex-1">
                <div className="bg-[#1a232c] border border-slate-700/50 p-4 rounded-[1.5rem] rounded-tr-sm text-slate-300 w-[85%] self-end ml-auto shadow-sm">
                  "Min, hp yg warna item sisa ga? klo kirim ke jakarta brp hari?"
                </div>
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 rounded-[1.5rem] rounded-tl-sm text-white w-[92%] shadow-lg leading-relaxed border border-indigo-500">
                  Halo Kak! Untuk HP warna hitam <strong>sisa 2 unit lagi</strong> nih di gudang kita. Jangan sampai kehabisan ya! 🔥<br/><br/>
                  Pengiriman ke Jakarta biasanya cepat kok, cuma 1-2 hari aja pakai kurir reguler.<br/><br/>
                  Gimana Kak, mau saya <strong>keep</strong> barangnya sekarang? Boleh minta nama penerimanya sekalian? 👇
                </div>
             </div>
          </div>

        </div>
      </section>

      {/* =========================================
          SECTION 5: THE INFRASTRUCTURE (BENTO BOX)
      ========================================= */}
      <section className="max-w-7xl mx-auto px-6 py-20 relative z-10 border-t border-white/5">
        <div data-aos="fade-up" className="text-center mb-24 pt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
            Under The Hood
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-6">
            Infrastruktur Enterprise.<br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Teknologi Anti-Halusinasi.</span>
          </h2>
          <p className="text-slate-300/80 font-medium max-w-2xl mx-auto text-lg">
            Kami tidak sekadar memasang prompt pada model AI. Kami membangun knowledge graph khusus untuk bisnis Anda agar AI bekerja 100% sesuai fakta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
          
          {/* BENTO 1: RAG */}
          <div data-aos="fade-up" data-aos-delay="0" className="md:col-span-2 relative group rounded-[2.5rem] bg-[#080b14] border border-white/5 p-10 overflow-hidden transition-all duration-500 hover:border-indigo-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.2)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 group-hover:translate-x-10 group-hover:-translate-y-10 transition-all duration-700"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-14 h-14 rounded-[1.2rem] bg-gradient-to-br from-indigo-500/20 to-transparent border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-500">
                <BrainCircuit size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 italic tracking-tight mb-3">RAG Knowledge Engine</h3>
                <p className="text-slate-300/80 font-medium leading-relaxed max-w-md">
                  Menggunakan arsitektur <strong>Retrieval-Augmented Generation</strong>. AI tidak akan pernah "mengarang harga". Ia menarik data langsung dari SOP PDF dan file bisnis Anda.
                </p>
              </div>
            </div>
          </div>

          {/* BENTO 2: ZERO TOUCH */}
          <div data-aos="fade-up" data-aos-delay="150" className="relative group rounded-[2.5rem] bg-[#080b14] border border-white/5 p-10 overflow-hidden transition-all duration-500 hover:border-cyan-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.2)]">
            <div className="relative z-10 h-full flex flex-col justify-between">
               <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-cyan-500/20 to-transparent border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-all duration-500">
                 <Target size={24} strokeWidth={1.5} />
               </div>
               <div>
                 <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 italic tracking-tight mb-2">Zero-Touch Capture</h3>
                 <p className="text-[13px] text-slate-300/80 font-medium leading-relaxed">Ekstraksi otomatis Nama, Kontak, dan Niat Pembelian tanpa form ribet.</p>
               </div>
            </div>
          </div>

          {/* BENTO 3: NATIVE API */}
          <div data-aos="fade-up" data-aos-delay="0" className="relative group rounded-[2.5rem] bg-[#080b14] border border-white/5 p-10 overflow-hidden transition-all duration-500 hover:border-indigo-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.2)]">
             <div className="relative z-10 h-full flex flex-col justify-between">
               <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-indigo-500/20 to-transparent border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-all duration-500">
                 <MessageSquareCode size={24} strokeWidth={1.5} />
               </div>
               <div>
                 <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 italic tracking-tight mb-2">Native Webhook</h3>
                 <p className="text-[13px] text-slate-300/80 font-medium leading-relaxed">Tanpa aplikasi pihak ketiga. Terhubung langsung secara resmi dengan API WhatsApp, Instagram, dan Email.</p>
               </div>
            </div>
          </div>

          {/* BENTO 4: LIVE ANALYTICS */}
          <div data-aos="fade-up" data-aos-delay="150" className="md:col-span-2 relative group rounded-[2.5rem] bg-[#080b14] border border-white/5 p-10 overflow-hidden transition-all duration-500 hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <div className="relative z-10 h-full flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <div className="w-14 h-14 rounded-[1.2rem] bg-gradient-to-br from-white/10 to-transparent border border-white/20 flex items-center justify-center text-slate-200 mb-6 group-hover:rotate-12 transition-transform duration-500">
                  <LineChart size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 italic tracking-tight mb-3">Live CRM Analytics</h3>
                <p className="text-slate-300/80 font-medium leading-relaxed">
                  Semua data prospek (leads) yang didapat AI akan masuk ke Dashboard CRM interaktif secara Real-Time.
                </p>
              </div>
              <div className="hidden md:flex flex-1 items-center justify-center group-hover:scale-105 transition-transform duration-700">
                <div className="w-full max-w-[200px] aspect-square rounded-full border border-dashed border-white/20 flex items-center justify-center relative animate-[spin_30s_linear_infinite]">
                  <div className="w-[70%] h-[70%] rounded-full border border-indigo-500/30 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-transparent backdrop-blur-sm">
                     <div className="w-[40%] h-[40%] bg-cyan-400 rounded-full blur-xl animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================
          SECTION 6: SCALE & METRICS 
      ========================================= */}
      <section className="relative z-10 py-32 bg-[#04060c] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
          <div data-aos="zoom-in" data-aos-delay="0" className="flex flex-col items-center pt-8 md:pt-0">
             <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter mb-4">&lt; 5s</div>
             <div className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Response Latency</div>
          </div>
          <div data-aos="zoom-in" data-aos-delay="150" className="flex flex-col items-center pt-12 md:pt-0">
             <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter mb-4">99.9%</div>
             <div className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em]">Server Uptime</div>
          </div>
          <div data-aos="zoom-in" data-aos-delay="300" className="flex flex-col items-center pt-12 md:pt-0">
             <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter mb-4">24/7</div>
             <div className="text-xs font-black text-white/70 uppercase tracking-[0.2em]">Sales Autopilot</div>
          </div>
        </div>
      </section>

      {/* =========================================
          SECTION 7: THE AUTONOMOUS PIPELINE
      ========================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div className="flex flex-col lg:flex-row gap-20 items-start">
          
          <div data-aos="fade-right" className="lg:w-1/3 lg:sticky lg:top-40 z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              Proses Komputasi
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter mb-6 leading-tight">
              Eksekusi <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Kilat.</span>
            </h2>
            <p className="text-slate-300/80 font-medium leading-relaxed mb-8">
              Meskipun terlihat seperti percakapan santai, di balik layar, setiap pesan melewati filter ganda untuk memastikan jawaban akurat dan berorientasi pada penjualan.
            </p>
          </div>

          <div className="lg:w-2/3 relative">
            <div className="absolute left-[27px] top-10 bottom-10 w-[2px] bg-gradient-to-b from-indigo-500 via-cyan-500 to-transparent opacity-30"></div>

            <div className="space-y-12">
              {[
                { step: "01", title: "Ingest & Sentiment Scan", desc: "Pesan pelanggan masuk. AI menganalisis apakah pelanggan ini mau membeli, marah, atau hanya sekadar bertanya.", icon: <Zap size={20}/>, color: "text-indigo-400", bg: "bg-indigo-500/20" },
                { step: "02", title: "Knowledge Retrieval", desc: "Sistem membaca file SOP dan Katalog Anda untuk menemukan informasi paling relevan dengan kebutuhan klien.", icon: <Workflow size={20}/>, color: "text-cyan-400", bg: "bg-cyan-500/20" },
                { step: "03", title: "Persuasive Generation", desc: "Tumbuh AI merangkai jawaban berparagraf yang ramah, jelas, dan diakhiri dengan pancingan untuk mempercepat transaksi.", icon: <BrainCircuit size={20}/>, color: "text-white", bg: "bg-white/20" },
                { step: "04", title: "Background Extraction", desc: "Diam-diam mengekstrak data penting ke dashboard Anda tanpa mengganggu alur percakapan.", icon: <Lock size={20}/>, color: "text-indigo-400", bg: "bg-indigo-500/20" }
              ].map((item, i) => (
                <div data-aos="fade-up" data-aos-offset="150" key={i} className="group relative flex gap-8 items-start hover:-translate-y-2 transition-transform duration-500">
                  <div className={`relative z-10 w-14 h-14 shrink-0 rounded-full bg-[#080b14] border-2 border-slate-800 flex items-center justify-center group-hover:border-white/50 transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]`}>
                    <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center ${item.color} shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]`}>
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1 rounded-[2rem] bg-[#080b14]/80 border border-white/5 p-8 backdrop-blur-sm group-hover:bg-[#0b0f1a] group-hover:border-white/10 transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Phase {item.step}</div>
                    <h3 className="text-xl font-black text-white italic tracking-tight mb-3">{item.title}</h3>
                    <p className="text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          SECTION 8: FAQ 
      ========================================= */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-32">
        <div data-aos="fade-up" className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter mb-6">Pertanyaan Sering Ditanya</h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} data-aos="fade-up" data-aos-delay={i * 100}
              className={`border border-white/10 rounded-[1.5rem] bg-[#080b14]/50 backdrop-blur-sm overflow-hidden transition-all duration-300 ${openFaq === i ? 'border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.1)]' : 'hover:border-white/20 hover:bg-[#080b14]'}`}
            >
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex justify-between items-center p-6 text-left">
                <span className="font-bold text-slate-200 text-lg pr-8">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-indigo-400 transition-transform duration-300 shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-60 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="w-full h-px bg-white/5 mb-4"></div>
                <p className="text-slate-400 font-medium leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          SECTION 9: FINAL CTA
      ========================================= */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-32 my-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent rounded-[4rem] border border-white/5 backdrop-blur-md -z-10 transform scale-95 md:scale-100 pointer-events-none"></div>
        
        <h2 data-aos="fade-up" className="text-5xl md:text-7xl font-black text-white italic tracking-tighter mb-8 leading-[0.9]">
          Pesaing Anda Sudah <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Memakai AI.</span> Anda Kapan?
        </h2>
        
        <p data-aos="fade-up" data-aos-delay="100" className="text-slate-300/80 text-lg font-medium mb-12 max-w-2xl mx-auto">
          Berhenti membuang uang untuk menggaji Admin CS yang tidur di malam hari. Jadikan Tumbuh AI mesin pencetak cuan Anda yang tak kenal lelah hari ini juga.
        </p>

        <div data-aos="zoom-in" data-aos-delay="200" className="flex flex-col sm:flex-row justify-center items-center gap-6">
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <button className="group relative px-14 py-6 bg-white text-black rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all duration-300 active:scale-95 hover:-translate-y-2 flex items-center gap-3">
              Hubungi Tim Sales 
              <WhatsAppIcon className="w-5 h-5 text-[#25D366] group-hover:scale-110 transition-transform" />
            </button>
          </a>
          <Link href="/pricing" className="text-sm font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-widest border-b border-transparent hover:border-white pb-1">
            Lihat Harga Paket
          </Link>
        </div>
      </section>
    </div>
  );
}