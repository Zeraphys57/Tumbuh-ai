"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface AddonProps {
  clientId: string;
  addonType: string; // "daily_menu"
  label: string;
}

export default function DailyMenuAddon({ clientId, addonType, label }: AddonProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // Pengganti alert()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load data awal
  useEffect(() => {
    async function loadAddon() {
      if (!clientId) return;
      const { data } = await supabase
        .from("client_addons_data")
        .select("content")
        .eq("client_id", clientId)
        .eq("addon_type", addonType)
        .maybeSingle();
      
      if (data) setContent(data.content || "");
    }
    loadAddon();
  }, [clientId, addonType, supabase]);

  const handleSync = async () => {
    if (!clientId) return;
    setLoading(true);
    
    // FIX BUG FATAL: Menambahkan onConflict agar tidak error/duplikat
    const { error } = await supabase.from("client_addons_data").upsert(
      { 
        client_id: clientId, 
        addon_type: addonType, 
        content: content 
      },
      { onConflict: 'client_id,addon_type' }
    );
    
    setLoading(false);
    if (!error) {
       setShowSuccess(true);
       setTimeout(() => setShowSuccess(false), 3000);
    } else {
       console.error("Gagal update menu:", error.message);
    }
  };

  return (
    <div className="bg-amber-50/40 border-2 border-amber-100 p-6 md:p-8 rounded-[2.5rem] shadow-sm transition-all hover:shadow-amber-500/10 hover:border-amber-200 flex flex-col h-full">
      <div className="flex items-center gap-4 mb-5">
        <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-white shadow-inner flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
           <h3 className="font-black uppercase text-sm text-amber-950 tracking-tighter italic leading-none mb-1">{label}</h3>
           <p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-widest">Content Sync Node</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <textarea 
          className="w-full h-[120px] bg-white border border-amber-100 rounded-[1.5rem] p-5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-amber-500/20 transition-all mb-4 resize-none leading-relaxed placeholder:text-amber-900/20"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ketik menu hari ini atau layanan khusus di sini..."
        />
        
        <button 
          onClick={handleSync}
          disabled={loading}
          className={`w-full py-4 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-md active:scale-95 italic ${
             showSuccess
               ? 'bg-amber-100 text-amber-700 shadow-none cursor-default'
               : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {loading ? "Syncing Menu..." : showSuccess ? "Menu Updated!" : `Sync ${label}`}
        </button>
      </div>
    </div>
  );
}