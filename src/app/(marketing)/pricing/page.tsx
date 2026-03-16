"use client";
import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
// Import AOS untuk animasi masuk yang elegan
import AOS from "aos";
import "aos/dist/aos.css";
// Import background premium
import HyperGrid from "@/components/landings/HyperGrid";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 800, once: true, easing: "ease-out-cubic" });
  }, []);

  // --- NOMOR WA BOS (Tetap tersembunyi di balik layar) ---
  const waNumber = "6281351958200";

  // Data plans di-update dengan Copywriting Tombol yang sangat Elegan & Techy
  const plans = [
    {
      name: "Starter Core",
      priceMonthly: "499k",
      priceAnnual: "399k", 
      isCustom: false,
      desc: "Perfect for emerging businesses seeking autonomous automation.",
      features: ["Auto-Reply WhatsApp", "AI Knowledge Training", "Dashboard Leads", "Standard API Node", "Standard Token Limit"],
      button: "Initialize Agent", // Elegan
      waMessage: "Halo Tim Tumbuh AI, saya tertarik untuk mendeploy agen AI dari paket *Starter Core*. Boleh minta instruksi selanjutnya?",
      premium: false
    },
    {
      name: "Business Intelligence",
      priceMonthly: "849k",
      priceAnnual: "679k",
      isCustom: false,
      desc: "Elite logic for scaling enterprises demanding predictive insights.",
      features: ["All Starter Features", "AI Conversation Insights", "Pro AI Analyst Addon", "Prioritized Server Node", "Increased Token Limit"],
      button: "Deploy Premium Engine", // Sangat Elegan & Powerfull
      waMessage: "Halo Tim Tumbuh AI, saya tertarik untuk menggunakan *Business Intelligence (Premium Engine)* untuk bisnis saya. Boleh minta detail setup-nya?",
      premium: true
    },
    {
      name: "Enterprise",
      priceMonthly: "Custom",
      priceAnnual: "Custom",
      isCustom: true, 
      desc: "Tailored AI infrastructure for high-volume corporate needs.",
      features: ["Unlimited WhatsApp Nodes", "Custom Model Fine-Tuning", "On-Premise Integration", "24/7 Priority SLA Support", "Custom Token Limit"],
      button: "Request Architecture", // B2B Corporate Style
      waMessage: "Halo Tim Tumbuh AI, perusahaan saya membutuhkan solusi infrastruktur *Enterprise* kustom dengan volume tinggi. Bisa jadwalkan sesi konsultasi?",
      premium: false 
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] pt-32 pb-28 font-sans">
      
      {/* BACKGROUND HYPERGRID */}
      <div className="fixed inset-0 z-0 pointer-events-none mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)">
         <HyperGrid />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* HEADER & TOGGLE */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div data-aos="fade-down" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            Scalable Pricing
          </div>
          <h1 data-aos="fade-up" data-aos-delay="100" className="text-5xl md:text-7xl font-black text-white italic tracking-tighter leading-[0.9] mb-8">
            Predictable <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 animate-gradient-x">Investments.</span>
          </h1>
          <p data-aos="fade-up" data-aos-delay="200" className="text-slate-300/80 text-lg font-medium leading-relaxed max-w-xl mx-auto mb-10">
            Scalable pricing designed for impactful growth. Select your autonomous intelligence tier.
          </p>

          {/* SAAS BILLING TOGGLE */}
          <div data-aos="zoom-in" data-aos-delay="300" className="flex items-center justify-center gap-4">
            <span className={`text-sm font-bold transition-colors duration-300 ${!isAnnual ? "text-white" : "text-slate-500"}`}>Monthly</span>
            
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-16 h-8 rounded-full bg-white/10 border border-white/20 p-1 transition-all duration-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:outline-none"
            >
              <div className={`w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-500 ${isAnnual ? "translate-x-8" : "translate-x-0"}`}></div>
            </button>
            
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold transition-colors duration-300 ${isAnnual ? "text-white" : "text-slate-500"}`}>Annually</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-black uppercase tracking-widest animate-pulse">
                Save 20%
              </span>
            </div>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto items-center">
          {plans.map((plan, index) => (
            <div 
              key={plan.name} 
              data-aos="fade-up" 
              data-aos-delay={index * 150}
              className={`relative group ${plan.premium ? 'z-20 lg:scale-105' : 'z-10'}`}
            >
              {/* EFEK GLOW LUAR UNTUK PREMIUM */}
              {plan.premium && (
                <div className="absolute -inset-[3px] bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-[3.2rem] blur-md opacity-50 group-hover:opacity-100 transition duration-1000"></div>
              )}
              {plan.premium && (
                <div className="absolute -inset-[2px] bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-[3rem] opacity-80"></div>
              )}

              {/* BODY KARTU DENGAN GLASSMORPHISM */}
              <div className={`relative h-full flex flex-col rounded-[2.8rem] p-10 lg:p-12 overflow-hidden transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] ${
                plan.premium 
                ? 'bg-[#080b14] hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.2)]' 
                : 'bg-[#080b14] border border-white/5 hover:border-indigo-500/30 hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.2)]'
              }`}>
                
                {/* SPOTLIGHT HOVER */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${
                  plan.premium 
                  ? 'bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.15)_0%,transparent_70%)]' 
                  : 'bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15)_0%,transparent_70%)]'
                }`}></div>

                {/* AMBIENT GLOW BERGERAK */}
                <div className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[80px] transition-all duration-700 group-hover:translate-x-10 group-hover:-translate-y-10 ${
                  plan.premium 
                  ? 'bg-cyan-500/10 group-hover:bg-cyan-500/20' 
                  : 'bg-indigo-500/10 group-hover:bg-indigo-500/20'
                }`}></div>

                {/* KONTEN UTAMA */}
                <div className="relative z-10 flex-1 flex flex-col">
                  {/* Bagian Atas */}
                  <div className="mb-8">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tight">{plan.name}</h3>
                      {plan.premium && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-cyan-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                          <span className="text-cyan-300 text-[9px] font-black uppercase tracking-widest">
                            Top Pick
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-end gap-2 mb-4">
                      {!plan.isCustom && <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 transition-colors">IDR</span>}
                      
                      {/* Harga Animasi */}
                      <span key={isAnnual ? 'annual' : 'monthly'} className={`font-black leading-none text-white tracking-tighter animate-fade-in ${plan.isCustom ? 'text-5xl' : 'text-7xl'}`}>
                        {plan.isCustom ? plan.priceMonthly : (isAnnual ? plan.priceAnnual : plan.priceMonthly)}
                      </span>
                      
                      {!plan.isCustom && <span className="text-sm font-bold text-slate-500 mb-2">/mo</span>}
                    </div>
                    
                    <p className="text-sm font-medium text-slate-300/80 leading-relaxed min-h-[44px]">
                      {plan.desc}
                    </p>
                  </div>

                  <div className={`w-full h-px mb-8 relative ${plan.premium ? 'bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-white/10 to-transparent'}`}></div>

                  {/* List Fitur */}
                  <ul className="space-y-6 mb-12 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-4 text-sm font-bold text-slate-300/90 italic">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                          plan.premium 
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500/20' 
                          : 'bg-white/5 border-white/10 text-indigo-400 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10'
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="mt-0.5">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* TOMBOL DIRECT WHATSAPP (UI ELEGAN) */}
                  <a 
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(plan.waMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full mt-auto group/btn"
                  >
                    <button className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 ${
                      plan.premium 
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:brightness-110 border border-transparent' 
                      : 'bg-white/5 border border-white/10 text-white hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300'
                    }`}>
                      <span>{plan.button}</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                    </button>
                  </a>

                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Trik CSS murni untuk efek harga ganti */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}