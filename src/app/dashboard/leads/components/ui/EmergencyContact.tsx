"use client";
import React from "react";

interface EmergencyContactProps {
  adminPhone: string;
  setAdminPhone: (phone: string) => void;
  handleUpdateAdminPhone: () => void;
  isSavingPhone: boolean;
}

export default function EmergencyContact({
  adminPhone,
  setAdminPhone,
  handleUpdateAdminPhone,
  isSavingPhone,
}: EmergencyContactProps) {
  
  // Logika format nomor telepon otomatis
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Hanya izinkan ketikan angka dan simbol '+'
    let value = e.target.value.replace(/[^\d+]/g, '');

    // 2. Jika nomor dimulai dengan angka '0', otomatis ubah menjadi '+62'
    if (value.startsWith('0')) {
      value = '+62' + value.slice(1);
    } 
    // 3. Jika pengguna langsung mengetik '62', otomatis tambahkan '+' di depannya
    else if (value.startsWith('62')) {
      value = '+' + value;
    }

    setAdminPhone(value);
  };

  return (
    <div className="relative overflow-hidden bg-[#0a0f1a] border border-white/10 p-8 rounded-[2.5rem] shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)] transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(16,185,129,0.5)] group z-10">
      
      {/* GLOWING ORB BACKGROUND - EMERALD */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-bl-full blur-[80px] pointer-events-none -z-0 transition-transform duration-700 group-hover:scale-125 group-hover:bg-emerald-500/30"></div>

      <div className="relative z-10 flex items-start gap-5 mb-6">
        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-500">
          <svg className="w-7 h-7 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]"></span>
              Active Router
            </span>
          </div>
          <h3 className="font-black text-xl tracking-tight text-white italic drop-shadow-md">
            Kontak <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Darurat</span>
          </h3>
          <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed">
            Nomor WhatsApp ini otomatis dihubungi oleh AI (Gemini Flash) jika ada pelanggan komplain atau pesanan jumlah besar.
          </p>
        </div>
      </div>
      
      <div className="relative z-10 space-y-4 mt-2">
        <div className="relative">
          {/* Globe Icon Inside Input */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <svg className="w-5 h-5 text-emerald-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
          </div>
          <input
            type="tel"
            className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm font-bold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none transition-all duration-300 backdrop-blur-sm shadow-inner"
            placeholder="Contoh: +6281234567890"
            value={adminPhone}
            onChange={handlePhoneChange}
          />
        </div>
        <button
          onClick={handleUpdateAdminPhone}
          disabled={isSavingPhone || adminPhone.length < 10}
          className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 border ${
            isSavingPhone || adminPhone.length < 10
              ? 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-white/10 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:from-emerald-500 hover:to-teal-500'
          }`}
        >
          {isSavingPhone ? (
            <><span className="w-4 h-4 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin"></span> Merekam Nomor...</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Simpan Kontak
            </>
          )}
        </button>
      </div>
    </div>
  );
}