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
  return (
    <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <div>
          <h3 className="font-black text-lg tracking-tight text-slate-800">Kontak Darurat</h3>
          <p className="text-[11px] font-medium text-slate-500 mt-1 leading-snug">
            Nomor WhatsApp ini akan otomatis dihubungi oleh AI jika ada pelanggan komplain atau pesanan jumlah besar.
          </p>
        </div>
      </div>
      <div className="space-y-3 mt-5">
        <input
          type="text"
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
          placeholder="Contoh: 081234567890"
          value={adminPhone}
          onChange={(e) => setAdminPhone(e.target.value)}
        />
        <button
          onClick={handleUpdateAdminPhone}
          disabled={isSavingPhone}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSavingPhone ? "Merekam Nomor..." : "Simpan Kontak"}
        </button>
      </div>
    </div>
  );
}