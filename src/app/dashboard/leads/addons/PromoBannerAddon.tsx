"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface AddonProps {
  clientId: string;
  addonType: string; // Isikan "promo_banner" saat memanggil
  label: string;     // Isikan "Promo Blast" atau "Flash Sale"
}

export default function PromoBannerAddon({ clientId, addonType, label }: AddonProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  
  // State baru untuk menggantikan alert() yang jelek
  const [showSuccess, setShowSuccess] = useState(false); 
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Load data saat komponen muncul
  useEffect(() => {
    async function loadAddon() {
      if (!clientId || !addonType) return;
      
      const { data, error } = await supabase
        .from("client_addons_data")
        .select("content")
        .eq("client_id", clientId)
        .eq("addon_type", addonType)
        .maybeSingle();
      
      if (data) {
        setContent(data.content || "");
      } else {
        setContent(""); 
      }
    }
    loadAddon();
  }, [clientId, addonType, supabase]);

  // 2. Fungsi Simpan (Tanpa Alert Pop-up)
  const handleSync = async () => {
    if (!clientId) return;

    setLoading(true);
    setErrorMessage("");
    
    const { error } = await supabase.from("client_addons_data").upsert({ 
      client_id: clientId, 
      addon_type: addonType, 
      content: content 
    }, { 
      onConflict: 'client_id,addon_type'
    });
    
    setLoading(false);

    if (error) {
      console.error("Error saving addon:", error.message);
      setErrorMessage("Gagal Sync. Coba lagi.");
      setTimeout(() => setErrorMessage(""), 3000);
    } else {
      // UX Premium: Tombol berubah warna/teks sejenak
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] shadow-xl text-white border-4 border-white/5 h-full transition-all duration-300 hover:shadow-[0_20px_50px_-15px_rgba(79,70,229,0.4)]">
      
      {/* Dekorasi Cahaya di Background */}
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
             <div className="flex items-center gap-2 mb-1">
               <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
               <h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
                 {label} Active
               </h3>
             </div>
             <h4 className="text-xl font-black italic uppercase tracking-tighter leading-tight">
               Current Campaign
             </h4>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl shadow-inner backdrop-blur-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-end">
           <textarea 
             className="w-full h-[180px] bg-black/20 border border-white/10 rounded-[1.8rem] p-6 text-xs font-bold placeholder:text-white/40 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all mb-4 resize-none italic leading-relaxed"
             placeholder="Tulis promo diskon atau pengumuman penting di sini..."
             value={content}
             onChange={(e) => setContent(e.target.value)}
           />

           {errorMessage && (
             <p className="text-[10px] text-red-300 font-bold mb-2 text-center bg-red-900/40 py-1 rounded-lg">{errorMessage}</p>
           )}

           <button 
             onClick={handleSync}
             disabled={loading}
             className={`w-full py-5 rounded-[1.5rem] font-black uppercase italic text-[11px] tracking-widest transition-all shadow-xl active:scale-95 ${
               showSuccess 
                 ? 'bg-green-400 text-green-900 cursor-default shadow-green-400/20' 
                 : 'bg-white text-indigo-700 hover:bg-indigo-50 hover:shadow-[0_10px_25px_rgba(255,255,255,0.2)]'
             }`}
           >
             {loading ? "Deploying..." : showSuccess ? "Campaign Synced!" : `Sync ${label}`}
           </button>
        </div>
      </div>
    </div>
  );
}